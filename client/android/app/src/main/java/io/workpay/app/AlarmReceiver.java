package io.workpay.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "workpay_alarm_channel";
    public static final String ACTION_ALARM_TRIGGER = "io.workpay.app.ALARM_TRIGGER";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            NativeAlarmPlugin.rescheduleAllOnBoot(context);
            return;
        }

        // Acquire WakeLock to turn on screen and prevent sleeping during alarm trigger
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        try {
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "WorkPay:AlarmWakeLock"
                );
                wakeLock.acquire(45000); // Hold for 45s
            }
        } catch (Exception ignored) {}

        String alarmId = intent.getStringExtra("alarmId");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String type = intent.getStringExtra("type");
        String employeeId = intent.getStringExtra("employeeId");
        String employeeName = intent.getStringExtra("employeeName");
        double overtimeHours = intent.getDoubleExtra("overtimeHours", 0.0);
        boolean repeatsDaily = intent.getBooleanExtra("repeatsDaily", false);

        if (title == null || title.isEmpty()) {
            title = "⏰ WorkPay Alarm";
        }
        if (body == null || body.isEmpty()) {
            body = "Alarm trigger! Open WorkPay to record shifts and overtime.";
        }

        int notifId = 1001;
        if (alarmId != null) {
            notifId = Math.abs(alarmId.hashCode() % 100000) + 1000;
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        Uri alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSoundUri == null) {
            alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        // Configure high priority Alarm Notification Channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
            if (channel == null) {
                channel = new NotificationChannel(
                    CHANNEL_ID,
                    "WorkPay Shift & Overtime Alarms",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Critical alarm alerts for shift completion and overtime tracking");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 600, 200, 600, 200, 1000});
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
                channel.setSound(alarmSoundUri, audioAttributes);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);
                nm.createNotificationChannel(channel);
            }
        }

        // Intent to launch MainActivity in full screen
        Intent fullScreenIntent = new Intent(context, MainActivity.class);
        fullScreenIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        fullScreenIntent.putExtra("WORKPAY_ALARM_AUTO_OPEN", true);
        fullScreenIntent.putExtra("alarmId", alarmId);
        fullScreenIntent.putExtra("title", title);
        fullScreenIntent.putExtra("body", body);
        fullScreenIntent.putExtra("type", type);
        fullScreenIntent.putExtra("employeeId", employeeId);
        fullScreenIntent.putExtra("employeeName", employeeName);
        fullScreenIntent.putExtra("overtimeHours", overtimeHours);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            notifId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(alarmSoundUri)
            .setVibrate(new long[]{0, 600, 200, 600, 200, 1000})
            .setFullScreenIntent(fullScreenPendingIntent, true) // Launches full screen over lockscreen / background
            .setContentIntent(fullScreenPendingIntent)
            .setAutoCancel(true);

        if (nm != null) {
            nm.notify(notifId, builder.build());
        }

        // Try direct activity start to immediately display app on screen
        try {
            context.startActivity(fullScreenIntent);
        } catch (Exception ignored) {}

        // Notify running instance if app is already open
        NativeAlarmPlugin.setPendingAlarm(fullScreenIntent);

        // If daily repeating alarm, schedule the next iteration 24 hours later
        if (repeatsDaily && alarmId != null) {
            long nextDayMs = System.currentTimeMillis() + (24L * 60L * 60L * 1000L);
            NativeAlarmPlugin.scheduleAlarmExact(
                context,
                alarmId,
                nextDayMs,
                title,
                body,
                type,
                employeeId,
                employeeName,
                overtimeHours,
                true
            );
        }
    }
}
