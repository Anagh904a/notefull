package app.notefull.com;

import android.Manifest;
import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@CapacitorPlugin(name = "AIPlugin")
public class AIPlugin extends Plugin {

    // ─────────────────────────────────────────────────────────────
    // UNCHANGED: native bridge + executor
    // ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// DOWNLOAD SYSTEM
// ─────────────────────────────────────────────────────────────

    private final ExecutorService downloadExecutor =
            Executors.newSingleThreadExecutor();

    private volatile boolean isDownloading = false;
    private volatile boolean cancelRequested = false;

    private Future<?> downloadFuture = null;

    private final Handler mainHandler =
            new Handler(Looper.getMainLooper());

    private static final String NOTIF_CHANNEL_ID = "notefull_download";
    private static final int NOTIF_ID = 7001;
    private static final int BUFFER_SIZE = 8 * 1024;


    // ─────────────────────────────────────────────────────────────
    // UNCHANGED: getDeviceInfo
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
    // NEW DOWNLOAD SYSTEM — Custom Threaded Downloader with Auto-Resume
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void downloadAssets(PluginCall call) {

        org.json.JSONArray assets = call.getArray("assets");

        if (assets == null || assets.length() == 0) {
            call.reject("No assets supplied");
            return;
        }

        if (isDownloading) {
            call.reject("A download is already in progress");
            return;
        }

        isDownloading = true;
        cancelRequested = false;

        downloadFuture = downloadExecutor.submit(() -> {
            runAssetDownloads(assets);
        });

        call.resolve();
    }

    private void runAssetDownloads(org.json.JSONArray assets) {

        try {

            int assetCount = assets.length();

            long totalBytes = 0;
            long existingBytes = 0;

            // ---------------------------------------------------------
            // FIRST PASS
            // Work out the total amount of data.
            // Existing partial files count as already downloaded.
            // ---------------------------------------------------------

            for (int i = 0; i < assetCount; i++) {

                org.json.JSONObject asset =
                        assets.getJSONObject(i);

                String path =
                        asset.getString("path");

                long expectedSize =
                        asset.optLong("size", -1);

                File file =
                        new File(path);

                if (file.exists()) {
                    existingBytes += file.length();
                }

                if (expectedSize > 0) {
                    totalBytes += expectedSize;
                }
            }

            emitOverallProgress(
                    "preparing",
                    existingBytes,
                    totalBytes,
                    -1,
                    assetCount,
                    null
            );

            // ---------------------------------------------------------
            // DOWNLOAD EACH FILE
            // ---------------------------------------------------------

            long downloadedBytes = existingBytes;

            for (int i = 0; i < assetCount; i++) {

                if (cancelRequested ||
                        Thread.currentThread().isInterrupted()) {

                    emitOverallProgress(
                            "cancelled",
                            downloadedBytes,
                            totalBytes,
                            i,
                            assetCount,
                            null
                    );

                    return;
                }

                org.json.JSONObject asset =
                        assets.getJSONObject(i);

                String url =
                        asset.getString("url");

                String path =
                        asset.getString("path");

                long expectedSize =
                        asset.optLong("size", -1);

                File destination =
                        new File(path);

                File parent =
                        destination.getParentFile();

                if (parent != null &&
                        !parent.exists()) {

                    if (!parent.mkdirs() &&
                            !parent.exists()) {

                        throw new IOException(
                                "Could not create directory: "
                                        + parent
                        );
                    }
                }

                long startingSize =
                        destination.exists()
                                ? destination.length()
                                : 0;

                emitOverallProgress(
                        "downloading",
                        downloadedBytes,
                        totalBytes,
                        i,
                        assetCount,
                        path
                );

                long finalSize =
                        downloadSingleAsset(
                                url,
                                destination,
                                expectedSize,
                                downloadedBytes,
                                totalBytes,
                                i,
                                assetCount
                        );

                // We only add the bytes newly downloaded by this file.
                downloadedBytes +=
                        Math.max(
                                0,
                                finalSize - startingSize
                        );

                emitOverallProgress(
                        "assetComplete",
                        downloadedBytes,
                        totalBytes,
                        i,
                        assetCount,
                        path
                );
            }

            // ---------------------------------------------------------
            // EVERYTHING FINISHED
            // ---------------------------------------------------------

            emitOverallProgress(
                    "complete",
                    downloadedBytes,
                    totalBytes,
                    assetCount - 1,
                    assetCount,
                    null
            );

        } catch (Exception e) {

            android.util.Log.e(
                    "AI_DOWNLOAD",
                    "Asset download failed",
                    e
            );

            emitOverallProgress(
                    "error",
                    0,
                    0,
                    -1,
                    assets.length(),
                    null
            );

        } finally {

            isDownloading = false;
            cancelRequested = false;
            downloadFuture = null;
        }
    }

