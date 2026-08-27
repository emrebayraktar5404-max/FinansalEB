package com.finansaleb.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class AppBridge {
    private final MainActivity activity;

    AppBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void saveWidgetState(String json) {
        if (json == null || json.trim().isEmpty()) return;
        try {
            JSONObject payload = new JSONObject(json);
            SharedPreferences.Editor editor = activity
                    .getSharedPreferences(WidgetUtils.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit();
            editor.putString(WidgetUtils.KEY_WIDGET_PAYLOAD, payload.toString());
            editor.apply();
            activity.runOnUiThread(() -> {
                WidgetUtils.updateAllWidgets(activity);
                MarketRefreshJobService.schedulePeriodic(activity);
            });
        } catch (Exception ignored) {
            // Hatalı JS verisi widget'ı bozmasın.
        }
    }

    @JavascriptInterface
    public String getBackgroundPrices() {
        return activity.getSharedPreferences(WidgetUtils.PREFS_NAME, Context.MODE_PRIVATE)
                .getString(WidgetUtils.KEY_BACKGROUND_PRICES, "");
    }

    @JavascriptInterface
    public void scheduleNotification(String title, String body, long atMillis, String uniqueId) {
        if (atMillis <= System.currentTimeMillis()) return;
        Intent intent = new Intent(activity, NotificationReceiver.class)
                .putExtra("title", title)
                .putExtra("body", body)
                .putExtra("notification_id", uniqueId == null ? 0 : uniqueId.hashCode());
        int requestCode = uniqueId == null ? (int)(atMillis % Integer.MAX_VALUE) : uniqueId.hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                activity,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarm = (AlarmManager) activity.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent);
    }

    @JavascriptInterface
    public void downloadFile(String filename, String content, String mimeType) {
        activity.runOnUiThread(() -> {
            try {
                String safeName = filename == null ? "FinansalEB-yedek.json"
                        : filename.replaceAll("[^a-zA-Z0-9._çÇğĞıİöÖşŞüÜ-]", "_");
                byte[] bytes = (content == null ? "" : content).getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = activity.getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType == null ? "application/octet-stream" : mimeType);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FinansalEB");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("Dosya konumu oluşturulamadı");
                    try (OutputStream out = resolver.openOutputStream(uri)) {
                        if (out == null) throw new IllegalStateException("Dosya açılamadı");
                        out.write(bytes);
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                } else {
                    File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) throw new IllegalStateException("İndirme klasörü yok");
                    if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Klasör oluşturulamadı");
                    try (FileOutputStream out = new FileOutputStream(new File(dir, safeName))) {
                        out.write(bytes);
                    }
                }
                Toast.makeText(activity, "Yedek İndirilenler/FinansalEB klasörüne kaydedildi", Toast.LENGTH_LONG).show();
            } catch (Exception error) {
                Toast.makeText(activity, "Dosya kaydedilemedi: " + error.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    @JavascriptInterface
    public void haptic() {
        activity.runOnUiThread(() -> activity.getWindow().getDecorView()
                .performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP));
    }
}
