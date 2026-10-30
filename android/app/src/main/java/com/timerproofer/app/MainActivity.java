package com.timerproofer.app;

import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.util.Rational;
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

    /** Legacy Back dispatch on Android 8–12L; Android 13+ uses the dispatcher callback. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (TimerPipPlugin.isProofingTimerActive()) {
            handleActiveTimerBack();
            return;
        }
        super.onBackPressed();
    }

    private void handleActiveTimerBack() {
        Log.i(TAG, "Android Back saat proofing aktif: meminta system PiP.");
        if (!enterTimerPictureInPicture()) {
            // Fallback keeps the Activity in the task background without
            // navigating the WebView or presenting a browser-style prompt.
            Log.w(TAG, "PiP tidak tersedia/ditolak; memindahkan task ke background.");
            moveTaskToBack(true);
        }
    }

    private boolean enterTimerPictureInPicture() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return false;
        }
        if (isInPictureInPictureMode()) {
            return true;
        }
        if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
            return false;
        }

        try {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true);
                builder.setSeamlessResizeEnabled(true);
            }
            return enterPictureInPictureMode(builder.build());
        } catch (RuntimeException error) {
            Log.e(TAG, "Gagal masuk system PiP dari tombol Back.", error);
            return false;
        }
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
