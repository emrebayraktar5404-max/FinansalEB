package com.finansaleb.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public final class MarketRefreshJobService extends JobService {
    private static final int PERIODIC_JOB_ID = 77801;
    private static final int IMMEDIATE_JOB_ID = 77802;
    private static final long HOUR = 60L * 60L * 1000L;
    private static final double TROY_OUNCE = 31.1034768;
    private volatile boolean cancelled;

    public static void schedulePeriodic(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return;
        JSONObject payload = WidgetUtils.readPayload(context);
        long hours = Math.max(1L, Math.min(24L, payload.optLong("refreshHours", 6L)));
        long interval = hours * HOUR;
        long flex = Math.min(30L * 60L * 1000L, Math.max(5L * 60L * 1000L, interval / 10L));
        JobInfo info = new JobInfo.Builder(PERIODIC_JOB_ID, new ComponentName(context, MarketRefreshJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .setPeriodic(interval, flex)
                .build();
        scheduler.schedule(info);
    }

    public static void scheduleImmediate(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return;
        JobInfo info = new JobInfo.Builder(IMMEDIATE_JOB_ID, new ComponentName(context, MarketRefreshJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setMinimumLatency(0)
                .setOverrideDeadline(5_000)
                .build();
        scheduler.schedule(info);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        cancelled = false;
        new Thread(() -> {
            try { refreshWidgetData(); }
            catch (Exception ignored) { /* Son başarılı widget değeri korunur. */ }
            finally {
                WidgetUtils.updateAllWidgets(this);
                jobFinished(params, false);
            }
        }, "FinansalEB-Refresh").start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        cancelled = true;
        return true;
    }

    private void refreshWidgetData() throws Exception {
        SharedPreferences prefs = getSharedPreferences(WidgetUtils.PREFS_NAME, MODE_PRIVATE);
        String raw = prefs.getString(WidgetUtils.KEY_WIDGET_PAYLOAD, "{}");
        JSONObject payload = new JSONObject(raw == null ? "{}" : raw);
        JSONArray assets = payload.optJSONArray("assets");
        if (assets == null || assets.length() == 0) return;

        String backendUrl = payload.optString("backendUrl", "").trim();
        String backendToken = payload.optString("backendToken", "").trim();
        Map<String, Double> fx = new HashMap<>();
        fx.put("TRY", 1.0);
        JSONObject savedFx = payload.optJSONObject("fx");
        if (savedFx != null) {
            for (java.util.Iterator<String> keys = savedFx.keys(); keys.hasNext();) {
                String code = keys.next().toUpperCase();
                double rate = savedFx.optDouble(code, 0);
                if (rate > 0) fx.put(code, rate);
            }
        }
        JSONArray backgroundAssets = new JSONArray();
        double total = 0;
        double daily = 0;
        int success = 0;

        for (int i = 0; i < assets.length(); i++) {
            if (cancelled) return;
            JSONObject asset = assets.optJSONObject(i);
            if (asset == null) continue;
            String type = asset.optString("type", "").toUpperCase();
            String symbol = asset.optString("symbol", "");
            String sourceSymbol = asset.optString("sourceSymbol", symbol);
            String currency = asset.optString("currency", "TRY").toUpperCase();
            double quantity = asset.optDouble("quantity", 0);
            double oldBaseValue = asset.optDouble("baseValue", quantity * asset.optDouble("price", 0));

            Quote quote = null;
            try {
                quote = fetchAssetQuote(sourceSymbol, type, backendUrl, backendToken);
            } catch (Exception ignored) {
                // Tek varlık hatası tüm widget yenilemesini durdurmaz.
            }

            if (quote != null && quote.price > 0) {
                double rate = getFxRate(currency, backendUrl, backendToken, fx);
                double baseValue = quantity * quote.price * rate;
                total += baseValue;
                double changeFactor = quote.changePct / 100.0;
                daily += changeFactor > -1 ? baseValue - baseValue / (1 + changeFactor) : 0;
                asset.put("price", quote.price);
                asset.put("baseValue", baseValue);
                JSONObject item = new JSONObject();
                item.put("id", asset.optString("id", ""));
                item.put("symbol", symbol);
                item.put("price", quote.price);
                item.put("prevClose", quote.prevClose);
                item.put("changePct", quote.changePct);
                backgroundAssets.put(item);
                success++;
            } else {
                total += oldBaseValue;
                JSONObject item = new JSONObject();
                item.put("id", asset.optString("id", ""));
                item.put("symbol", symbol);
                item.put("price", asset.optDouble("price", 0));
                item.put("prevClose", asset.optDouble("price", 0));
                item.put("changePct", 0);
                backgroundAssets.put(item);
            }
        }

        if (success == 0) return;
        double previousTotal = total - daily;
        String updatedAt = Instant.now().toString();
        payload.put("total", total);
        payload.put("daily", daily);
        payload.put("dailyPct", previousTotal > 0 ? (daily / previousTotal) * 100 : 0);
        payload.put("lastSync", updatedAt);
        payload.put("assets", assets);
        WidgetUtils.savePayload(this, payload);

        JSONObject background = new JSONObject();
        background.put("updatedAt", updatedAt);
        background.put("assets", backgroundAssets);
        JSONObject fxJson = new JSONObject();
        for (Map.Entry<String, Double> entry : fx.entrySet()) fxJson.put(entry.getKey(), entry.getValue());
        background.put("fx", fxJson);
        prefs.edit().putString(WidgetUtils.KEY_BACKGROUND_PRICES, background.toString()).apply();
    }

    private Quote fetchAssetQuote(String sourceSymbol, String type, String backendUrl, String backendToken) throws Exception {
        if (!backendUrl.trim().isEmpty()) {
            try { return backendQuote(backendUrl, backendToken, sourceSymbol, type); }
            catch (Exception ignored) { /* doğrudan kaynağa düş */ }
        }
        if ("TEFAS".equals(type) || "CUSTOM".equals(type) || "CASH".equals(type) || "BOND".equals(type)) return null;
        if ("GOLD".equals(type) || "GRAM_ALTIN".equals(sourceSymbol)) {
            Quote metal = yahooQuote("GC=F");
            Quote tryFx = yahooQuote("TRY=X");
            return compositeMetal(metal, tryFx);
        }
        if ("SILVER".equals(type) || "GRAM_GUMUS".equals(sourceSymbol)) {
            Quote metal = yahooQuote("SI=F");
            Quote tryFx = yahooQuote("TRY=X");
            return compositeMetal(metal, tryFx);
        }
        return yahooQuote(sourceSymbol);
    }

    private double getFxRate(String currency, String backendUrl, String backendToken, Map<String, Double> cache) {
        if ("TRY".equals(currency)) return 1;
        if (cache.containsKey(currency)) return cache.get(currency);
        String symbol = switch (currency) {
            case "USD" -> "TRY=X";
            case "EUR" -> "EURTRY=X";
            case "GBP" -> "GBPTRY=X";
            default -> null;
        };
        if (symbol == null) return 1;
        try {
            Quote quote = !backendUrl.trim().isEmpty()
                    ? backendQuote(backendUrl, backendToken, symbol, "FX")
                    : yahooQuote(symbol);
            cache.put(currency, quote.price);
            return quote.price;
        } catch (Exception ignored) {
            // Uygulamanın son başarılı döviz kuru daha önce payload içine kaydedildi.
            // O da yoksa yanlış bir değer uydurmak yerine 1 kullanılır ve son değer korunur.
            double fallback = cache.getOrDefault(currency, 1.0);
            cache.put(currency, fallback);
            return fallback;
        }
    }

    private Quote backendQuote(String backendUrl, String token, String symbol, String type) throws Exception {
        String separator = backendUrl.contains("?") ? "&" : "?";
        String url = backendUrl + separator
                + "action=quote&symbol=" + enc(symbol)
                + "&type=" + enc(type);
        JSONObject root = requestJson(url, token);
        if (!root.optBoolean("ok", false)) throw new IllegalStateException(root.optString("error", "API hatası"));
        JSONObject data = root.optJSONObject("data");
        if (data == null) throw new IllegalStateException("API verisi yok");
        return new Quote(
                data.optDouble("price", 0),
                data.optDouble("prevClose", data.optDouble("price", 0)),
                data.optDouble("changePct", 0)
        );
    }

    private Quote yahooQuote(String symbol) throws Exception {
        String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + enc(symbol)
                + "?interval=1d&range=5d&events=div%2Csplits";
        JSONObject root = requestJson(url, "");
        JSONArray result = root.optJSONObject("chart") == null ? null
                : root.optJSONObject("chart").optJSONArray("result");
        if (result == null || result.length() == 0) throw new IllegalStateException("Fiyat bulunamadı");
        JSONObject record = result.getJSONObject(0);
        JSONObject meta = record.optJSONObject("meta");
        if (meta == null) throw new IllegalStateException("Fiyat metası yok");
        double price = meta.optDouble("regularMarketPrice", 0);
        double previous = meta.optDouble("chartPreviousClose", meta.optDouble("previousClose", price));
        if (price <= 0) throw new IllegalStateException("Geçersiz fiyat");
        double change = previous > 0 ? ((price - previous) / previous) * 100 : 0;
        return new Quote(price, previous, change);
    }

    private Quote compositeMetal(Quote metal, Quote tryFx) {
        double price = metal.price * tryFx.price / TROY_OUNCE;
        double previous = metal.prevClose * tryFx.prevClose / TROY_OUNCE;
        return new Quote(price, previous, previous > 0 ? ((price - previous) / previous) * 100 : 0);
    }

    private JSONObject requestJson(String urlText, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlText).openConnection();
        connection.setConnectTimeout(8_000);
        connection.setReadTimeout(15_000);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "FinansalEB/0.1 Android Widget");
        if (token != null && !token.trim().isEmpty()) connection.setRequestProperty("X-Api-Token", token.trim());
        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
        } finally {
            connection.disconnect();
        }
        if (code < 200 || code >= 300) throw new IllegalStateException("HTTP " + code);
        return new JSONObject(text.toString());
    }

    private static String enc(String value) {
        try { return URLEncoder.encode(value == null ? "" : value, "UTF-8"); }
        catch (Exception ignored) { return value == null ? "" : value; }
    }

    private static final class Quote {
        final double price;
        final double prevClose;
        final double changePct;
        Quote(double price, double prevClose, double changePct) {
            this.price = price;
            this.prevClose = prevClose;
            this.changePct = changePct;
        }
    }
}
