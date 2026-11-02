package app.notefull.com.ondevice_ai;

import android.app.ActivityManager;
import android.content.Context;
import androidx.annotation.NonNull;
import app.notefull.com.ILiteRTRuntime;
import android.os.Handler;
import android.os.Looper;
import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.MessageCallback;
import com.google.ai.edge.litertlm.ThinkingConfig;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

public class LiteRTRuntimeImpl implements ILiteRTRuntime {

    private volatile Engine aiEngine;
    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    // Replace line ~57
    private final ExecutorService aiExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r);
        t.setName("ai-inference");
        t.setPriority(Thread.MIN_PRIORITY);
        return t;
    });
    // Native teardown (cancel/close) runs here, never on the callback or main thread
    private final ExecutorService cleanupExecutor = Executors.newSingleThreadExecutor();
    private volatile boolean aiInitialized = false;
    // Persistent multi-turn conversation and message history
    private volatile Conversation persistentConversation = null;
    private final java.util.List<Message> sessionHistory = new java.util.concurrent.CopyOnWriteArrayList<>();

    // KV Cache Sliding Window Limits
    private static final int MAX_TOKEN_THRESHOLD = 2350;
    private static final int TARGET_TRIM_TOKENS = 1000;
    private final AtomicBoolean isGenerating = new AtomicBoolean(false);
    private volatile Conversation activeConversation = null;
    private volatile Runnable activeFinish = null;

    // Silence after the last token before we assume the reply is over
    private static final long SILENCE_MS = 2500;

    // Real special-token text: <|im_end|>, <|endoftext|>, <end_of_turn>, </s>
    private static final Pattern EOS_PATTERN = Pattern.compile(
            "(?i)<\\|im_end\\|>|<\\|endoftext\\|>|<end_of_turn>|</s>"
    );

    // Required public no-arg / context constructor
    public LiteRTRuntimeImpl(Context context) {
        this.context = context;
    }

    private ConversationConfig makeConfig(boolean thinking, int maxOut, int budget, java.util.List<Message> initialMessages) {
        ThinkingConfig tc = (thinking && budget > 0) ? new ThinkingConfig(true, budget) : null;
        return new ConversationConfig(
                null,                                   // systemInstruction
                initialMessages != null ? initialMessages : java.util.Collections.emptyList(), // <-- Trimmed history goes here!
                java.util.Collections.emptyList(),      // tools
                null,                                   // samplerConfig
                true,                                   // automaticToolCalling
                null,                                   // channels (null = model default)
                thinkingContext(thinking),              // extraContext
                null,                                   // loraConfig
                false,                                  // prefillPrefaceOnInit
                maxOut > 0 ? Integer.valueOf(maxOut) : null,
                tc);
    }

    @Override
    public boolean isInitialized() { return aiInitialized; }

    private String thoughtOf(Message m) {
        try {
            java.util.Map<String, ?> ch = m.getChannels();
            if (ch == null) return "";
            Object t = ch.get("thought");
            return t == null ? "" : t.toString();
        } catch (Throwable e) {
            return "";
        }
    }

    private java.util.Map<String, Object> thinkingContext(boolean thinking) {
        java.util.Map<String, Object> ctx = new java.util.HashMap<>();
        ctx.put("enable_thinking", thinking);   // a real boolean: a "false" string would be truthy in a template
        return ctx;
    }

    @Override
    public boolean isGenerating() { return isGenerating.get(); }

