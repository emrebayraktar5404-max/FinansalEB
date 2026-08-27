package com.finansaleb.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

public final class NotificationHelper {
    public static final String CHANNEL_ID = "finansaleb_dividend";
    private NotificationHelper() {}
    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Temettü bildirimleri", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Hak kullanım ve ödeme tarihi bildirimleri");
                manager.createNotificationChannel(channel);
            }
        }
    }
}
