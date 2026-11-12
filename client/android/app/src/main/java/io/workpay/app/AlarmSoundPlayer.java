package io.workpay.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class AlarmSoundPlayer {
    private static MediaPlayer mediaPlayer = null;
    private static Vibrator vibrator = null;
    private static PowerManager.WakeLock wakeLock = null;
    private static Handler autoStopHandler = null;
    private static Runnable autoStopRunnable = null;
    private static boolean isPlaying = false;

    public static synchronized boolean isRinging() {
        return isPlaying;
    }

    public static synchronized void play(Context context) {
        stop(); // Reset any existing playback

        isPlaying = true;
        Context appContext = context.getApplicationContext();

        // 1. Acquire WakeLock to keep CPU & screen active
        try {
            PowerManager pm = (PowerManager) appContext.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "WorkPay:AlarmSoundWakeLock"
                );
                wakeLock.acquire(3 * 60 * 1000L); // 3 minutes max
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Play continuous looping alarm tone
        try {
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(appContext, alertUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setLooping(true); // Loop until user dismisses
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 3. Continuous vibration pattern
        try {
            vibrator = (Vibrator) appContext.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 800, 300, 800, 300};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 4. Safety auto-stop after 3 minutes to prevent battery drain if phone unattended
        try {
            if (autoStopHandler == null) {
                autoStopHandler = new Handler(Looper.getMainLooper());
            }
            autoStopRunnable = new Runnable() {
                @Override
                public void run() {
                    stop();
                }
            };
            autoStopHandler.postDelayed(autoStopRunnable, 3 * 60 * 1000L);
        } catch (Exception ignored) {}
    }

    public static synchronized void stop() {
        isPlaying = false;

        if (autoStopHandler != null && autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }

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
    }
}
