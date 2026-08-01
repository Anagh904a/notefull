package app.notefull.com;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    static { System.loadLibrary("llama-android"); }

    public native boolean nativeLoadModel(String path);
    public native String  nativeAsk(String prompt, boolean enableThinking, boolean shortAnswer);
    public native void    nativeDeLoadModel();

    @PluginMethod
    public void loadModel(PluginCall call) {
        String path = call.getString("path");
        if (path == null) { call.reject("path required"); return; }
        executor.execute(() -> {
            try {
                if (nativeLoadModel(path)) { call.resolve(); }
                else { call.reject("Model load failed"); }
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void ask(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null) { call.reject("prompt required"); return; }

        boolean enableThinking = Boolean.TRUE.equals(call.getBoolean("enableThinking", false));
        boolean shortAnswer = Boolean.TRUE.equals(call.getBoolean("shortAnswer", true)); // default true — matches existing search behavior

        JSObject thinking = new JSObject();
        thinking.put("status", "thinking");
        notifyListeners("aiStatus", thinking);

        executor.execute(() -> {
            try {
                String answer = nativeAsk(prompt, enableThinking, shortAnswer);

                JSObject done = new JSObject();
                done.put("status", "done");
                notifyListeners("aiStatus", done);

                JSObject ret = new JSObject();
                ret.put("answer", answer);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void deLoadModel(PluginCall call) {
        executor.execute(() -> {
            try { nativeDeLoadModel(); call.resolve(); }
            catch (Exception e) { call.reject(e.getMessage()); }
        });
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

    private void emitDownloadStage(String stage, long downloaded, long total) {
        JSObject data = new JSObject();
        data.put("stage", stage);
        data.put("downloaded", downloaded);
        data.put("total", total);
        notifyListeners("downloadProgress", data);
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String urlStr = call.getString("url");
        String destPath = call.getString("path");

        if (urlStr == null || destPath == null) {
            call.reject("url and path required");
            return;
        }

        android.content.BroadcastReceiver receiver = new android.content.BroadcastReceiver() {
            @Override
            public void onReceive(android.content.Context context, Intent intent) {
                JSObject data = new JSObject();
                String stage = intent.getStringExtra(AIDownloadService.EXTRA_STAGE);
                data.put("stage", stage);
                data.put("downloaded", intent.getLongExtra(AIDownloadService.EXTRA_DOWNLOADED, 0));
                data.put("total", intent.getLongExtra(AIDownloadService.EXTRA_TOTAL, 0));
                notifyListeners("downloadProgress", data);

                if ("done".equals(stage) || "error".equals(stage)) {
                    getContext().unregisterReceiver(this);
                }
            }
        };

        android.content.IntentFilter filter = new android.content.IntentFilter(AIDownloadService.ACTION_PROGRESS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, android.content.Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }

        Intent serviceIntent = new Intent(getContext(), AIDownloadService.class);
        serviceIntent.putExtra("url", urlStr);
        serviceIntent.putExtra("path", destPath);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        call.resolve();
    }
}