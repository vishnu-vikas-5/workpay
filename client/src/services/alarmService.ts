// Web Audio API Synthesizer and Native Local Alarms for WorkPay
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NativeAlarmPluginInterface {
  scheduleAlarm(options: {
    id: string;
    triggerTimeMs: number;
    title: string;
    body: string;
    type: string;
    employeeId?: string;
    employeeName?: string;
    overtimeHours?: number;
    repeatsDaily?: boolean;
  }): Promise<void>;
  cancelAlarm(options: { id: string }): Promise<void>;
  getPendingAlarm(): Promise<{
    alarm?: {
      alarmId?: string;
      title?: string;
      body?: string;
      type?: string;
      employeeId?: string;
      employeeName?: string;
      overtimeHours?: number;
    };
  }>;
  addListener(
    eventName: 'alarmTriggered',
    listenerFunc: (data: any) => void
  ): Promise<any>;
}

export const NativeAlarm = registerPlugin<NativeAlarmPluginInterface>('NativeAlarm');

export type AlarmType = 'shift_end' | 'overtime';

export interface ActiveAlarm {
  id: string;
  type: AlarmType;
  employeeId?: string; // specific employee or 'all'
  employeeName: string;
  durationMinutes: number;
  overtimeHours: number; // e.g. 1.0 for 1 hr
  scheduledTimeStr?: string; // "17:30" (5:30 PM)
  startTime: number; // timestamp ms
  targetEndTime: number; // timestamp ms
  status: 'running' | 'ringing' | 'completed' | 'dismissed';
  note?: string;
  createdAt: string;
}

export interface ShiftAlarmSettings {
  enabled: boolean;
  shiftEndTime: string; // default "17:30" (5:30 PM)
  label: string;
  lastTriggeredDate?: string; // "YYYY-MM-DD"
}

const ALARMS_STORAGE_KEY = 'workpay_active_alarms';
const SHIFT_SETTINGS_KEY = 'workpay_shift_alarm_settings';
const ALARM_CHANNEL_ID = 'workpay_alarm_channel';
const SHIFT_END_NOTIF_ID = 9999;

class AlarmService {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private ringIntervalId: any = null;
  private vibrationIntervalId: any = null;
  private backgroundTickerId: any = null;
  private onAlarmTriggerCallback: ((alarm: ActiveAlarm) => void) | null = null;
  private onAlarmsUpdateCallback: (() => void) | null = null;
  private isNativeReady: boolean = false;

  constructor() {
    this.initAudioContext();
    this.initNativeNotifications();
    this.startBackgroundTicker();
  }

