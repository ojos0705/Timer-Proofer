package com.timerproofer.app;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TimerPipPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /** Enter PiP automatically when Android moves the active timer Activity to background. */
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
