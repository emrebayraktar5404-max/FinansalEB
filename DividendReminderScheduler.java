package com.finansaleb.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public final class DividendReminderScheduler {
    private DividendReminderScheduler() {}
    public static void schedule(Context context, String json) {
        try {
            JSONObject obj = new JSONObject(json);
            String dateText = obj.optString("nextPaymentDate", "");
            String symbol = obj.optString("nextSymbol", "");
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, DividendReminderReceiver.class);
            intent.putExtra("symbol", symbol);
            PendingIntent pi = PendingIntent.getBroadcast(context, 7301, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            manager.cancel(pi);
            if (dateText.isEmpty()) return;
            Date date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dateText);
            if (date == null) return;
            Calendar cal = Calendar.getInstance();
            cal.setTime(date); cal.set(Calendar.HOUR_OF_DAY, 9); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0);
            if (cal.getTimeInMillis() <= System.currentTimeMillis()) return;
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
        } catch (Exception ignored) { }
    }
}
