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
import com.google.ai.edge.litertlm.Contents;
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
        t.setPriority(Thread.NORM_PRIORITY);
        return t;
    });
    // Native teardown (cancel/close) runs here, never on the callback or main thread
    private final ExecutorService cleanupExecutor = Executors.newSingleThreadExecutor();
    private volatile boolean aiInitialized = false;
    private int estimatedNativeTokens = 0;
    // Persistent multi-turn conversation and message history
    private volatile Conversation persistentConversation = null;
    private final java.util.List<Message> sessionHistory = new java.util.concurrent.CopyOnWriteArrayList<>();

    // KV Cache Sliding Window Limits
// Replace the two static final threshold constants with:
    private volatile int maxCtx = 2048;
    private volatile int maxTokenThreshold = 1500;
    private volatile int targetTrimTokens = 1000;
    private String activeSystemInstruction = null;
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
        java.util.List<Message> msgs = initialMessages != null ? initialMessages : java.util.Collections.emptyList();
        Contents sysContents = (activeSystemInstruction != null && !activeSystemInstruction.trim().isEmpty())
                ? Contents.Companion.of(activeSystemInstruction)
                : null;
        return new ConversationConfig(
                sysContents,                                   // systemInstruction
                msgs,                                   // initialMessages
                java.util.Collections.emptyList(),      // tools
                null,                                   // samplerConfig
                true,                                   // automaticToolCalling
                null,                                   // channels (null = model default)
                thinkingContext(thinking),              // extraContext
                null,                                   // loraConfig (must stay null!)
                !msgs.isEmpty(),                        // prefillPrefaceOnInit
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
    this.maxCtx = ctx > 0 ? ctx : 2048;
    this.maxTokenThreshold = Math.max(1024, this.maxCtx - 550);
    this.targetTrimTokens = (int) (this.maxCtx * 0.55);


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
    public void askAI(String prompt, String systemInstructions, boolean stream, boolean thinking, int maxTokens, int thinkBudget, StreamCallback callback) {
        if (prompt == null || prompt.trim().isEmpty()) { callback.onError("Prompt is empty"); return; }
        if (!aiInitialized || aiEngine == null) { callback.onError("AI is not initialized"); return; }
        if (!isGenerating.compareAndSet(false, true)) { callback.onError("AI is already processing a request"); return; }

        aiExecutor.execute(() -> {
            final Message userMessage = Message.Companion.user(prompt);

            // ───────── 1. NON-STREAMING (Isolated so it NEVER closes persistentConversation) ─────────
            if (!stream) {
                Conversation tempConv = null;
                try {
                    tempConv = aiEngine.createConversation(
                            makeConfig(thinking, maxTokens, thinkBudget, java.util.Collections.emptyList())
                    );
                    Message response = tempConv.sendMessage(userMessage);
                    callback.onComplete(cleanText(textOf(response)), thoughtOf(response).trim());
                } catch (Throwable e) {
                    callback.onError("AI inference error: " + e.getMessage());
                } finally {
                    closeQuietly(tempConv);
                    isGenerating.set(false);
                }
                return;
            }

            // ───────── 2. STREAMING (Persistent Multi-Turn KV Cache) ─────────
            try {
                if (systemInstructions != null && !systemInstructions.trim().isEmpty()) {
                    activeSystemInstruction = systemInstructions;
                }
                checkAndSlideWindow(thinking, maxTokens, thinkBudget);

                if (persistentConversation == null) {
                    android.util.Log.d("AI_KV_CACHE", "Creating NEW persistentConversation");
                    persistentConversation = aiEngine.createConversation(
                            makeConfig(thinking, maxTokens, thinkBudget, new java.util.ArrayList<>(sessionHistory))
                    );
                    if (activeSystemInstruction != null) {
                        estimatedNativeTokens += estimateTokens(activeSystemInstruction) + 16;
                    }
                }

                if (persistentConversation == null) {
                    android.util.Log.d("AI_KV_CACHE", "Creating NEW persistentConversation");
                    persistentConversation = aiEngine.createConversation(
                            makeConfig(thinking, maxTokens, thinkBudget, new java.util.ArrayList<>(sessionHistory))
                    );
                } else {
                    android.util.Log.d("AI_KV_CACHE", "Reusing EXISTING persistentConversation (KV Cache active)");
                }
            } catch (Throwable t) {
                isGenerating.set(false);
                callback.onError("Failed to setup conversation: " + t.getMessage());
                return;
            }

            final Conversation conversation = persistentConversation;
            activeConversation = conversation;
            sessionHistory.add(userMessage);

            final AtomicBoolean completed = new AtomicBoolean(false);
            final AtomicBoolean timedOutByWatchdog = new AtomicBoolean(false);
            final StringBuilder raw = new StringBuilder();
            final StringBuilder thinkRaw = new StringBuilder();
            final CountDownLatch nativeDone = new CountDownLatch(1);
            final int[] count = {0};
            final Runnable[] watchdog = new Runnable[1];

            final Runnable finish = () -> {
                mainHandler.removeCallbacks(watchdog[0]);
                if (!completed.compareAndSet(false, true)) return;
                android.util.Log.d("AI_STREAM", "FINISH after " + count[0] + " callbacks (watchdog=" + timedOutByWatchdog.get() + ")");

                // ONLY cancelProcess if the 2.5s watchdog timed out!
                // Never call cancelProcess when onDone() fires normally, or LiteRT-LM rolls back the turn's KV cache!
                if (timedOutByWatchdog.get() && nativeDone.getCount() > 0) {
                    cleanupExecutor.execute(() -> {
                        try {
                            conversation.cancelProcess();
                        } catch (Throwable ignored) {}
                    });
                }

                String out = cleanText(raw.toString());
                String thoughtOut = thinkRaw.toString().trim();

                if (!out.isEmpty()) {
                    sessionHistory.add(Message.Companion.model(out));
                }
                estimatedNativeTokens += estimateTokens(prompt) + estimateTokens(thoughtOut) + estimateTokens(out) + 24;

                callback.onComplete(out, thoughtOut);

                activeConversation = null;
                activeFinish = null;
                isGenerating.set(false);
            };

            watchdog[0] = () -> {
                if (!completed.get() && raw.length() > 0) {
                    timedOutByWatchdog.set(true);
                    finish.run();
                }
            };
            activeFinish = finish;

            try {
                conversation.sendMessageAsync(userMessage, new MessageCallback() {
                    @Override
                    public void onMessage(@NonNull Message message) {
                        if (completed.get()) return;

                        String chunk = textOf(message);
                        String thought = thoughtOf(message);
                        count[0]++;

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
                            callback.onToken(clean, raw.toString(), thinkRaw.toString());
                        }
                        // Do NOT call finish.run() here! Let onDone() fire naturally so C++ commits the KV cache.
                    }

                    @Override
                    public void onDone() {
                        android.util.Log.d("AI_STREAM", "Native onDone() fired — KV cache turn committed!");
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
                            if (persistentConversation == conversation) persistentConversation = null;
                            if (activeConversation == conversation) activeConversation = null;
                            activeFinish = null;
                            isGenerating.set(false);
                        });
                    }
                }, thinkingContext(thinking));

            } catch (Throwable e) {
                completed.set(true);
                activeFinish = null;
                callback.onError("AI execution failed: " + e.getMessage());
                cleanupExecutor.execute(() -> {
                    teardown(conversation, null);
                    if (persistentConversation == conversation) persistentConversation = null;
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
        return (int) Math.ceil(text.length() / 3.0);
    }

    private int getTotalHistoryTokens() {
        int total = 0;
        for (Message m : sessionHistory) {
            total += estimateTokens(textOf(m)) + 8; // overhead per turn
        }
        return total;
    }

    private void checkAndSlideWindow(boolean thinking, int maxTokens, int thinkBudget) {
        android.util.Log.d("AI_KV_CACHE", "Estimated native tokens: " + estimatedNativeTokens);

        if (estimatedNativeTokens > maxTokenThreshold) {
            android.util.Log.w("AI_KV_CACHE", "Token limit exceeded (" + estimatedNativeTokens + " > " + maxTokenThreshold + "). Resetting KV cache...");

            while (sessionHistory.size() > 2 && getTotalHistoryTokens() > targetTrimTokens) {
                sessionHistory.remove(0); // drop oldest user turn
                if (sessionHistory.size() > 2) {
                    sessionHistory.remove(0); // drop its paired model reply
                }
            }

            if (persistentConversation != null) {
                try { persistentConversation.close(); } catch (Throwable ignored) {}
                persistentConversation = null;
            }

            try {
                persistentConversation = aiEngine.createConversation(
                        makeConfig(thinking, maxTokens, thinkBudget, new java.util.ArrayList<>(sessionHistory))
                );
                estimatedNativeTokens = getTotalHistoryTokens();
                android.util.Log.d("AI_KV_CACHE", "KV cache refreshed cleanly at " + estimatedNativeTokens + " tokens.");
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
            estimatedNativeTokens = 0;
            sessionHistory.clear();
            android.util.Log.d("AI_KV_CACHE", "Conversation and KV cache reset for new chat.");
        });
    }
}