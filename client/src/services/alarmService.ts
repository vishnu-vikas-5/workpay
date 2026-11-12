// Web Audio API Synthesizer and Native Local Alarms for WorkPay

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

class AlarmService {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private ringIntervalId: any = null;
  private vibrationIntervalId: any = null;
  private backgroundTickerId: any = null;
  private onAlarmTriggerCallback: ((alarm: ActiveAlarm) => void) | null = null;
  private onAlarmsUpdateCallback: (() => void) | null = null;

  constructor() {
    this.initAudioContext();
    this.startBackgroundTicker();
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

  // Test sound function (plays 2 pulses)
  public testAlarmSound() {
    this.initAudioContext();
    this.playBeepPulse();
    setTimeout(() => this.playBeepPulse(), 350);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }
  }

  // Request browser/system notification permissions
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }

  // Show a local system notification
  public showNotification(title: string, body: string) {
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
    } catch (e) {}
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
    return newAlarm;
  }

  // Cancel an alarm
  public cancelAlarm(alarmId: string) {
    const alarms = this.getActiveAlarms().filter((a) => a.id !== alarmId);
    this.saveActiveAlarms(alarms);
    this.stopAlarmSound();
  }

  // Mark an alarm completed/dismissed
  public dismissAlarm(alarmId: string) {
    this.stopAlarmSound();
    const alarms = this.getActiveAlarms().map((a) =>
      a.id === alarmId ? { ...a, status: 'completed' as const } : a
    );
    this.saveActiveAlarms(alarms);
  }

  // Snooze an alarm by 10 minutes
  public snoozeAlarm(alarmId: string, snoozeMinutes: number = 10) {
    this.stopAlarmSound();
    const alarms = this.getActiveAlarms().map((a) => {
      if (a.id === alarmId) {
        const newEndTime = Date.now() + snoozeMinutes * 60 * 1000;
        return {
          ...a,
          status: 'running' as const,
          targetEndTime: newEndTime,
        };
      }
      return a;
    });
    this.saveActiveAlarms(alarms);
  }

  // Listeners
  public onAlarmTrigger(cb: (alarm: ActiveAlarm) => void) {
    this.onAlarmTriggerCallback = cb;
  }

  public onAlarmsUpdate(cb: () => void) {
    this.onAlarmsUpdateCallback = cb;
  }

  // Periodic 1-second background ticker to check shift end and overtime alarms
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
