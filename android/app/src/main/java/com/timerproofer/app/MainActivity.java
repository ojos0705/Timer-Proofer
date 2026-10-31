package com.timerproofer.app;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/** Native Activity host for Timer Proofer, including system PiP back handling. */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "TimerProoferMain";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TimerPipPlugin.class);
        super.onCreate(savedInstanceState);
        installTimerPictureInPictureBackHandler();
    }

    /**
     * Intercept Android Back at Activity level while proofing is active.
     * This must run before WebView history/back handling so the Activity enters
     * Android system PiP instead of navigating away or showing a web exit prompt.
     */
    private void installTimerPictureInPictureBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (!TimerPipPlugin.isProofingTimerActive()) {
                    // Let Capacitor/WebView handle normal Back when no countdown runs.
                    setEnabled(false);
                    try {
                        getOnBackPressedDispatcher().onBackPressed();
                    } finally {
                        setEnabled(true);
                    }
                    return;
                }

                handleActiveTimerBack();
            }
        });
    }

    private void handleActiveTimerBack() {
        Log.i(TAG, "Android Back saat proofing aktif: meminta system PiP.");
        if (!enterTimerPictureInPicture()) {
            // Fallback keeps the Activity in the task background without
            // navigating the WebView or presenting a browser-style prompt.
            Log.w(TAG, "PiP tidak tersedia/ditolak; memindahkan task ke background.");
            moveTaskToBack(true);
            return;
        }
        // Launch Home after the Activity is pinned. This skips a previously-open
        // PWA/Chrome task behind the APK, so one Back leaves the user on Home with
        // exactly one native PiP window floating above it.
        getWindow().getDecorView().postDelayed(() -> {
            if (!isInPictureInPictureMode()) return;
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(homeIntent);
        }, 180);
    }

    private boolean enterTimerPictureInPicture() {
        return TimerPipPlugin.requestSystemPictureInPicture(this);
    }

    /** Enter PiP automatically when Android Home/app-switch sends Activity away. */
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        TimerPipPlugin.enterFromUserLeaveHint(this);
    }

    /** Keep the WebView's compact timer surface in sync with Android PiP state. */
    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);

        if (getBridge() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        String script = "window.dispatchEvent(new CustomEvent('timerproofer:pipchange', { detail: { isInPictureInPictureMode: "
            + isInPictureInPictureMode + " } }));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