@Override
    public void initAI(String modelPath, String requestedBackend, int ctx, Callback<Boolean> callback) {



        if (modelPath == null || modelPath.trim().isEmpty()) {
            callback.onError("Model path is missing");
            return;
        }

        if (aiInitialized) {
callback.onSuccess(true);
            return;
        }

        aiExecutor.execute(() -> {
            try {
                Backend backend;
                switch (requestedBackend.toLowerCase()) {
                    case "gpu":
                        backend = new Backend.GPU();
                        break;
                    case "cpu":
                    default:
                        backend = new Backend.CPU();
                        break;
                }

                // 1024 sequence length reduces KV-cache memory pressure
                EngineConfig config = new EngineConfig(
                        modelPath,
                        backend,
                        null,
                        null,
                        ctx,
                        null,
                        null
                );

                Engine engine = new Engine(config);
                engine.initialize();
                aiEngine = engine;
                aiInitialized = true;

              callback.onSuccess(true);

            } catch (Throwable e) {
                aiInitialized = false;

                if (aiEngine != null) {
                    try {
                        aiEngine.close();
                    } catch (Throwable ignored) {}
                    aiEngine = null;
                }
                callback.onError("AI initialization failed: " + e.getMessage());
            }
        });
    }

    @Override
    public void stopAI() {
        Runnable f = activeFinish;
        if (f != null) {
            // Resolves the pending askAI with the text so far, then cancels natively off-thread
            f.run();
        } else {
            final Conversation c = activeConversation;
            if (c != null) {
                cleanupExecutor.execute(() -> {
                    try { c.cancelProcess(); } catch (Throwable ignored) {}
                });
            }
        }
        activeConversation = null;
        activeFinish = null;
    }

    // ─────────────────────────────────────────────────────────────
    // INFERENCE PIPELINE
    // ─────────────────────────────────────────────────────────────
    @Override
    public void askAI(String prompt, boolean stream, boolean thinking, int maxTokens, int thinkBudget, StreamCallback callback) {
        if (prompt == null || prompt.trim().isEmpty()) { callback.onError("Prompt is empty"); return; }
        if (!aiInitialized || aiEngine == null) { callback.onError("AI is not initialized"); return; }
        if (!isGenerating.compareAndSet(false, true)) { callback.onError("AI is already processing a request"); return; }

        aiExecutor.execute(() -> {
            try {
                // Check if history is bloated (> 2350 tokens) and slide window if needed
                checkAndSlideWindow(thinking, maxTokens, thinkBudget);

                // Create persistent conversation if it doesn't exist yet
                if (persistentConversation == null) {
                    persistentConversation = aiEngine.createConversation(
                            makeConfig(thinking, maxTokens, thinkBudget, new java.util.ArrayList<>(sessionHistory))
                    );
                }
            } catch (Throwable t) {
                isGenerating.set(false);
                callback.onError("Failed to setup conversation: " + t.getMessage());
                return;
            }

            final Conversation conversation = persistentConversation;
            activeConversation = conversation;
            final Message userMessage = Message.Companion.of(prompt);
            sessionHistory.add(userMessage);

            // ───────── NON-STREAMING ─────────
            if (!stream) {
                try {
                    Message response = conversation.sendMessage(userMessage);
                    callback.onComplete(cleanText(textOf(response)), thoughtOf(response).trim());

                } catch (Throwable e) {
                   callback.onError("AI inference error: " + e.getMessage());
                } finally {
                    try { conversation.close(); } catch (Throwable ignored) {}
                    activeConversation = null;
                    isGenerating.set(false);
                }
                return;
            }

            // ───────── STREAMING ─────────
            final AtomicBoolean completed = new AtomicBoolean(false);
            final StringBuilder raw = new StringBuilder();
            final StringBuilder thinkRaw = new StringBuilder();
            final CountDownLatch nativeDone = new CountDownLatch(1);
            final int[] count = {0};
            final int[] emptyRun = {0};
            final Runnable[] watchdog = new Runnable[1];

            final Runnable finish = () -> {
                mainHandler.removeCallbacks(watchdog[0]);
                if (!completed.compareAndSet(false, true)) return;
                android.util.Log.d("AI_STREAM", "FINISH after " + count[0] + " callbacks");

                String out = cleanText(raw.toString());
                String thoughtOut = thinkRaw.toString().trim();

                // Save assistant reply into our Java session history
                if (!out.isEmpty()) {
                    sessionHistory.add(Message.Companion.of(out));
                }

                callback.onComplete(out, thoughtOut);

                // IMPORTANT: We do NOT close the conversation here anymore!
                // Only reset the flags so the KV cache stays alive for the next turn.
                activeFinish = null;
                isGenerating.set(false);
            };

            watchdog[0] = () -> { if (!completed.get() && raw.length() > 0) finish.run(); };
            activeFinish = finish;

            try {
                conversation.sendMessageAsync(userMessage, new MessageCallback() {
                    @Override
                    public void onMessage(@NonNull Message message) {
                        if (completed.get()) return;

                        String chunk = textOf(message);
                        String thought = thoughtOf(message);
                        count[0]++;
                        android.util.Log.d("AI_STREAM", "#" + count[0] + " text=" + chunk.length()
                                + " thought=" + thought.length() + " [" + chunk.replace("\n", "\\n") + "]");

                        boolean end = EOS_PATTERN.matcher(chunk).find();
                        String clean = EOS_PATTERN.matcher(chunk).replaceAll("");
                        boolean any = false;

                        if (!thought.isEmpty()) { thinkRaw.append(thought); any = true; }
                        if (!clean.isEmpty()) {
                            raw.append(clean);
                            any = true;
                            mainHandler.removeCallbacks(watchdog[0]);
                            mainHandler.postDelayed(watchdog[0], SILENCE_MS);
                        }

                        if (any) {
                            emptyRun[0] = 0;
                           callback.onToken(chunk, raw.toString(), thinkRaw.toString());
                        } else if (raw.length() > 0 && ++emptyRun[0] >= 3) {
                            end = true;
                        }

                        if (end && raw.length() > 0) finish.run();
                    }

                    @Override
                    public void onDone() {
                        nativeDone.countDown();
                        finish.run();
                    }

                    @Override
                    public void onError(@NonNull Throwable error) {
                        nativeDone.countDown();
                        mainHandler.removeCallbacks(watchdog[0]);
                        if (!completed.compareAndSet(false, true)) return;

                        String msg = error.getMessage() != null ? error.getMessage() : "Unknown streaming error";
                        android.util.Log.e("AI_STREAM", "Streaming error: " + msg);

                        callback.onError("AI streaming failed: " + msg);

                        cleanupExecutor.execute(() -> {
                            teardown(conversation, nativeDone);
                            if (activeConversation == conversation) activeConversation = null;
                            activeFinish = null;
                            isGenerating.set(false);
                        });
                    }
                }, thinkingContext(thinking));   // per-message extra context (the old emptyMap)

            } catch (Throwable e) {
                completed.set(true);
                activeFinish = null;
                callback.onError("AI execution failed: " + e.getMessage());
                cleanupExecutor.execute(() -> {
                    teardown(conversation, null);
                    activeConversation = null;
                    isGenerating.set(false);
                });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────
    private String textOf(Message m) {
        if (m == null) return "";
        String s = m.toString();
        return s == null ? "" : s;
    }

    private String cleanText(String s) {
        return EOS_PATTERN.matcher(s).replaceAll("").replace("[DONE]", "").trim();
    }

    // Never call from the model's callback thread or the main thread.
    // Cancel first, wait for the native completion callback, then close.
    private void teardown(Conversation conv, CountDownLatch nativeDone) {
        if (conv == null) return;
        try { conv.cancelProcess(); } catch (Throwable ignored) {}
        if (nativeDone != null) {
            try { nativeDone.await(5, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
        }
        try { conv.close(); } catch (Throwable ignored) {}
    }

    // Only for conversations whose generation has already finished (benchmark)
    private void closeQuietly(Conversation conversation) {
        if (conversation != null) {
            try { conversation.cancelProcess(); } catch (Throwable ignored) {}
            try { conversation.close(); } catch (Throwable ignored) {}
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RELEASE / STATUS / LIFECYCLE
    // ─────────────────────────────────────────────────────────────
    @Override
    public void releaseAI() {
        Runnable f = activeFinish;
        if (f != null) f.run();   // end any running generation first

        // Queued behind any pending teardown on the same single thread
        cleanupExecutor.execute(() -> {
            aiInitialized = false;
            Engine e = aiEngine;
            aiEngine = null;
            if (e != null) {
                try { e.close(); } catch (Throwable ignored) {}
            }

        });
    }





    // ─────────────────────────────────────────────────────────────
    // BENCHMARKING PIPELINE
    // ─────────────────────────────────────────────────────────────
    private void emitBenchmarkProgress(BenchmarkCallback callback, int percent) {
        if (callback != null) {
            callback.onProgress(Math.min(Math.max(percent, 0), 100));
        }
    }

    private int estimateTokens(String text) {
        if (text == null || text.isEmpty()) return 0;
        return (int) Math.ceil(text.length() / 4.0);
    }

    private int getTotalHistoryTokens() {
        int total = 0;
        for (Message m : sessionHistory) {
            total += estimateTokens(textOf(m)) + 8; // overhead per turn
        }
        return total;
    }

    private void checkAndSlideWindow(boolean thinking, int maxTokens, int thinkBudget) {
        int currentTokens = getTotalHistoryTokens();
        android.util.Log.d("AI_KV_CACHE", "Current conversation tokens: " + currentTokens);

        // If we cross the 2350 limit, trim back to 1000 tokens
        if (currentTokens > MAX_TOKEN_THRESHOLD) {
            android.util.Log.w("AI_KV_CACHE", "Token limit exceeded (" + currentTokens + " > " + MAX_TOKEN_THRESHOLD + "). Resetting KV cache...");

            // 1. Remove oldest messages from the front until we are under TARGET_TRIM_TOKENS
            while (sessionHistory.size() > 2 && getTotalHistoryTokens() > TARGET_TRIM_TOKENS) {
                sessionHistory.remove(0); // drops oldest turn
            }

            // 2. Tear down old conversation to dump the bloated KV cache
            if (persistentConversation != null) {
                try {
                    persistentConversation.close();
                } catch (Throwable ignored) {}
                persistentConversation = null;
            }

            // 3. Recreate conversation pre-seeded with our trimmed 1000-token history
            try {
                persistentConversation = aiEngine.createConversation(
                        makeConfig(thinking, maxTokens, thinkBudget, new java.util.ArrayList<>(sessionHistory))
                );
                android.util.Log.d("AI_KV_CACHE", "KV cache refreshed cleanly at " + getTotalHistoryTokens() + " tokens.");
            } catch (Throwable t) {
                android.util.Log.e("AI_KV_CACHE", "Failed to recreate conversation: " + t.getMessage());
            }
        }
    }
    @Override
    public void testAiBackends(String modelPath, BenchmarkCallback callback) {

        if (modelPath == null || modelPath.trim().isEmpty()) {
            callback.onError("Model path is missing");
            return;
        }
        if (aiInitialized || isGenerating.get()) {
            callback.onError("Call releaseAI() first; the main engine is loaded");
            return;
        }

        aiExecutor.execute(() -> {
            org.json.JSONArray results = new org.json.JSONArray();
            String bestBackend = null;
            long bestTimeMs = Long.MAX_VALUE;

            final String[] backends = {"cpu", "gpu"};
            ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);

            emitBenchmarkProgress(callback, 0);

            for (int i = 0; i < backends.length; i++) {
                final String backendName = backends[i];
                final int stepStart = i * 50;
                emitBenchmarkProgress(callback,stepStart + 10);

                ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(memInfo);
                double freeRamGB = memInfo.availMem / (1024.0 * 1024.0 * 1024.0);

                if (backendName.equals("gpu") && (freeRamGB < 1.4 || memInfo.lowMemory)) {
                    try {
                        org.json.JSONObject r = new org.json.JSONObject();
                        r.put("backend", "gpu");
                        r.put("available", false);
                        r.put("timeMs", -1);
                        r.put("error", "Insufficient free RAM for GPU allocation");
                        results.put(r);
                    } catch (Exception ignored) {}
                    emitBenchmarkProgress(callback,stepStart + 50);
                    continue;
                }

                Engine testEngine = null;
                Conversation testConversation = null;
                Runnable ticker = null;

                final CountDownLatch latch = new CountDownLatch(1);
                final long[] firstTokenMs = {-1};
                final Throwable[] failure = {null};
                final int[] tick = {0};

                try {
                    Backend backend = "gpu".equals(backendName) ? new Backend.GPU() : new Backend.CPU();

                    EngineConfig config = new EngineConfig(modelPath, backend, null, null, 512, null, null);
                    testEngine = new Engine(config);
                    testEngine.initialize();
                    testConversation = testEngine.createConversation(new ConversationConfig());

                    emitBenchmarkProgress(callback,stepStart + 35);

                    ticker = new Runnable() {
                        @Override public void run() {
                            if (tick[0] < 14) {
                                tick[0]++;
                                emitBenchmarkProgress(callback,stepStart + 35 + tick[0]);
                                mainHandler.postDelayed(this, 2000);
                            }
                        }
                    };
                    mainHandler.postDelayed(ticker, 2000);

                    final long start = System.currentTimeMillis();

                    testConversation.sendMessageAsync(
                            Message.Companion.of("Say hi /no_think"),
                            new MessageCallback() {
                                @Override public void onMessage(@NonNull Message m) {
                                    if (firstTokenMs[0] < 0) firstTokenMs[0] = System.currentTimeMillis() - start;
                                }
                                @Override public void onDone() { latch.countDown(); }
                                @Override public void onError(@NonNull Throwable t) { failure[0] = t; latch.countDown(); }
                            },
                            java.util.Collections.emptyMap()
                    );

                    boolean finished = latch.await(60, TimeUnit.SECONDS);
                    long elapsed = System.currentTimeMillis() - start;

                    if (!finished) throw new RuntimeException("Timed out after 60s");
                    if (failure[0] != null) throw failure[0];



                    if (elapsed < bestTimeMs) {
                        bestTimeMs = elapsed;
                        bestBackend = backendName;
                    }

                } catch (Throwable e) {
                    try {
                        org.json.JSONObject r = new org.json.JSONObject();
                        r.put("backend", backendName);
                        r.put("available", false);
                        r.put("timeMs", -1);
                        r.put("error", e.getMessage() != null ? e.getMessage() : "Execution failed");
                        results.put(r);
                    } catch (Exception ignored) {}
                } finally {
                    if (ticker != null) mainHandler.removeCallbacks(ticker);
                    closeQuietly(testConversation);
                    if (testEngine != null) {
                        try { testEngine.close(); } catch (Throwable ignored) {}
                    }
                    System.gc();
                    try { Thread.sleep(300); } catch (InterruptedException ignored) {}
                }

                emitBenchmarkProgress(callback,stepStart + 50);
            }

            emitBenchmarkProgress(callback,100);

            try {
                callback.onComplete(bestBackend, bestBackend != null ? bestTimeMs : -1, results.toString());;

            } catch (Exception e) {
                callback.onError("Benchmark error: " + e.getMessage());
            }
        });
    }

    @Override
    public void resetConversation() {
        aiExecutor.execute(() -> {
            if (persistentConversation != null) {
                try {
                    persistentConversation.close();
                } catch (Throwable ignored) {}
                persistentConversation = null;
            }
            sessionHistory.clear();
            android.util.Log.d("AI_KV_CACHE", "Conversation and KV cache reset for new chat.");
        });
    }
}