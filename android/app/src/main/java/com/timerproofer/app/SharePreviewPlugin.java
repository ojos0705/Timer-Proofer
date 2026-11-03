package com.timerproofer.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native Android Sharesheet bridge that supplies the URL preview title.
 *
 * Capacitor Share maps `title` to EXTRA_SUBJECT for email clients. Android's
 * Sharesheet uses EXTRA_TITLE for its rich text preview, so this bridge sets
 * both fields and keeps the URL in EXTRA_TEXT.
 */
@CapacitorPlugin(name = "SharePreview")
public class SharePreviewPlugin extends Plugin {

    @PluginMethod
    public void share(PluginCall call) {
        final String title = clean(call.getString("title"));
        final String text = clean(call.getString("text"));
        final String url = clean(call.getString("url"));
        final String dialogTitle = clean(call.getString("dialogTitle"));

        if (TextUtils.isEmpty(text) && TextUtils.isEmpty(url)) {
            call.reject("Konten yang akan dibagikan kosong.", "SHARE_EMPTY_CONTENT");
            return;
        }

        if (!TextUtils.isEmpty(url) && !isHttpUrl(url)) {
            call.reject("Tautan berbagi harus menggunakan HTTP atau HTTPS.", "SHARE_INVALID_URL");
            return;
        }

        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.reject("Activity Android tidak tersedia untuk membuka menu berbagi.", "SHARE_ACTIVITY_UNAVAILABLE");
            return;
        }

        final String shareText = buildShareText(text, url);
        final String previewTitle = TextUtils.isEmpty(title)
            ? "Timer Proofer & Kalkulator HPP"
            : title;
        final String chooserTitle = TextUtils.isEmpty(dialogTitle)
            ? "Bagikan Timer Proofer"
            : dialogTitle;

        activity.runOnUiThread(() -> {
            try {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(Intent.EXTRA_TEXT, shareText);

                // Android Sharesheet reads EXTRA_TITLE for the preview heading.
                // Keep EXTRA_SUBJECT too for email applications that use it.
                sendIntent.putExtra(Intent.EXTRA_TITLE, previewTitle);
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, previewTitle);

                Intent chooser = Intent.createChooser(sendIntent, chooserTitle);
                chooser.addCategory(Intent.CATEGORY_DEFAULT);
                activity.startActivity(chooser);

                JSObject result = new JSObject();
                result.put("launched", true);
                result.put("previewTitle", previewTitle);
                result.put("sharedUrl", !TextUtils.isEmpty(url));
                call.resolve(result);
            } catch (ActivityNotFoundException error) {
                call.reject("Tidak ada aplikasi atau menu berbagi yang tersedia.", "SHARE_TARGET_UNAVAILABLE", error);
            } catch (RuntimeException error) {
                call.reject("Android gagal membuka menu berbagi.", "SHARE_LAUNCH_FAILED", error);
            }
        });
    }

    private static String buildShareText(String text, String url) {
        if (TextUtils.isEmpty(url)) return text;
        if (TextUtils.isEmpty(text)) return url;
        if (text.contains(url)) return text;
        return text + "\n\n" + url;
    }

    private static String clean(String value) {
        return value == null ? null : value.trim();
    }

    private static boolean isHttpUrl(String value) {
        if (TextUtils.isEmpty(value)) return false;
        Uri uri = Uri.parse(value);
        String scheme = uri.getScheme();
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }
}
