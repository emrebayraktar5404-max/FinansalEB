package com.finansaleb.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;

public final class WidgetUpdater {
    private WidgetUpdater() {}

    public static void updateAll(Context context) {
        updatePortfolio(context);
        updateDividend(context);
    }

    private static JSONObject data(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("finansaleb_widget", Context.MODE_PRIVATE);
            return new JSONObject(prefs.getString("summary", "{}"));
        } catch (Exception e) { return new JSONObject(); }
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void updatePortfolio(Context context) {
        JSONObject d = data(context);
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_portfolio);
        boolean privacy = d.optBoolean("privacyMode", false);
        v.setTextViewText(R.id.widget_total, privacy ? "••••••" : d.optString("totalValue", "₺0,00"));
        v.setTextViewText(R.id.widget_daily, privacy ? "Günlük ••••" : "Günlük " + d.optString("dailyChange", "₺0,00"));
        v.setTextViewText(R.id.widget_cash, privacy ? "Nakit ••••" : "Nakit " + d.optString("cash", "₺0,00"));
        v.setTextViewText(R.id.widget_updated, "Son kayıt: " + d.optString("updatedAt", "Uygulamayı aç"));
        v.setOnClickPendingIntent(R.id.widget_total, openApp(context));
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, PortfolioWidgetProvider.class);
        manager.updateAppWidget(provider, v);
    }

    public static void updateDividend(Context context) {
        JSONObject d = data(context);
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_dividend);
        boolean privacy = d.optBoolean("privacyMode", false);
        v.setTextViewText(R.id.widget_next_dividend, privacy ? "••••••" : d.optString("nextDividend", "Yaklaşan ödeme yok"));
        v.setTextViewText(R.id.widget_year_dividend, privacy ? "Yıllık ••••" : "Yıllık " + d.optString("yearlyDividend", "₺0,00"));
        v.setOnClickPendingIntent(R.id.widget_next_dividend, openApp(context));
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, DividendWidgetProvider.class);
        manager.updateAppWidget(provider, v);
    }
}
