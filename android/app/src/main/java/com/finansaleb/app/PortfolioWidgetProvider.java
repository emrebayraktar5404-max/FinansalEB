package com.finansaleb.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

public final class PortfolioWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) WidgetUtils.updatePortfolioWidget(context, appWidgetManager, id);
        MarketRefreshJobService.schedulePeriodic(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetUtils.ACTION_REFRESH.equals(intent.getAction())) {
            MarketRefreshJobService.scheduleImmediate(context);
            WidgetUtils.updateAllWidgets(context);
        }
    }
}
