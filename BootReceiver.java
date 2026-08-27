package com.finansaleb.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        MarketRefreshJobService.schedulePeriodic(context);
        MarketRefreshJobService.scheduleImmediate(context);
    }
}
