package app.notefull.com;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;



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
import com.google.android.play.core.splitcompat.SplitCompat;
import com.google.android.play.core.splitinstall.SplitInstallManager;
import com.google.android.play.core.splitinstall.SplitInstallManagerFactory;
import com.google.android.play.core.splitinstall.SplitInstallRequest;
import com.google.android.play.core.splitinstall.SplitInstallStateUpdatedListener;
import com.google.android.play.core.splitinstall.model.SplitInstallSessionStatus;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    // 2. MEMBER VARIABLES GO HERE (Inside the class)
    private SplitInstallManager splitInstallManager;
    private static final String AI_MODULE_NAME = "ondevice_ai";
    private ILiteRTRuntime runtimeInstance = null;
    // Your existing variables (downloadExecutor, aiEngine, etc.) ...

    // 3. LIFECYCLE METHOD (Inside the class)
    @Override
    public void load() {
        super.load();
        splitInstallManager = SplitInstallManagerFactory.create(getContext());
    }

    // 4. PLUGIN METHODS GO HERE (Inside the class)
    @PluginMethod
    public void isAIModuleInstalled(PluginCall call) {
        boolean installed = splitInstallManager.getInstalledModules().contains(AI_MODULE_NAME);
        JSObject ret = new JSObject();
        ret.put("installed", installed);
        call.resolve(ret);
    }

    @PluginMethod
    public void installAIModule(PluginCall call) {
        if (splitInstallManager.getInstalledModules().contains(AI_MODULE_NAME)) {
            JSObject ret = new JSObject();
            ret.put("status", "already_installed");
            call.resolve(ret);
            return;
        }

        SplitInstallRequest request = SplitInstallRequest.newBuilder()
                .addModule(AI_MODULE_NAME)
                .build();

        SplitInstallStateUpdatedListener listener = new SplitInstallStateUpdatedListener() {
            @Override
            public void onStateUpdate(com.google.android.play.core.splitinstall.SplitInstallSessionState state) {
                JSObject progress = new JSObject();
                long total = state.totalBytesToDownload();
                long current = state.bytesDownloaded();

                switch (state.status()) {
                    case SplitInstallSessionStatus.DOWNLOADING:
                        progress.put("status", "downloading");
                        progress.put("downloaded", current);
                        progress.put("total", total);
                        notifyListeners("moduleDownloadProgress", progress);
                        break;

                    case SplitInstallSessionStatus.INSTALLING:
                        progress.put("status", "installing");
                        notifyListeners("moduleDownloadProgress", progress);
                        break;

                    case SplitInstallSessionStatus.INSTALLED:
                        SplitCompat.install(getContext());
                        progress.put("status", "installed");
                        notifyListeners("moduleDownloadProgress", progress);
                        splitInstallManager.unregisterListener(this);
                        break;

                    case SplitInstallSessionStatus.FAILED:
                        progress.put("status", "failed");
                        progress.put("errorCode", state.errorCode());
                        notifyListeners("moduleDownloadProgress", progress);
                        splitInstallManager.unregisterListener(this);
                        break;
                }
            }
        };

        splitInstallManager.registerListener(listener);
        splitInstallManager.startInstall(request)
                .addOnFailureListener(e -> {
                    call.reject("Play Feature Delivery request failed: " + e.getMessage());
                });

        call.resolve();
    }

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
    // RUNTIME REFLECTION LOADER
    // ─────────────────────────────────────────────────────────────


    private synchronized ILiteRTRuntime getOrLoadRuntime() throws Exception {
        if (runtimeInstance != null) return runtimeInstance;

        if (!splitInstallManager.getInstalledModules().contains(AI_MODULE_NAME)) {
            throw new IllegalStateException("AI module is not installed yet.");
        }

        SplitCompat.install(getContext());

        Class<?> clazz = Class.forName("app.notefull.com.ondevice_ai.LiteRTRuntimeImpl");
        java.lang.reflect.Constructor<?> constructor = clazz.getConstructor(Context.class);
        runtimeInstance = (ILiteRTRuntime) constructor.newInstance(getContext());
        return runtimeInstance;
    }

    // ─────────────────────────────────────────────────────────────
    // AI PLUGIN BRIDGES
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void initAI(PluginCall call) {
        String modelPath = call.getString("modelPath");
        String requestedBackend = call.getString("backend", "cpu");
        int ctx = call.getInt("ctx", 2048);

        try {
            ILiteRTRuntime runtime = getOrLoadRuntime();
            runtime.initAI(modelPath, requestedBackend, ctx, new ILiteRTRuntime.Callback<Boolean>() {
                @Override
                public void onSuccess(Boolean result) {
                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("backend", requestedBackend);
                    call.resolve(res);
                }

                @Override
                public void onError(String error) {
                    call.reject("AI initialization failed: " + error);
                }
            });
        } catch (Exception e) {
            call.reject("Failed to initialize AI module: " + e.getMessage());
        }
    }

    @PluginMethod
    public void askAI(PluginCall call) {
        final String prompt = call.getString("prompt");
        final boolean stream = Boolean.TRUE.equals(call.getBoolean("stream", false));
        final boolean thinking = Boolean.TRUE.equals(call.getBoolean("thinking", false));
        final int maxOut = call.getInt("maxTokens", 0);
        final int budget = call.getInt("thinkBudget", 0);

        try {
            ILiteRTRuntime runtime = getOrLoadRuntime();
            runtime.askAI(prompt, stream, thinking, maxOut, budget, new ILiteRTRuntime.StreamCallback() {
                @Override
                public void onToken(String token, String fullText, String thought) {
                    mainHandler.post(() -> {
                        JSObject d = new JSObject();
                        d.put("token", token);
                        d.put("accumulated", fullText);
                        d.put("accumulatedThought", thought);
                        d.put("done", false);
                        notifyListeners("onAiToken", d);
                    });
                }

                @Override
                public void onComplete(String response, String thinkingText) {
                    mainHandler.post(() -> {
                        if (stream) {
                            JSObject d = new JSObject();
                            d.put("token", "");
                            d.put("accumulated", response);
                            d.put("accumulatedThought", thinkingText);
                            d.put("done", true);
                            notifyListeners("onAiToken", d);
                        }
                        JSObject result = new JSObject();
                        result.put("response", response);
                        result.put("thinking", thinkingText);
                        call.resolve(result);
                    });
                }

                @Override
                public void onError(String error) {
                    mainHandler.post(() -> {
                        JSObject e = new JSObject();
                        e.put("error", error);
                        notifyListeners("onAiError", e);
                        call.reject("AI inference failed: " + error);
                    });
                }
            });
        } catch (Exception e) {
            call.reject("Failed to run AI: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAI(PluginCall call) {
        try {
            if (runtimeInstance != null) {
                runtimeInstance.stopAI();
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void releaseAI(PluginCall call) {
        try {
            if (runtimeInstance != null) {
                runtimeInstance.releaseAI();
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void resetConversation(PluginCall call) {
        try {
            if (runtimeInstance != null) {
                runtimeInstance.resetConversation();
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void getAIStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean init = runtimeInstance != null && runtimeInstance.isInitialized();
        boolean gen = runtimeInstance != null && runtimeInstance.isGenerating();
        result.put("initialized", init);
        result.put("generating", gen);
        call.resolve(result);
    }

    @PluginMethod
    public void testAiBackends(PluginCall call) {
        final String modelPath = call.getString("modelPath");
        try {
            ILiteRTRuntime runtime = getOrLoadRuntime();
            runtime.testAiBackends(modelPath, new ILiteRTRuntime.BenchmarkCallback() {
                @Override
                public void onProgress(int percent) {
                    mainHandler.post(() -> {
                        JSObject data = new JSObject();
                        data.put("percent", percent);
                        notifyListeners("benchmarkProgress", data);
                    });
                }

                @Override
                public void onComplete(String bestBackend, long bestTimeMs, String rawResultsJson) {
                    mainHandler.post(() -> {
                        JSObject response = new JSObject();
                        response.put("success", bestBackend != null);
                        response.put("bestBackend", bestBackend != null ? bestBackend : "cpu");
                        response.put("benchmarkMs", bestBackend != null ? bestTimeMs : -1);
                        response.put("results", rawResultsJson);
                        call.resolve(response);
                    });
                }

                @Override
                public void onError(String error) {
                    mainHandler.post(() -> call.reject("Benchmark error: " + error));
                }
            });
        } catch (Exception e) {
            call.reject("Failed to run benchmark: " + e.getMessage());
        }
    }
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


    @Override
    protected void handleOnDestroy() {
        downloadExecutor.shutdownNow();
        super.handleOnDestroy();
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




}