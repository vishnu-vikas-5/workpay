package io.workpay.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_ALARM_TRIGGER = "io.workpay.app.ALARM_TRIGGER";
    public static final String ACTION_STOP_ALARM = "io.workpay.app.STOP_ALARM";
    public static final String ACTION_OPEN_ALARM = "io.workpay.app.OPEN_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();

        // Handle user clicking STOP ALARM in the notification
        if (ACTION_STOP_ALARM.equals(action)) {
            AlarmRingtoneService.stopAlarm(context);
            NativeAlarmPlugin.notifyAlarmDismissed();
            return;
        }

        // Handle phone reboot recovery
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

        // 1. Start continuous looping alarm sound and vibration in Foreground Service
        AlarmRingtoneService.startAlarm(context, intent);

        // 2. Prepare Intent to launch MainActivity in full screen
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

        // 3. Try to pop up the app directly on screen
        try {
            context.startActivity(openAppIntent);
        } catch (Exception ignored) {}

        // 4. Notify plugin if app is already in memory
        NativeAlarmPlugin.setPendingAlarm(openAppIntent);

        // 5. If daily repeating alarm (5:30 PM shift end), schedule the next iteration 24 hours later
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
