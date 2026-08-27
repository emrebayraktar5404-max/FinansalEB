package com.finansaleb.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;

public class DividendNotificationReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        NotificationHelper.ensureChannel(context);
        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String title = intent.getStringExtra("title");
        String text = intent.getStringExtra("text");
        Notification.Builder builder = new Notification.Builder(context)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title == null ? "Temettü ödemesi" : title)
                .setContentText(text == null ? "Temettü takviminizi kontrol edin." : text)
                .setContentIntent(pending)
                .setAutoCancel(true)
                .setColor(Color.rgb(79, 224, 193));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) builder.setChannelId(NotificationHelper.CHANNEL_ID);
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
