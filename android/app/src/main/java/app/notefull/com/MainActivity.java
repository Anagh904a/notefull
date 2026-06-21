package app.notefull.com;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setOnApplyWindowInsetsListener((view, insets) -> {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                getWindow().getInsetsController().setSystemBarsAppearance(
                        android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                        android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                        android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                );
            }
            return view.onApplyWindowInsets(insets);
        });

        try {
            getWindow().setStatusBarColor(Color.WHITE);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                getWindow().getInsetsController().setSystemBarsAppearance(
                        android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                        android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                        android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

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