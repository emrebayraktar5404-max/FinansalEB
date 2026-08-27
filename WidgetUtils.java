package com.finansaleb.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class WidgetUtils {
    public static final String PREFS_NAME = "finansaleb_widget";
    public static final String KEY_WIDGET_PAYLOAD = "widget_payload";
    public static final String KEY_BACKGROUND_PRICES = "background_prices";
    public static final String ACTION_REFRESH = "com.finansaleb.app.ACTION_WIDGET_REFRESH";

    private static final Locale TR = Locale.forLanguageTag("tr-TR");
    private static final NumberFormat TRY = NumberFormat.getCurrencyInstance(TR);
    private static final NumberFormat PERCENT = NumberFormat.getNumberInstance(TR);

    private WidgetUtils() {}

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] portfolioIds = manager.getAppWidgetIds(new ComponentName(context, PortfolioWidgetProvider.class));
        for (int id : portfolioIds) updatePortfolioWidget(context, manager, id);
        int[] dividendIds = manager.getAppWidgetIds(new ComponentName(context, DividendWidgetProvider.class));
        for (int id : dividendIds) updateDividendWidget(context, manager, id);
    }

    public static void updatePortfolioWidget(Context context, AppWidgetManager manager, int widgetId) {
        JSONObject payload = readPayload(context);
        boolean privacy = payload.optBoolean("privacy", false);
        double total = payload.optDouble("total", 0);
        double dailyPct = payload.optDouble("dailyPct", 0);
        double annual = payload.optDouble("annualDividend", 0);
        String nextSymbol = payload.optString("nextSymbol", "");
        double nextAmount = payload.optDouble("nextAmount", 0);
        String nextDate = payload.optString("nextDate", "");
        String lastSync = payload.optString("lastSync", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_portfolio);
        views.setTextViewText(R.id.widget_total, privacy ? "••••••" : formatTry(total));
        views.setTextViewText(R.id.widget_change, (dailyPct >= 0 ? "+" : "") + formatPercent(dailyPct) + "% bugün");
        views.setTextColor(R.id.widget_change, Color.parseColor(dailyPct >= 0 ? "#31D6A1" : "#FF667F"));
        views.setTextViewText(R.id.widget_annual_dividend, privacy ? "••••" : formatTry(annual));
        String next = nextSymbol.trim().isEmpty() ? "—" : nextSymbol + " · " + (privacy ? "••••" : formatTry(nextAmount));
        if (!nextDate.trim().isEmpty()) next += " · " + humanDate(nextDate);
        views.setTextViewText(R.id.widget_next, next);
        views.setTextViewText(R.id.widget_updated, lastSync.trim().isEmpty() ? "Henüz yenilenmedi" : "Son veri: " + humanDateTime(lastSync));
        attachClicks(context, views, PortfolioWidgetProvider.class);
        manager.updateAppWidget(widgetId, views);
    }

    public static void updateDividendWidget(Context context, AppWidgetManager manager, int widgetId) {
        JSONObject payload = readPayload(context);
        boolean privacy = payload.optBoolean("privacy", false);
        String symbol = payload.optString("nextSymbol", "");
        double amount = payload.optDouble("nextAmount", 0);
        String date = payload.optString("nextDate", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_dividend);
        views.setTextViewText(R.id.dividend_symbol, symbol.trim().isEmpty() ? "Planlanmış ödeme yok" : symbol);
        views.setTextViewText(R.id.dividend_amount, symbol.trim().isEmpty() ? "—" : privacy ? "••••••" : formatTry(amount));
        views.setTextViewText(R.id.dividend_date, date.trim().isEmpty() ? "Temettü takvimi uygulamada" : humanDate(date));
        attachClicks(context, views, DividendWidgetProvider.class);
        manager.updateAppWidget(widgetId, views);
    }

    private static void attachClicks(Context context, RemoteViews views, Class<?> providerClass) {
        Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                context, providerClass.getName().hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openPending);

        Intent refresh = new Intent(context, providerClass).setAction(ACTION_REFRESH);
        PendingIntent refreshPending = PendingIntent.getBroadcast(
                context, providerClass.getName().hashCode() + 1, refresh,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshPending);
    }

    public static JSONObject readPayload(Context context) {
        String raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_WIDGET_PAYLOAD, "{}");
        try { return new JSONObject(raw == null ? "{}" : raw); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    public static void savePayload(Context context, JSONObject payload) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString(KEY_WIDGET_PAYLOAD, payload.toString()).apply();
    }

    private static String formatTry(double value) {
        synchronized (TRY) { return TRY.format(value); }
    }

    private static String formatPercent(double value) {
        synchronized (PERCENT) {
            PERCENT.setMinimumFractionDigits(2);
            PERCENT.setMaximumFractionDigits(2);
            return PERCENT.format(value);
        }
    }

    private static String humanDate(String iso) {
        try {
            LocalDate date = LocalDate.parse(iso.substring(0, 10));
            return date.format(DateTimeFormatter.ofPattern("d MMM", TR));
        } catch (Exception ignored) { return iso; }
    }

    private static String humanDateTime(String iso) {
        try {
            Instant instant = Instant.parse(iso);
            return DateTimeFormatter.ofPattern("d MMM HH:mm", TR)
                    .withZone(ZoneId.systemDefault()).format(instant);
        } catch (Exception ignored) {
            return iso.length() >= 10 ? humanDate(iso) : iso;
        }
    }
}
