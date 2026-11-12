package io.workpay.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class AlarmRingtoneService extends Service {
    public static final String CHANNEL_ID = "workpay_alarm_channel";
    public static final int NOTIFICATION_ID = 8888;
    public static final String ACTION_START = "io.workpay.app.START_ALARM";
    public static final String ACTION_STOP = "io.workpay.app.STOP_ALARM";

    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;
    private PowerManager.WakeLock wakeLock = null;
    private static boolean isAlarmActive = false;

    public static boolean isRinging() {
        return isAlarmActive;
    }

    public static void startAlarm(Context context, Intent alarmData) {
        Intent serviceIntent = new Intent(context, AlarmRingtoneService.class);
        serviceIntent.setAction(ACTION_START);
        if (alarmData != null) {
            serviceIntent.putExtras(alarmData);
        }
        try {
            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void stopAlarm(Context context) {
        Intent serviceIntent = new Intent(context, AlarmRingtoneService.class);
        serviceIntent.setAction(ACTION_STOP);
        try {
            context.stopService(serviceIntent);
        } catch (Exception ignored) {}
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "WorkPay:AlarmRingtoneWakeLock"
                );
                wakeLock.acquire(10 * 60 * 1000L); // Hold for up to 10 minutes while ringing
            } catch (Exception ignored) {}
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForegroundAndRingtone();
            stopSelf();
            return START_NOT_STICKY;
        }

        isAlarmActive = true;
        startForegroundWithNotification(intent);
        startRingtoneAndVibration();
        attemptOpenMainActivity(intent);

        return START_NOT_STICKY;
    }

    private void startForegroundWithNotification(Intent intent) {
        String title = intent != null ? intent.getStringExtra("title") : null;
        String body = intent != null ? intent.getStringExtra("body") : null;
        String alarmId = intent != null ? intent.getStringExtra("alarmId") : null;
        String type = intent != null ? intent.getStringExtra("type") : null;
        String employeeId = intent != null ? intent.getStringExtra("employeeId") : null;
        String employeeName = intent != null ? intent.getStringExtra("employeeName") : null;
        double overtimeHours = intent != null ? intent.getDoubleExtra("overtimeHours", 0.0) : 0.0;

        if (title == null || title.isEmpty()) {
            title = "⏰ WorkPay Alarm Ringing!";
        }
        if (body == null || body.isEmpty()) {
            body = "Shift or overtime complete! Tap to open WorkPay.";
        }

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
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
                channel.setVibrationPattern(new long[]{0, 600, 300, 600, 300});
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);
                nm.createNotificationChannel(channel);
            }
        }

        // Main action: Launch MainActivity directly
        Intent openAppIntent = new Intent(this, MainActivity.class);
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
            this,
            NOTIFICATION_ID,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Stop Action: Stop the alarm ringing from the notification
        Intent stopIntent = new Intent(this, AlarmReceiver.class);
        stopIntent.setAction(AlarmReceiver.ACTION_STOP_ALARM);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            this,
            NOTIFICATION_ID + 1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(openAppPendingIntent, true)
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "STOP ALARM", stopPendingIntent)
            .addAction(R.mipmap.ic_launcher, "OPEN APP", openAppPendingIntent)
            .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void startRingtoneAndVibration() {
        try {
            // Find system alarm sound
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alertUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setLooping(true); // Loop continuously until user stops it
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 700, 300, 700, 300};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = repeat continuously
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void attemptOpenMainActivity(Intent intent) {
        try {
            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_MAIN);
            openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            openAppIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            if (intent != null && intent.getExtras() != null) {
                openAppIntent.putExtras(intent.getExtras());
            }
            openAppIntent.putExtra("WORKPAY_ALARM_AUTO_OPEN", true);
            startActivity(openAppIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopForegroundAndRingtone() {
        isAlarmActive = false;
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}

        try {
            if (vibrator != null) {
                vibrator.cancel();
                vibrator = null;
            }
        } catch (Exception ignored) {}

        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception ignored) {}

        try {
            stopForeground(true);
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        stopForegroundAndRingtone();
        super.onDestroy();
    }
}