  // Consistent positive 31-bit integer hash for notification IDs
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash % 2000000000) || 1001;
  }

  // Initialize native alarm channel and notification listeners on Android / iOS
  public async initNativeNotifications() {
    if (typeof window === 'undefined') return;
    try {
      if (Capacitor.isNativePlatform()) {
        // High importance notification channel with alarm behavior for Android
        await LocalNotifications.createChannel({
          id: ALARM_CHANNEL_ID,
          name: 'WorkPay Shift & Overtime Alarms',
          description: 'Loud alarm alerts for shift completion and overtime tracking',
          importance: 5, // IMPORTANCE_HIGH: Pops up as heads-up notification over any app
          visibility: 1, // VISIBILITY_PUBLIC: Displays on lock screen
          vibration: true,
          lights: true,
          lightColor: '#D97706',
        }).catch((e) => console.warn('createChannel notice:', e));

        // Request permission on Android 13+ / iOS
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        // Handle user tapping the notification outside the app
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const extra = action.notification.extra;
          this.handleNativeAlarmTrigger(extra);
        });

        // Listen for Native Alarm Intent triggered while app is foregrounded or waking
        try {
          NativeAlarm.addListener('alarmTriggered', (data) => {
            this.handleNativeAlarmTrigger(data);
          });

          // Check if app was directly launched / awakened by an Alarm Intent
          NativeAlarm.getPendingAlarm().then((res) => {
            if (res && res.alarm) {
              this.handleNativeAlarmTrigger(res.alarm);
            }
          }).catch(() => {});

          // Re-check pending alarm on resume / screen unlock / focus
          if (typeof window !== 'undefined') {
            window.addEventListener('focus', () => {
              NativeAlarm.getPendingAlarm().then((res) => {
                if (res && res.alarm) {
                  this.handleNativeAlarmTrigger(res.alarm);
                }
              }).catch(() => {});
            });

            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                NativeAlarm.getPendingAlarm().then((res) => {
                  if (res && res.alarm) {
                    this.handleNativeAlarmTrigger(res.alarm);
                  }
                }).catch(() => {});
              }
            });
          }
        } catch (e) {
          console.warn('NativeAlarm listener registration notice:', e);
        }

        this.isNativeReady = true;

        // Schedule or restore initial daily shift alarm on app launch
        const shiftSettings = this.getShiftAlarmSettings();
        if (shiftSettings.enabled) {
          this.scheduleDailyShiftNativeAlarm(shiftSettings).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Native notification initialization notice:', e);
    }
  }

  // Handle alarm payload from Native AlarmManager or FullScreenIntent
  public handleNativeAlarmTrigger(data: any) {
    if (!data) return;
    const alarmId = data.alarmId;
    const type: AlarmType = data.type === 'shift_end' ? 'shift_end' : 'overtime';
    const alarms = this.getActiveAlarms();
    let targetAlarm: ActiveAlarm | undefined;

    if (alarmId) {
      targetAlarm = alarms.find((a) => a.id === alarmId);
    }

    if (!targetAlarm) {
      if (type === 'shift_end') {
        targetAlarm = {
          id: alarmId || `shift-end-${Date.now()}`,
          type: 'shift_end',
          employeeName: data.employeeName || 'All Workers',
          durationMinutes: 480,
          overtimeHours: 0,
          scheduledTimeStr: '17:30',
          startTime: Date.now(),
          targetEndTime: Date.now(),
          status: 'ringing',
          note: 'Daily Shift End: Mark Attendance or Add Overtime',
          createdAt: new Date().toISOString(),
        };
        alarms.push(targetAlarm);
      } else {
        const ot = typeof data.overtimeHours === 'number' ? data.overtimeHours : 1.0;
        targetAlarm = {
          id: alarmId || `ot-alarm-${Date.now()}`,
          type: 'overtime',
          employeeId: data.employeeId,
          employeeName: data.employeeName || 'Worker',
          durationMinutes: Math.round(ot * 60),
          overtimeHours: ot,
          startTime: Date.now(),
          targetEndTime: Date.now(),
          status: 'ringing',
          createdAt: new Date().toISOString(),
        };
        alarms.push(targetAlarm);
      }
    } else {
      targetAlarm.status = 'ringing';
    }

    this.saveActiveAlarms(alarms);
    this.startAlarmSound();
    if (this.onAlarmTriggerCallback && targetAlarm) {
      this.onAlarmTriggerCallback(targetAlarm);
    }
  }

  // Pre-initialize or unlock AudioContext on user gesture
  public initAudioContext() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        const unlock = () => {
          this.audioCtx?.resume().then(() => {
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
          }).catch(() => {});
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  // Play a single crisp, pleasant dual-tone alarm pulse (880Hz / 1046Hz)
  public playBeepPulse() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;

      // Tone 1: High crisp A5 (880 Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Tone 2: Harmonic C6 (1046.5 Hz) 120ms later
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Beep pulse audio error:', e);
    }
  }

  // Continuously play the urgent alarm sound until stopped
  public startAlarmSound() {
    if (this.isRinging) return;
    this.isRinging = true;

    // Immediately play first pulse
    this.playBeepPulse();

    // Repeat pulse every 550ms like an alarm clock
    this.ringIntervalId = setInterval(() => {
      if (!this.isRinging) return;
      this.playBeepPulse();
    }, 550);

    // Vibration pattern on mobile APK (500ms vibration, 200ms silence, 500ms vibration)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800]);
        this.vibrationIntervalId = setInterval(() => {
          if (!this.isRinging) return;
          navigator.vibrate([500, 200, 500, 200, 800]);
        }, 2200);
      } catch (e) {}
    }
  }

  // Stop the alarm sound and vibration immediately
  public stopAlarmSound() {
    this.isRinging = false;
    if (this.ringIntervalId) {
      clearInterval(this.ringIntervalId);
      this.ringIntervalId = null;
    }
    if (this.vibrationIntervalId) {
      clearInterval(this.vibrationIntervalId);
      this.vibrationIntervalId = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }

  // Test sound function (plays 2 pulses + vibration)
  public testAlarmSound() {
    this.initAudioContext();
    this.playBeepPulse();
    setTimeout(() => this.playBeepPulse(), 350);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }
    this.showNotification(
      '🔔 Alarm Sound & Speaker Test',
      'WorkPay alarm sound and heads-up notifications are functioning properly.'
    );
  }

  // Request browser/system notification permissions
  public async requestNotificationPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.requestPermissions();
        return res.display === 'granted';
      } catch (e) {
        return false;
      }
    }
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }

  // Show a local system notification / heads-up banner
  public showNotification(title: string, body: string) {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 80000) + 10000,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: ALARM_CHANNEL_ID,
          },
        ],
      }).catch((e) => console.warn('Native notification schedule error:', e));
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          requireInteraction: true,
          tag: 'workpay-alarm',
        });
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  }

  // -------------------------------------------------------------
  // Settings: Daily Shift End Alarm (e.g. 5:30 PM / 17:30)
  // -------------------------------------------------------------

  public getShiftAlarmSettings(): ShiftAlarmSettings {
    try {
      const raw = localStorage.getItem(SHIFT_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      enabled: true,
      shiftEndTime: '17:30', // Default 5:30 PM
      label: 'Daily Shift End Alarm (5:30 PM)',
    };
  }

  public saveShiftAlarmSettings(settings: ShiftAlarmSettings) {
    try {
      localStorage.setItem(SHIFT_SETTINGS_KEY, JSON.stringify(settings));
      this.onAlarmsUpdateCallback?.();
      this.scheduleDailyShiftNativeAlarm(settings).catch(() => {});
    } catch (e) {}
  }

  // Schedule daily repeating native alarm for shift end (fires outside app)
  public async scheduleDailyShiftNativeAlarm(settings: ShiftAlarmSettings) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (!settings.enabled || !settings.shiftEndTime) {
        await LocalNotifications.cancel({ notifications: [{ id: SHIFT_END_NOTIF_ID }] }).catch(() => {});
        await NativeAlarm.cancelAlarm({ id: 'shift_end_daily' }).catch(() => {});
        return;
      }

      const [hStr, mStr] = settings.shiftEndTime.split(':');
      const target = new Date();
      target.setHours(parseInt(hStr, 10) || 17, parseInt(mStr, 10) || 30, 0, 0);

      // If today's time has already passed, schedule for tomorrow
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }

      // 1. High-priority Android AlarmManager with FullScreenIntent
      await NativeAlarm.scheduleAlarm({
        id: 'shift_end_daily',
        triggerTimeMs: target.getTime(),
        title: `⏰ Daily Shift End Alarm (${settings.shiftEndTime})`,
        body: "Work shift ended! Time to mark today's worker attendance or add overtime.",
        type: 'shift_end',
        employeeName: 'All Workers',
        repeatsDaily: true,
      }).catch((e) => console.warn('NativeAlarm scheduleDaily error:', e));

      // 2. LocalNotification fallback
      await LocalNotifications.schedule({
        notifications: [
          {
            id: SHIFT_END_NOTIF_ID,
            title: `⏰ Daily Shift End Alarm (${settings.shiftEndTime})`,
            body: "Work shift ended! Time to mark today's worker attendance or add overtime.",
            schedule: {
              at: target,
              allowWhileIdle: true, // EXACT Android AlarmManager trigger even in Doze mode
              repeats: true,
              every: 'day', // Repeats automatically every day at specified time
            },
            channelId: ALARM_CHANNEL_ID,
            extra: {
              type: 'shift_end',
            },
          },
        ],
      });
    } catch (e) {
      console.warn('Error scheduling daily shift native alarm:', e);
    }
  }

  // -------------------------------------------------------------
  // Active Alarms & Overtime Extensions
  // -------------------------------------------------------------

  public getActiveAlarms(): ActiveAlarm[] {
    try {
      const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public saveActiveAlarms(alarms: ActiveAlarm[]) {
    try {
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
      this.onAlarmsUpdateCallback?.();
    } catch (e) {}
  }

  // Schedule exact native notification for an overtime alarm
  private async scheduleNativeAlarm(alarm: ActiveAlarm) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const notifId = this.hashString(alarm.id);
      const isShiftEnd = alarm.type === 'shift_end';
      const title = isShiftEnd
        ? `⏰ Shift End Alarm (${alarm.scheduledTimeStr || '5:30 PM'})`
        : `⏰ Overtime Finished: ${alarm.employeeName}`;
      const body = isShiftEnd
        ? "Work shift ended! Time to mark today's worker attendance or add overtime."
        : `${alarm.employeeName} completed ${alarm.overtimeHours}h overtime! Tap to mark attendance & record OT.`;

      // 1. High-priority Android AlarmManager with FullScreenIntent
      await NativeAlarm.scheduleAlarm({
        id: alarm.id,
        triggerTimeMs: alarm.targetEndTime,
        title,
        body,
        type: alarm.type,
        employeeId: alarm.employeeId,
        employeeName: alarm.employeeName,
        overtimeHours: alarm.overtimeHours,
        repeatsDaily: false,
      }).catch((e) => console.warn('NativeAlarm schedule error:', e));

      // 2. LocalNotification fallback
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: {
              at: new Date(alarm.targetEndTime),
              allowWhileIdle: true, // Exact AlarmManager trigger outside of app
            },
            channelId: ALARM_CHANNEL_ID,
            extra: {
              alarmId: alarm.id,
              type: alarm.type,
              employeeId: alarm.employeeId,
              employeeName: alarm.employeeName,
            },
          },
        ],
      });
    } catch (e) {
      console.warn('Error scheduling native overtime alarm:', e);
    }
  }

  /**
   * Schedule an Overtime Alarm for a worker.
   * Can either:
   * 1. Extend today's regular 5:30 PM shift end by X hours (e.g. 5:30 PM + 1h = 6:30 PM)
   * 2. Or run a countdown timer of X hours from the current time.
   */
  public createOvertimeAlarm(params: {
    employeeId: string;
    employeeName: string;
    overtimeHours: number; // e.g. 1.0 or 0.5 or 2.0
    fromShiftEnd?: boolean; // if true, add to today's 5:30 PM
    note?: string;
  }): ActiveAlarm {
    this.initAudioContext();
    this.requestNotificationPermission().catch(() => {});

    const now = Date.now();
    const durationMinutes = Math.round(params.overtimeHours * 60);
    const durationMs = durationMinutes * 60 * 1000;

    let targetEndTime: number;
    let scheduledTimeStr: string | undefined;

    if (params.fromShiftEnd) {
      const settings = this.getShiftAlarmSettings();
      const [hStr, mStr] = settings.shiftEndTime.split(':');
      const shiftDate = new Date();
      shiftDate.setHours(parseInt(hStr, 10) || 17, parseInt(mStr, 10) || 30, 0, 0);

      // Add overtime duration to shift end
      targetEndTime = shiftDate.getTime() + durationMs;

      // If target time has already passed today, start from now instead
      if (targetEndTime <= now) {
        targetEndTime = now + durationMs;
      }

      const targetD = new Date(targetEndTime);
      scheduledTimeStr = targetD.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      targetEndTime = now + durationMs;
      const targetD = new Date(targetEndTime);
      scheduledTimeStr = targetD.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    const newAlarm: ActiveAlarm = {
      id: `ot-alarm-${now}-${Math.floor(Math.random() * 1000)}`,
      type: 'overtime',
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      durationMinutes,
      overtimeHours: params.overtimeHours,
      scheduledTimeStr,
      startTime: now,
      targetEndTime,
      status: 'running',
      note: params.note,
      createdAt: new Date().toISOString(),
    };

    const alarms = this.getActiveAlarms().filter(
      (a) => !(a.employeeId === params.employeeId && a.status === 'running')
    );
    alarms.push(newAlarm);
    this.saveActiveAlarms(alarms);

    // Schedule native Android alarm that fires even when app is closed / outside app
    this.scheduleNativeAlarm(newAlarm);

    return newAlarm;
  }

  // Cancel an alarm
  public cancelAlarm(alarmId: string) {
    const alarms = this.getActiveAlarms().filter((a) => a.id !== alarmId);
    this.saveActiveAlarms(alarms);
    this.stopAlarmSound();

    if (Capacitor.isNativePlatform()) {
      const notifId = this.hashString(alarmId);
      LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      NativeAlarm.cancelAlarm({ id: alarmId }).catch(() => {});
    }
  }

  // Mark an alarm completed/dismissed
  public dismissAlarm(alarmId: string) {
    this.stopAlarmSound();
    const alarms = this.getActiveAlarms().map((a) =>
      a.id === alarmId ? { ...a, status: 'completed' as const } : a
    );
    this.saveActiveAlarms(alarms);

    if (Capacitor.isNativePlatform()) {
      const notifId = this.hashString(alarmId);
      LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      NativeAlarm.cancelAlarm({ id: alarmId }).catch(() => {});
    }
  }

  // Snooze an alarm by 10 minutes
  public snoozeAlarm(alarmId: string, snoozeMinutes: number = 10) {
    this.stopAlarmSound();
    const newEndTime = Date.now() + snoozeMinutes * 60 * 1000;
    const alarms = this.getActiveAlarms().map((a) => {
      if (a.id === alarmId) {
        return {
          ...a,
          status: 'running' as const,
          targetEndTime: newEndTime,
        };
      }
      return a;
    });
    this.saveActiveAlarms(alarms);

    const snoozedAlarm = alarms.find((a) => a.id === alarmId);
    if (snoozedAlarm) {
      this.scheduleNativeAlarm(snoozedAlarm);
    }
  }

  // Listeners
  public onAlarmTrigger(cb: (alarm: ActiveAlarm) => void) {
    this.onAlarmTriggerCallback = cb;
  }

  public onAlarmsUpdate(cb: () => void) {
    this.onAlarmsUpdateCallback = cb;
  }

  // Periodic 1-second foreground ticker to check shift end and overtime alarms while app is open
  private startBackgroundTicker() {
    if (this.backgroundTickerId) clearInterval(this.backgroundTickerId);

    this.backgroundTickerId = setInterval(() => {
      const now = Date.now();
      const alarms = this.getActiveAlarms();
      let hasChange = false;

      // 1. Check active overtime timers
      for (const a of alarms) {
        if (a.status === 'running' && now >= a.targetEndTime) {
          a.status = 'ringing';
          hasChange = true;
          this.startAlarmSound();
          this.showNotification(
            `⏰ Overtime Finished: ${a.employeeName}`,
            `${a.employeeName} completed ${a.overtimeHours}h overtime! Tap to mark attendance & record OT.`
          );
          if (this.onAlarmTriggerCallback) {
            this.onAlarmTriggerCallback(a);
          }
        }
      }

      if (hasChange) {
        this.saveActiveAlarms(alarms);
      }

      // 2. Check Daily Shift End Alarm (e.g. 5:30 PM)
      const settings = this.getShiftAlarmSettings();
      if (settings.enabled && settings.shiftEndTime) {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentTimeStr = new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        // Trigger when current 24h time matches shift end time (e.g. "17:30") and hasn't fired today
        if (currentTimeStr === settings.shiftEndTime && settings.lastTriggeredDate !== todayStr) {
          settings.lastTriggeredDate = todayStr;
          this.saveShiftAlarmSettings(settings);

          const shiftEndAlarm: ActiveAlarm = {
            id: `shift-end-${Date.now()}`,
            type: 'shift_end',
            employeeName: 'All Workers',
            durationMinutes: 480, // 8 hours
            overtimeHours: 0,
            scheduledTimeStr: settings.shiftEndTime,
            startTime: now,
            targetEndTime: now,
            status: 'ringing',
            note: 'Daily Shift End: Mark Attendance or Add Overtime',
            createdAt: new Date().toISOString(),
          };

          const updatedAlarms = [...this.getActiveAlarms(), shiftEndAlarm];
          this.saveActiveAlarms(updatedAlarms);

          this.startAlarmSound();
          this.showNotification(
            '⏰ Shift End Alarm (5:30 PM)',
            "Work shift ended! Time to mark today's worker attendance or add overtime."
          );

          if (this.onAlarmTriggerCallback) {
            this.onAlarmTriggerCallback(shiftEndAlarm);
          }
        }
      }
    }, 1000);
  }
}

export const alarmService = new AlarmService();
