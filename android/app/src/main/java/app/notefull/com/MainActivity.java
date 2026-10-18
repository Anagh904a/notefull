package app.notefull.com;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebSettings; // 1. Add this import
import android.webkit.WebView; 
import com.getcapacitor.BridgeActivity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import app.notefull.com.AIPlugin;

public class MainActivity extends BridgeActivity {

@Override
    public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AIPlugin.class);
    super.onCreate(savedInstanceState);

        // --- OVERRIDE WEBVIEW FOR CORAL & CROSS-ORIGIN ACCESS ---
        // Post to the main thread loop to make sure the Capacitor Bridge has initiated the WebView instance
        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                // Allow access to content and file URLs
                settings.setAllowContentAccess(true);
                settings.setAllowFileAccess(true);

                // CRUCIAL: Allow cross-origin requests from local file/https schemes
                settings.setAllowFileAccessFromFileURLs(true);
                settings.setAllowUniversalAccessFromFileURLs(true);

                

                logToWebViewConsole("Native: WebView settings modified to unlock Cross-Origin & File Access.");
            }
        });
    Window window = getWindow();

    WindowCompat.setDecorFitsSystemWindows(window, false);

// Keep both system bars visible and transparent
    window.setStatusBarColor(Color. TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);

// Disable automatic contrast scrims on Android 10+
    if (android.os.Build.VERSION.SDK_INT >=
            android.os.Build.VERSION_CODES.Q) {
        window.setStatusBarContrastEnforced(false);
        window.setNavigationBarContrastEnforced(false);
    }

// Set system bar icon colors
    WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());

    controller.setAppearanceLightStatusBars(false);
    controller.setAppearanceLightNavigationBars(false);

        executeDelayedLifecycleChecks();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleNotificationPreferencesIntent(intent, "Background Resume");
    }

    private void executeDelayedLifecycleChecks() {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                logToWebViewConsole("Native: Bridge runtime confirmed ready.");
                logToWebViewConsole("Native: Status bar forced to Light Mode (Dark Icons)");
                handleNotificationPreferencesIntent(getIntent(), "Cold Boot");
            }
        }, 1500);
    }

    private void handleNotificationPreferencesIntent(Intent intent, String launchType) {
        logToWebViewConsole("Native: Checking intent via " + launchType);

        if (intent != null && Intent.ACTION_MAIN.equals(intent.getAction())) {
            logToWebViewConsole("Native: Intent action matches ACTION_MAIN");

            if (intent.hasCategory("android.intent.category.NOTIFICATION_PREFERENCES")) {
                logToWebViewConsole("Native SUCCESS: Detected NOTIFICATION_PREFERENCES category!");

                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        logToWebViewConsole("Native: Executing JS showSection('notificationSection')");
                        getBridge().getWebView().evaluateJavascript(
                                "if (typeof showSection === 'function') { " +
                                        "    console.log('JS: showSection found, executing...'); " +
                                        "    showSection('notificationSection'); " +
                                        "} else { " +
                                        "    console.error('JS ERROR: showSection is not defined globally'); " +
                                        "}",
                                null
                        );
                    }
                }, 1000);
            } else {
                logToWebViewConsole("Native: Intent does not contain NOTIFICATION_PREFERENCES category.");
            }
        } else {
            logToWebViewConsole("Native: Intent context or action was invalid/absent.");
        }
    }

    private void logToWebViewConsole(String message) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                String safeMessage = message.replace("'", "\\'");
                getBridge().getWebView().evaluateJavascript(
                        "console.log(' [Native Activity] " + safeMessage + "');",
                        null
                );
            });
        }
    }
}