package app.notefull.com;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class AIDownloadService extends Service {

    public static final String CHANNEL_ID = "notefull-ai-download";
    public static final int NOTIFICATION_ID = 4201;

    public static final String ACTION_PROGRESS = "app.notefull.com.DOWNLOAD_PROGRESS";
    public static final String EXTRA_STAGE = "stage";
    public static final String EXTRA_DOWNLOADED = "downloaded";
    public static final String EXTRA_TOTAL = "total";

    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createChannel();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "AI Model Download",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows progress while the AI model downloads in the background");
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text, int percent) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Notefull: Downloading AI model…")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setOngoing(true)
                .setOnlyAlertOnce(true);

        if (percent >= 0) {
            builder.setProgress(100, percent, false);
        } else {
            builder.setProgress(0, 0, true);
        }
        return builder.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String url = intent.getStringExtra("url");
        String path = intent.getStringExtra("path");

        startForeground(NOTIFICATION_ID, buildNotification("Connecting…", -1));

        new Thread(() -> runDownload(url, path)).start();

        return START_NOT_STICKY;
    }

    private void broadcastProgress(String stage, long downloaded, long total) {
        Intent intent = new Intent(ACTION_PROGRESS);
        intent.setPackage(getPackageName()); // required alongside RECEIVER_NOT_EXPORTED on Android 13+
        intent.putExtra(EXTRA_STAGE, stage);
        intent.putExtra(EXTRA_DOWNLOADED, downloaded);
        intent.putExtra(EXTRA_TOTAL, total);
        sendBroadcast(intent);
    }

    private void runDownload(String urlStr, String destPath) {
        HttpURLConnection connection = null;
        BufferedInputStream input = null;
        FileOutputStream output = null;

        try {
            broadcastProgress("connecting", 0, 0);

            File destFile = new File(destPath);
            File parentDir = destFile.getParentFile();
            if (parentDir != null && !parentDir.exists()) parentDir.mkdirs();

            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.connect();

            long totalSize = connection.getContentLengthLong();
            broadcastProgress("downloading", 0, totalSize);

            input = new BufferedInputStream(connection.getInputStream());
            output = new FileOutputStream(destFile);

            byte[] buffer = new byte[8192];
            long downloaded = 0;
            int bytesRead;
            long lastEmitTime = System.currentTimeMillis();
            long lastNotifyTime = System.currentTimeMillis();

            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
                downloaded += bytesRead;

                long now = System.currentTimeMillis();
                if (now - lastEmitTime >= 150) {
                    broadcastProgress("downloading", downloaded, totalSize);
                    lastEmitTime = now;
                }
                if (now - lastNotifyTime >= 1000) {
                    int percent = totalSize > 0 ? (int) ((downloaded * 100) / totalSize) : -1;
                    String mb = String.format("%.1f MB of %.1f MB",
                            downloaded / 1024.0 / 1024.0, totalSize / 1024.0 / 1024.0);
                    notificationManager.notify(NOTIFICATION_ID, buildNotification(mb, percent));
                    lastNotifyTime = now;
                }
            }

            output.flush();
            broadcastProgress("verifying", downloaded, totalSize);
            notificationManager.notify(NOTIFICATION_ID, buildNotification("Verifying file…", -1));

            long actualFileSize = destFile.length();
            if (totalSize > 0 && actualFileSize != totalSize) {
                broadcastProgress("error", actualFileSize, totalSize);
                notificationManager.notify(NOTIFICATION_ID, buildNotification("Download failed", -1));
                stopSelf();
                return;
            }

            broadcastProgress("done", downloaded, totalSize);
            notificationManager.notify(NOTIFICATION_ID, buildNotification("Download complete", 100));

        } catch (Exception e) {
            broadcastProgress("error", 0, 0);
            notificationManager.notify(NOTIFICATION_ID, buildNotification("Download failed: " + e.getMessage(), -1));
        } finally {
            try { if (output != null) output.close(); } catch (Exception ignored) {}
            try { if (input != null) input.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
            stopForeground(false);
            stopSelf();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}