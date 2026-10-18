package app.notefull.com;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;

import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.MessageCallback;
import com.google.ai.edge.litertlm.ThinkingConfig;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    // ─────────────────────────────────────────────────────────────
    // ASSET DOWNLOAD STATE
    // ─────────────────────────────────────────────────────────────
    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    private volatile boolean isDownloading = false;
    private volatile boolean cancelRequested = false;
    private Future<?> downloadFuture = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static final int BUFFER_SIZE = 64 * 1024;
    private static final long PROGRESS_THROTTLE_MS = 250;

    // ─────────────────────────────────────────────────────────────
    // LITERT ENGINE & GENERATION STATE
    // ─────────────────────────────────────────────────────────────
    private volatile Engine aiEngine;
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
    private final AtomicBoolean isGenerating = new AtomicBoolean(false);
    private volatile Conversation activeConversation = null;
    private volatile Runnable activeFinish = null;

    // Silence after the last token before we assume the reply is over
    private static final long SILENCE_MS = 2500;

    // Real special-token text: <|im_end|>, <|endoftext|>, <end_of_turn>, </s>
    private static final Pattern EOS_PATTERN = Pattern.compile(
            "(?i)<\\|im_end\\|>|<\\|endoftext\\|>|<end_of_turn>|</s>"
    );

    // ─────────────────────────────────────────────────────────────
    // DEVICE SPEC CHECKER
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            ret.put("arch", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
            ret.put("cores", Runtime.getRuntime().availableProcessors());
            ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(memInfo);
            double ramGB = memInfo.totalMem / (1024.0 * 1024.0 * 1024.0);
            ret.put("ramGB", Math.round(ramGB * 10.0) / 10.0);
            ret.put("androidVersion", Build.VERSION.RELEASE);
            ret.put("sdkInt", Build.VERSION.SDK_INT);
            ret.put("model", Build.MODEL);
            ret.put("manufacturer", Build.MANUFACTURER);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get device info: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ASSET DOWNLOAD PIPELINE
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void downloadAssets(PluginCall call) {
        String url = call.getString("url");
        String path = call.getString("path");

        if (url == null || url.trim().isEmpty()) {
            call.reject("Download URL is missing");
            return;
        }
        if (path == null || path.trim().isEmpty()) {
            call.reject("Download path is missing");
            return;
        }
        if (isDownloading) {
            call.reject("A download is already in progress");
            return;
        }

        isDownloading = true;
        cancelRequested = false;

        downloadFuture = downloadExecutor.submit(() -> {
            try {
                downloadFile(url, path);
                emitDownloadProgress("complete", new File(path).length(), 0, 0);
            } catch (Exception e) {
                android.util.Log.e("AI_DOWNLOAD", "Download failed", e);
                emitDownloadProgress("error", 0, 0, 0);
            } finally {
                isDownloading = false;
                cancelRequested = false;
                downloadFuture = null;
            }
        });

        call.resolve();
    }

    private void downloadFile(String urlString, String path) throws IOException {
        File destination = new File(path);
        File parent = destination.getParentFile();

        if (parent != null && !parent.exists() && !parent.mkdirs() && !parent.exists()) {
            throw new IOException("Could not create directory: " + parent);
        }

        long existingBytes = destination.exists() ? destination.length() : 0;
        HttpURLConnection connection = null;

        try {
            connection = (HttpURLConnection) new URL(urlString).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", "Notefull");

            if (existingBytes > 0) {
                connection.setRequestProperty("Range", "bytes=" + existingBytes + "-");
            }

            connection.connect();
            int responseCode = connection.getResponseCode();

            boolean append;
            long downloadedBytes;

            if (responseCode == HttpURLConnection.HTTP_PARTIAL) {
                append = true;
                downloadedBytes = existingBytes;
            } else if (responseCode == HttpURLConnection.HTTP_OK) {
                append = false;
                downloadedBytes = 0;
                if (destination.exists()) destination.delete();
            } else {
                throw new IOException("HTTP " + responseCode);
            }

            long contentLength = connection.getContentLengthLong();
            long totalBytes = contentLength >= 0 ? downloadedBytes + contentLength : 0;

            emitDownloadProgress("downloading", downloadedBytes, totalBytes, totalBytes > 0 ? totalBytes - downloadedBytes : 0);

            long lastProgressEmit = System.currentTimeMillis();

            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(destination, append)) {

                byte[] buffer = new byte[BUFFER_SIZE];
                int bytesRead;

                while ((bytesRead = input.read(buffer)) != -1) {
                    if (cancelRequested || Thread.currentThread().isInterrupted()) {
                        return;
                    }

                    output.write(buffer, 0, bytesRead);
                    downloadedBytes += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastProgressEmit >= PROGRESS_THROTTLE_MS) {
                        lastProgressEmit = now;
                        long remainingBytes = totalBytes > 0 ? Math.max(0, totalBytes - downloadedBytes) : 0;
                        emitDownloadProgress("downloading", downloadedBytes, totalBytes, remainingBytes);
                    }
                }
            }
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        if (!isDownloading) {
            call.resolve();
            return;
        }
        cancelRequested = true;
        if (downloadFuture != null) downloadFuture.cancel(true);
        call.resolve();
    }

    private void emitDownloadProgress(String stage, long downloadedBytes, long totalBytes, long remainingBytes) {
        mainHandler.post(() -> {
            JSObject data = new JSObject();
            data.put("stage", stage);
            data.put("downloaded", downloadedBytes);
            data.put("total", totalBytes);
            data.put("remaining", remainingBytes);
            notifyListeners("downloadProgress", data);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // ENGINE INITIALIZATION & RESET
    // ─────────────────────────────────────────────────────────────
// Kotlin exposes message.channels, so Java should see getChannels(); check the Message class if it doesn't compile
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

    private ConversationConfig makeConfig(boolean thinking, int maxOut, int budget) {
        ThinkingConfig tc = (thinking && budget > 0) ? new ThinkingConfig(true, budget) : null;
        return new ConversationConfig(
                null,                                   // systemInstruction
                java.util.Collections.emptyList(),      // initialMessages
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
    @PluginMethod
    public void initAI(PluginCall call) {
        String modelPath = call.getString("modelPath");
        String requestedBackend = call.getString("backend", "cpu");

        if (modelPath == null || modelPath.trim().isEmpty()) {
            call.reject("Model path is missing");
            return;
        }

        if (aiInitialized) {
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("alreadyInitialized", true);
            result.put("backend", requestedBackend);
            call.resolve(result);
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
                final int ctx = call.getInt("ctx", 2048);
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

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("backend", requestedBackend);
                call.resolve(result);

            } catch (Throwable e) {
                aiInitialized = false;

                if (aiEngine != null) {
                    try {
                        aiEngine.close();
                    } catch (Throwable ignored) {}
                    aiEngine = null;
                }
                call.reject("AI initialization failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void resetConversation(PluginCall call) {
        // JS owns history; askAI uses a fresh session per call
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAI(PluginCall call) {
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
        call.resolve();
    }

    // ─────────────────────────────────────────────────────────────
    // INFERENCE PIPELINE
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void askAI(PluginCall call) {
        final String prompt = call.getString("prompt");
        final boolean stream = Boolean.TRUE.equals(call.getBoolean("stream", false));
        final boolean thinking = Boolean.TRUE.equals(call.getBoolean("thinking", false));
        final int maxOut = call.getInt("maxTokens", 0);
        final int budget = call.getInt("thinkBudget", 0);

        if (prompt == null || prompt.trim().isEmpty()) { call.reject("Prompt is empty"); return; }
        if (!aiInitialized || aiEngine == null) { call.reject("AI is not initialized"); return; }
        if (!isGenerating.compareAndSet(false, true)) { call.reject("AI is already processing a request"); return; }

        aiExecutor.execute(() -> {
            final Conversation conversation;
            try {
                conversation = aiEngine.createConversation(makeConfig(thinking, maxOut, budget));
            } catch (Throwable t) {
                isGenerating.set(false);
                call.reject("Failed to create conversation: " + t.getMessage());
                return;
            }
            activeConversation = conversation;
            final Message userMessage = Message.Companion.of(prompt);

            // ───────── NON-STREAMING ─────────
            if (!stream) {
                try {
                    Message response = conversation.sendMessage(userMessage);
                    JSObject result = new JSObject();
                    result.put("response", cleanText(textOf(response)));
                    result.put("thinking", thoughtOf(response).trim());
                    call.resolve(result);
                } catch (Throwable e) {
                    call.reject("AI inference error: " + e.getMessage());
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

                JSObject d = new JSObject();
                d.put("token", "");
                d.put("accumulated", out);
                d.put("accumulatedThought", thoughtOut);
                d.put("done", true);
                notifyListeners("onAiToken", d);

                JSObject result = new JSObject();
                result.put("response", out);
                result.put("thinking", thoughtOut);
                call.resolve(result);

                cleanupExecutor.execute(() -> {
                    teardown(conversation, nativeDone);
                    if (activeConversation == conversation) activeConversation = null;
                    activeFinish = null;
                    isGenerating.set(false);
                });
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
                            JSObject d = new JSObject();
                            d.put("token", clean);
                            d.put("accumulated", raw.toString());
                            d.put("accumulatedThought", thinkRaw.toString());
                            d.put("done", false);
                            notifyListeners("onAiToken", d);
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
                        JSObject e = new JSObject();
                        e.put("error", msg);
                        notifyListeners("onAiError", e);
                        call.reject("AI streaming failed: " + msg);

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
                call.reject("AI execution failed: " + e.getMessage());
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
    @PluginMethod
    public void releaseAI(PluginCall call) {
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
            call.resolve();
        });
    }

    @PluginMethod
    public void getAIStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("initialized", aiInitialized);
        result.put("generating", isGenerating.get());
        result.put("hasConversation", activeConversation != null);
        result.put("finishPending", activeFinish != null);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        aiInitialized = false;
        Runnable f = activeFinish;
        if (f != null) {
            try { f.run(); } catch (Throwable ignored) {}
        }
        Engine e = aiEngine;
        aiEngine = null;
        if (e != null) {
            try { e.close(); } catch (Throwable ignored) {}
        }
        aiExecutor.shutdownNow();
        cleanupExecutor.shutdownNow();
        downloadExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    // ─────────────────────────────────────────────────────────────
    // BENCHMARKING PIPELINE
    // ─────────────────────────────────────────────────────────────
    private void emitBenchmarkProgress(int percent) {
        JSObject data = new JSObject();
        data.put("percent", Math.min(Math.max(percent, 0), 100));
        notifyListeners("benchmarkProgress", data);
    }

    @PluginMethod
    public void testAiBackends(PluginCall call) {
        final String modelPath = call.getString("modelPath");
        if (modelPath == null || modelPath.trim().isEmpty()) {
            call.reject("Model path is missing");
            return;
        }
        if (aiInitialized || isGenerating.get()) {
            call.reject("Call releaseAI() first; the main engine is loaded");
            return;
        }

        aiExecutor.execute(() -> {
            org.json.JSONArray results = new org.json.JSONArray();
            String bestBackend = null;
            long bestTimeMs = Long.MAX_VALUE;

            final String[] backends = {"cpu", "gpu"};
            ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);

            emitBenchmarkProgress(0);

            for (int i = 0; i < backends.length; i++) {
                final String backendName = backends[i];
                final int stepStart = i * 50;
                emitBenchmarkProgress(stepStart + 10);

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
                    emitBenchmarkProgress(stepStart + 50);
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

                    emitBenchmarkProgress(stepStart + 35);

                    ticker = new Runnable() {
                        @Override public void run() {
                            if (tick[0] < 14) {
                                tick[0]++;
                                emitBenchmarkProgress(stepStart + 35 + tick[0]);
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

                    org.json.JSONObject r = new org.json.JSONObject();
                    r.put("backend", backendName);
                    r.put("available", true);
                    r.put("timeMs", elapsed);
                    r.put("firstTokenMs", firstTokenMs[0]);
                    results.put(r);

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

                emitBenchmarkProgress(stepStart + 50);
            }

            emitBenchmarkProgress(100);

            try {
                JSObject response = new JSObject();
                response.put("success", bestBackend != null);
                response.put("bestBackend", bestBackend != null ? bestBackend : "cpu");
                response.put("benchmarkMs", bestBackend != null ? bestTimeMs : -1);
                response.put("results", results.toString());
                call.resolve(response);
            } catch (Exception e) {
                call.reject("Benchmark error: " + e.getMessage());
            }
        });
    }
}