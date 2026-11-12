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
    public static final String ACTION_STOP_ALARM = "io.workpay.app.STOP_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();

        // 1. Handle user clicking "STOP ALARM" button in the notification
        if (ACTION_STOP_ALARM.equals(action)) {
            AlarmSoundPlayer.stop();
            int notifId = intent.getIntExtra("notifId", 8888);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notifId);
                nm.cancel(8888);
            }
            NativeAlarmPlugin.notifyAlarmDismissed();
            return;
        }

        // 2. Handle phone reboot recovery
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            NativeAlarmPlugin.rescheduleAllOnBoot(context);
            return;
        }

        // 3. Acquire temporary WakeLock to wake the phone display
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        try {
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "WorkPay:AlarmReceiverWakeLock"
                );
                wakeLock.acquire(45000);
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
            title = "⏰ WorkPay Alarm Ringing!";
        }
        if (body == null || body.isEmpty()) {
            body = "Shift or overtime complete! Tap to open WorkPay.";
        }

        int notifId = 8888;
        if (alarmId != null) {
            notifId = Math.abs(alarmId.hashCode() % 100000) + 1000;
        }

        // 4. Start continuous looping audio and vibration immediately!
        AlarmSoundPlayer.play(context);

        // 5. Ensure high-priority Notification Channel exists
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        Uri alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSoundUri == null) {
            alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

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
                channel.setVibrationPattern(new long[]{0, 800, 300, 800, 300});
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

        // 6. Build Intent to open MainActivity
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction(Intent.ACTION_MAIN);
        openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openAppIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        openAppIntent.putExtra("WORKPAY_ALARM_AUTO_OPEN", true);
        openAppIntent.putExtra("alarmId", alarmId);
        openAppIntent.putExtra("title", title);
        openAppIntent.putExtra("body", body);
        openAppIntent.putExtra("type", type);
        openAppIntent.putExtra("employeeId", employeeId);
        openAppIntent.putExtra("employeeName", employeeName);
        openAppIntent.putExtra("overtimeHours", overtimeHours);

        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            context,
            notifId,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 7. Stop Action Intent
        Intent stopIntent = new Intent(context, AlarmReceiver.class);
        stopIntent.setAction(ACTION_STOP_ALARM);
        stopIntent.putExtra("notifId", notifId);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId + 1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 8. Post the visible notification with Action Buttons
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(alarmSoundUri)
            .setVibrate(new long[]{0, 800, 300, 800, 300})
            .setFullScreenIntent(openAppPendingIntent, true)
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "STOP ALARM", stopPendingIntent)
            .addAction(R.mipmap.ic_launcher, "OPEN APP", openAppPendingIntent);

        if (nm != null) {
            nm.notify(notifId, builder.build());
        }

        // 9. Attempt direct activity start (works if device is unlocked or user granted Appear on Top)
        try {
            context.startActivity(openAppIntent);
        } catch (Exception ignored) {}

        // 10. Pass alarm to NativeAlarmPlugin if webview is currently alive
        NativeAlarmPlugin.setPendingAlarm(openAppIntent);

        // 11. If repeating daily alarm (5:30 PM shift end), schedule next iteration 24 hours later
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
