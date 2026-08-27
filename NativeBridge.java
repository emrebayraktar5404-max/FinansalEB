package com.finansaleb.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

public class NativeBridge {
    private final Activity activity;
    private final WebView webView;

    public NativeBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public void httpRequest(String requestId, String method, String url, String headersJson, String body) {
        new Thread(() -> executeRequest(requestId, method, url, headersJson, body)).start();
    }

    private void executeRequest(String requestId, String method, String target, String headersJson, String body) {
        HttpURLConnection connection = null;
        int status = 0;
        String response = "";
        String error = "";
        try {
            URL url = new URL(target);
            if (!"https".equalsIgnoreCase(url.getProtocol())) throw new SecurityException("Yalnız HTTPS isteklerine izin verilir.");
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(22000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestMethod(method == null ? "GET" : method.toUpperCase());
            connection.setRequestProperty("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.7");
            connection.setRequestProperty("User-Agent", "FinansalEB/0.3.0 Android personal portfolio tracker");
            if (headersJson != null && !headersJson.isEmpty()) {
                JSONObject headers = new JSONObject(headersJson);
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headers.optString(key, "");
                    if (!value.isEmpty()) connection.setRequestProperty(key, value);
                }
            }
            if (!"GET".equalsIgnoreCase(connection.getRequestMethod()) && body != null) {
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream os = connection.getOutputStream()) { os.write(bytes); }
            }
            status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
            response = readLimited(stream, 8 * 1024 * 1024);
            if (status < 200 || status >= 300) error = "Veri kaynağı HTTP " + status + " döndürdü.";
        } catch (Exception ex) {
            error = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
        } finally {
            if (connection != null) connection.disconnect();
        }
        final int finalStatus = status;
        final String finalResponse = response;
        final String finalError = error;
        activity.runOnUiThread(() -> {
            String js = "window.FinansalNativeBridge&&window.FinansalNativeBridge.resolve(" +
                    JSONObject.quote(requestId) + "," + finalStatus + "," + JSONObject.quote(finalResponse) + "," + JSONObject.quote(finalError) + ")";
            webView.evaluateJavascript(js, null);
        });
    }

    private String readLimited(InputStream input, int maxBytes) throws Exception {
        if (input == null) return "";
        try (BufferedInputStream in = new BufferedInputStream(input); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) throw new IllegalStateException("Yanıt güvenlik sınırını aştı.");
                out.write(buffer, 0, read);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @JavascriptInterface
    public void openUrl(String url) {
        activity.runOnUiThread(() -> {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
            catch (Exception e) { Toast.makeText(activity, "Bağlantı açılamadı.", Toast.LENGTH_SHORT).show(); }
        });
    }

    @JavascriptInterface
    public void saveWidgetData(String json) {
        try {
            SharedPreferences prefs = activity.getSharedPreferences("finansaleb_widget", Context.MODE_PRIVATE);
            prefs.edit().putString("summary", json).apply();
            WidgetUpdater.updateAll(activity);
            DividendReminderScheduler.schedule(activity, json);
        } catch (Exception ignored) { }
    }

    @JavascriptInterface
    public void exportText(String fileName, String content) {
        new Thread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FinansalEB");
                    Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("Dosya oluşturulamadı.");
                    try (OutputStream out = activity.getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new IllegalStateException("Dosya açılamadı.");
                        out.write(content.getBytes(StandardCharsets.UTF_8));
                    }
                } else {
                    File dir = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "FinansalEB");
                    if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Klasör oluşturulamadı.");
                    try (FileOutputStream out = new FileOutputStream(new File(dir, fileName))) { out.write(content.getBytes(StandardCharsets.UTF_8)); }
                }
                activity.runOnUiThread(() -> Toast.makeText(activity, "Yedek İndirilenler/FinansalEB klasörüne kaydedildi.", Toast.LENGTH_LONG).show());
            } catch (Exception ex) {
                activity.runOnUiThread(() -> Toast.makeText(activity, "Yedek kaydedilemedi: " + ex.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }
}
