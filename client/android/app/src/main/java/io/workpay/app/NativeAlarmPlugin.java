package io.workpay.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.Map;

@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {
    private static final String PREFS_NAME = "workpay_native_alarms";
    private static NativeAlarmPlugin instance = null;
    private static JSObject pendingAlarm = null;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void setPendingAlarm(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("WORKPAY_ALARM_AUTO_OPEN", false)) {
            return;
        }

        JSObject obj = new JSObject();
        obj.put("alarmId", intent.getStringExtra("alarmId"));
        obj.put("title", intent.getStringExtra("title"));
        obj.put("body", intent.getStringExtra("body"));
        obj.put("type", intent.getStringExtra("type"));
        obj.put("employeeId", intent.getStringExtra("employeeId"));
        obj.put("employeeName", intent.getStringExtra("employeeName"));
        obj.put("overtimeHours", intent.getDoubleExtra("overtimeHours", 0.0));
        pendingAlarm = obj;

        if (instance != null) {
            instance.notifyListeners("alarmTriggered", obj, true);
        }
    }

    @PluginMethod
    public void getPendingAlarm(PluginCall call) {
        if (pendingAlarm != null) {
            JSObject res = new JSObject();
            res.put("alarm", pendingAlarm);
            pendingAlarm = null;
            call.resolve(res);
        } else {
            call.resolve(new JSObject());
        }
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        String id = call.getString("id");
        Double triggerTimeMsVal = call.getData().optDouble("triggerTimeMs");
        if (id == null || Double.isNaN(triggerTimeMsVal) || triggerTimeMsVal <= 0) {
            call.reject("Missing required parameters: id or triggerTimeMs");
            return;
        }

        long triggerTimeMs = triggerTimeMsVal.longValue();
        String title = call.getString("title", "WorkPay Alarm");
        String body = call.getString("body", "Alarm triggered");
        String type = call.getString("type", "overtime");
        String employeeId = call.getString("employeeId");
        String employeeName = call.getString("employeeName");
        double otHours = call.getData().optDouble("overtimeHours", 0.0);
        boolean repeatsDaily = call.getBoolean("repeatsDaily", false);

        scheduleAlarmExact(
            getContext(),
            id,
            triggerTimeMs,
            title,
            body,
            type,
            employeeId,
            employeeName,
            otHours,
            repeatsDaily
        );

        call.resolve();
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing id parameter");
            return;
        }

        cancelAlarmExact(getContext(), id);
        call.resolve();
    }

    public static void scheduleAlarmExact(
        Context context,
        String id,
        long triggerTimeMs,
        String title,
        String body,
        String type,
        String employeeId,
        String employeeName,
        double overtimeHours,
        boolean repeatsDaily
    ) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
            intent.putExtra("alarmId", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("type", type);
            intent.putExtra("employeeId", employeeId);
            intent.putExtra("employeeName", employeeName);
            intent.putExtra("overtimeHours", overtimeHours);
            intent.putExtra("repeatsDaily", repeatsDaily);

            int requestCode = Math.abs(id.hashCode() % 100000) + 1000;
            PendingIntent operationIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent showIntent = new Intent(context, MainActivity.class);
            PendingIntent showPendingIntent = PendingIntent.getActivity(
                context,
                requestCode,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Use setAlarmClock for maximum priority (fires even during deep Doze sleep)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerTimeMs, showPendingIntent);
                am.setAlarmClock(clockInfo, operationIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, operationIntent);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMs, operationIntent);
            }

            // Save alarm specification to SharedPreferences for device reboot recovery
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("triggerTimeMs", triggerTimeMs);
            json.put("title", title);
            json.put("body", body);
            json.put("type", type);
            json.put("employeeId", employeeId);
            json.put("employeeName", employeeName);
            json.put("overtimeHours", overtimeHours);
            json.put("repeatsDaily", repeatsDaily);
            prefs.edit().putString(id, json.toString()).apply();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void cancelAlarmExact(Context context, String id) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent intent = new Intent(context, AlarmReceiver.class);
                intent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
                int requestCode = Math.abs(id.hashCode() % 100000) + 1000;
                PendingIntent operationIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.cancel(operationIntent);
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(id).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void rescheduleAllOnBoot(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Map<String, ?> all = prefs.getAll();
            long now = System.currentTimeMillis();

            for (Map.Entry<String, ?> entry : all.entrySet()) {
                Object val = entry.getValue();
                if (val instanceof String) {
                    JSONObject json = new JSONObject((String) val);
                    String id = json.optString("id");
                    long triggerTimeMs = json.optLong("triggerTimeMs");
                    String title = json.optString("title");
                    String body = json.optString("body");
                    String type = json.optString("type");
                    String employeeId = json.optString("employeeId");
                    String employeeName = json.optString("employeeName");
                    double overtimeHours = json.optDouble("overtimeHours", 0.0);
                    boolean repeatsDaily = json.optBoolean("repeatsDaily", false);

                    if (repeatsDaily) {
                        while (triggerTimeMs <= now) {
                            triggerTimeMs += 24L * 60L * 60L * 1000L;
                        }
                        scheduleAlarmExact(context, id, triggerTimeMs, title, body, type, employeeId, employeeName, overtimeHours, true);
                    } else if (triggerTimeMs > now) {
                        scheduleAlarmExact(context, id, triggerTimeMs, title, body, type, employeeId, employeeName, overtimeHours, false);
                    } else {
                        prefs.edit().remove(id).apply();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
