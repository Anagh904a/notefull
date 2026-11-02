package app.notefull.com;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import app.notefull.com.AIPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AIPlugin.class);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Apply transparent bars cleanly without deprecation warnings
        setTransparentSystemBars(window);

        // Disable automatic contrast scrims on Android 10+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // Set initial status & navigation bar icon colors from OS theme
        applySystemBarIcons(isSystemInDarkMode());

        // Configure WebView & attach NativeTheme bridge
        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                settings.setAllowContentAccess(true);
                settings.setAllowFileAccess(true);
                settings.setAllowFileAccessFromFileURLs(true);
                settings.setAllowUniversalAccessFromFileURLs(true);

                // Expose NativeTheme to JavaScript
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public boolean isSystemDark() {
                        return isSystemInDarkMode();
                    }

                    @JavascriptInterface
                    public void setSystemBarIcons(boolean darkThemeActive) {
                        runOnUiThread(() -> applySystemBarIcons(darkThemeActive));
                    }
                }, "NativeTheme");

                // Sync theme immediately once WebView is ready
                boolean isDark = isSystemInDarkMode();
                webView.evaluateJavascript(
                        "if (window.syncSystemTheme) { window.syncSystemTheme(" + isDark + "); }",
                        null
                );

                logToWebViewConsole("Native: WebView settings and NativeTheme bridge initialized.");
            }
        });

        executeDelayedLifecycleChecks();
    }

    @SuppressWarnings("deprecation")
    private void setTransparentSystemBars(Window window) {
        // Android 15 (API 35) and above handle transparency automatically via setDecorFitsSystemWindows
        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
    }

    private boolean isSystemInDarkMode() {
        int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }

    private void applySystemBarIcons(boolean isDarkTheme) {
        Window window = getWindow();
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());

        if (controller != null) {
            // true = Dark icons (for Light/White theme)
            // false = White icons (for Dark theme)
            controller.setAppearanceLightStatusBars(!isDarkTheme);
            controller.setAppearanceLightNavigationBars(!isDarkTheme);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        boolean isDark = (newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applySystemBarIcons(isDark);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                    "if (window.syncSystemTheme) { window.syncSystemTheme(" + isDark + "); }",
                    null
            );
        }
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
                handleNotificationPreferencesIntent(getIntent(), "Cold Boot");
            }
        }, 1500);
    }

    private void handleNotificationPreferencesIntent(Intent intent, String launchType) {
        logToWebViewConsole("Native: Checking intent via " + launchType);

        if (intent != null && Intent.ACTION_MAIN.equals(intent.getAction())) {
            if (intent.hasCategory("android.intent.category.NOTIFICATION_PREFERENCES")) {
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                                "if (typeof showSection === 'function') { showSection('notificationSection'); }",
                                null
                        );
                    }
                }, 1000);
            }
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