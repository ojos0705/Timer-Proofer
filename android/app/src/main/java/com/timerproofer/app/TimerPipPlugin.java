package com.timerproofer.app;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Rational;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Native Android Picture-in-Picture bridge for an active proofing countdown. */
@CapacitorPlugin(name = "TimerPip")
public class TimerPipPlugin extends Plugin {

    private static volatile boolean proofingTimerActive = false;

    static boolean isProofingTimerActive() { return proofingTimerActive; }

    static void prepareAutoEnter(Activity activity, boolean active) {
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(active);
                builder.setSeamlessResizeEnabled(true);
            }
            activity.setPictureInPictureParams(builder.build());
        } catch (Exception error) {
            android.util.Log.w("TimerPipPlugin", "Gagal menyiapkan auto-enter PiP", error);
        }
    }

    static void enterFromUserLeaveHint(Activity activity) {
        if (!proofingTimerActive || activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return; // Auto-enter params handle Android 12+.
        try {
            activity.enterPictureInPictureMode(new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9)).build());
        } catch (Exception error) {
            android.util.Log.w("TimerPipPlugin", "PiP dari user-leave hint gagal", error);
        }
    }

    @PluginMethod
    public void enterPictureInPicture(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Picture-in-Picture memerlukan Android 8.0 (API 26) atau lebih baru.", "PIP_UNSUPPORTED");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity Android tidak tersedia.", "ACTIVITY_UNAVAILABLE");
            return;
        }

        PackageManager packageManager = activity.getPackageManager();
        if (!packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
            call.reject("Perangkat ini tidak mendukung Picture-in-Picture.", "PIP_UNSUPPORTED");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                if (activity.isInPictureInPictureMode()) {
                    JSObject result = new JSObject();
                    result.put("entered", true);
                    result.put("alreadyInPictureInPicture", true);
                    call.resolve(result);
                    return;
                }

                PictureInPictureParams.Builder paramsBuilder = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    paramsBuilder.setAutoEnterEnabled(true);
                    paramsBuilder.setSeamlessResizeEnabled(true);
                }
                PictureInPictureParams params = paramsBuilder.build();
                boolean entered = activity.enterPictureInPictureMode(params);
                if (!entered) {
                    call.reject("Android menolak permintaan Picture-in-Picture. Periksa izin PiP aplikasi pada pengaturan perangkat.", "PIP_ENTRY_FAILED");
                    return;
                }

                JSObject result = new JSObject();
                result.put("entered", true);
                result.put("alreadyInPictureInPicture", false);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Gagal mengaktifkan Picture-in-Picture: " + error.getMessage(), "PIP_ENTRY_FAILED", error);
            }
        });
    }

    @PluginMethod
    public void setTimerActive(PluginCall call) {
        boolean active = call.getBoolean("active", false);
        proofingTimerActive = active;
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> prepareAutoEnter(activity, active));
        }
        JSObject result = new JSObject();
        result.put("active", active);
        call.resolve(result);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Activity activity = getActivity();
        JSObject result = new JSObject();
        boolean isInPictureInPicture = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && activity != null
            && activity.isInPictureInPictureMode();
        result.put("isInPictureInPicture", isInPictureInPicture);
        call.resolve(result);
    }
}