    private long downloadSingleAsset(
            String urlString,
            File destination,
            long expectedSize,
            long globalDownloaded,
            long globalTotal,
            int assetIndex,
            int assetCount
    ) throws IOException {

        HttpURLConnection connection = null;

        try {

            long existingSize =
                    destination.exists()
                            ? destination.length()
                            : 0;

            connection =
                    (HttpURLConnection)
                            new URL(urlString)
                                    .openConnection();

            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);

            connection.setInstanceFollowRedirects(true);

            connection.setRequestProperty(
                    "User-Agent",
                    "Notefull"
            );

            // ---------------------------------------------------------
            // REQUEST RESUME
            // ---------------------------------------------------------

            if (existingSize > 0) {

                connection.setRequestProperty(
                        "Range",
                        "bytes=" + existingSize + "-"
                );
            }

            connection.connect();

            int responseCode =
                    connection.getResponseCode();

            boolean append;

            // ---------------------------------------------------------
            // SERVER ACCEPTED RESUME
            // ---------------------------------------------------------

            if (responseCode ==
                    HttpURLConnection.HTTP_PARTIAL) {

                append = true;

                android.util.Log.i(
                        "AI_DOWNLOAD",
                        "Resuming "
                                + destination.getName()
                                + " from "
                                + existingSize
                                + " bytes"
                );

                // ---------------------------------------------------------
                // SERVER IGNORED RANGE
                // ---------------------------------------------------------

            } else if (responseCode ==
                    HttpURLConnection.HTTP_OK) {

                append = false;
                existingSize = 0;

                if (destination.exists()) {
                    destination.delete();
                }

                android.util.Log.i(
                        "AI_DOWNLOAD",
                        "Starting fresh: "
                                + destination.getName()
                );

            } else {

                throw new IOException(
                        "HTTP "
                                + responseCode
                                + " for "
                                + urlString
                );
            }

            long contentLength =
                    connection.getContentLengthLong();

            long assetTotal =
                    contentLength >= 0
                            ? existingSize + contentLength
                            : expectedSize;

            long assetDownloaded =
                    existingSize;

            // ---------------------------------------------------------
            // STREAM
            // ---------------------------------------------------------

            try (
                    InputStream input =
                            connection.getInputStream();

                    FileOutputStream output =
                            new FileOutputStream(
                                    destination,
                                    append
                            )
            ) {

                byte[] buffer =
                        new byte[BUFFER_SIZE];

                int bytesRead;

                long lastProgressTime = 0;

                while ((bytesRead =
                        input.read(buffer)) != -1) {

                    if (cancelRequested ||
                            Thread.currentThread().isInterrupted()) {

                        android.util.Log.i(
                                "AI_DOWNLOAD",
                                "Cancelled: "
                                        + destination.getName()
                        );

                        return destination.length();
                    }

                    output.write(
                            buffer,
                            0,
                            bytesRead
                    );

                    assetDownloaded += bytesRead;

                    long now =
                            System.currentTimeMillis();

                    // Don't spam the WebView with hundreds
                    // of events per second.
                    if (now - lastProgressTime >= 250) {

                        lastProgressTime = now;

                        long newGlobalDownloaded =
                                globalDownloaded
                                        - existingSize
                                        + assetDownloaded;

                        emitOverallProgress(
                                "downloading",
                                newGlobalDownloaded,
                                globalTotal,
                                assetIndex,
                                assetCount,
                                destination.getPath()
                        );
                    }
                }
            }

            // ---------------------------------------------------------
            // BASIC VALIDATION
            // ---------------------------------------------------------

            if (!destination.exists()) {

                throw new IOException(
                        "File does not exist after download: "
                                + destination
                );
            }

            if (!destination.canRead()) {

                throw new IOException(
                        "Downloaded file is not readable: "
                                + destination
                );
            }

            if (destination.length() <= 0) {

                throw new IOException(
                        "Downloaded file is empty: "
                                + destination
                );
            }

            // If we know the expected size, verify it.
            if (expectedSize > 0 &&
                    destination.length() != expectedSize) {

                throw new IOException(
                        "Size mismatch for "
                                + destination.getName()
                                + ". Expected "
                                + expectedSize
                                + " bytes, got "
                                + destination.length()
                );
            }

            android.util.Log.i(
                    "AI_DOWNLOAD",
                    "Completed: "
                            + destination.getAbsolutePath()
                            + " ("
                            + destination.length()
                            + " bytes)"
            );

            return destination.length();

        } finally {

            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {

        if (!isDownloading) {
            call.resolve();
            return;
        }

        cancelRequested = true;

        if (downloadFuture != null) {
            downloadFuture.cancel(true);
        }

        call.resolve();
    }

    @Override
    public void load() {
        super.load();
        createNotificationChannel();
    }


    private void cleanupNotification(NotificationManager nm, boolean canNotify) {
        if (canNotify && nm != null) {
            nm.cancel(NOTIF_ID);
        }
    }

    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Permissions granted automatically on install below Android 13
    }

    private void emitOverallProgress(
            String stage,
            long downloaded,
            long total,
            int assetIndex,
            int assetCount,
            String currentPath
    ) {
        mainHandler.post(() -> {
            JSObject data = new JSObject();

            data.put("stage", stage);
            data.put("downloaded", downloaded);
            data.put("total", total);

            double progress = total > 0
                    ? ((double) downloaded / total) * 100.0
                    : 0.0;

            data.put("progress", progress);

            data.put("assetIndex", assetIndex);
            data.put("assetCount", assetCount);
            data.put("currentPath", currentPath);

            notifyListeners("downloadProgress", data);
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIF_CHANNEL_ID,
                    "AI Model Download",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows progress while downloading the Notefull AI model");
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private String fmtBytes(long b) {
        if (b >= 1024L * 1024 * 1024) return String.format("%.2f GB", b / (1024.0 * 1024 * 1024));
        if (b >= 1024L * 1024)        return String.format("%.1f MB", b / (1024.0 * 1024));
        return String.format("%d KB", b / 1024);
    }
}