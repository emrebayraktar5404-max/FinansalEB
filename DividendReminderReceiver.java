package com.finansaleb.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

public class DividendReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "finansaleb_dividend";
    @Override public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Temettü hatırlatmaları", NotificationManager.IMPORTANCE_DEFAULT));
        String symbol = intent.getStringExtra("symbol");
        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(context, 7302, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new android.app.Notification.Builder(context, CHANNEL) : new android.app.Notification.Builder(context);
        b.setSmallIcon(R.drawable.ic_app).setContentTitle("Temettü ödeme günü").setContentText((symbol == null || symbol.isEmpty() ? "Portföyündeki" : symbol) + " ödeme kaydını kontrol et.").setContentIntent(pi).setAutoCancel(true);
        nm.notify(7303, b.build());
    }
}
