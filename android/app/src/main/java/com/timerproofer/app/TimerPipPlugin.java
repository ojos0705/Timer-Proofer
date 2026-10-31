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
    private static volatile boolean pipRequestInProgress = false;

    static boolean isProofingTimerActive() { return proofingTimerActive; }

    /** One native entry point shared by Back, the Capacitor bridge and user-leave handling. */
    static synchronized boolean requestSystemPictureInPicture(Activity activity) {
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        if (activity.isInPictureInPictureMode()) return true;
        if (pipRequestInProgress) return false;
        if (!activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return false;

        pipRequestInProgress = true;
        try {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true);
                builder.setSeamlessResizeEnabled(true);
            }
            return activity.enterPictureInPictureMode(builder.build());
        } catch (RuntimeException error) {
            android.util.Log.e("TimerPipPlugin", "Permintaan system PiP gagal", error);
            return false;
        } finally {
            pipRequestInProgress = false;
        }
    }

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
        if (activity.isInPictureInPictureMode()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return; // Auto-enter params handle Android 12+.
        requestSystemPictureInPicture(activity);
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
            boolean alreadyInPip = activity.isInPictureInPictureMode();
            boolean entered = alreadyInPip || requestSystemPictureInPicture(activity);
            if (!entered) {
                call.reject("Android menolak permintaan Picture-in-Picture. Periksa izin PiP aplikasi pada pengaturan perangkat.", "PIP_ENTRY_FAILED");
                return;
            }
            JSObject result = new JSObject();
            result.put("entered", true);
            result.put("alreadyInPictureInPicture", alreadyInPip);
            call.resolve(result);
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
