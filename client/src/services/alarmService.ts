// Web Audio API Synthesizer and Native Local Alarms for WorkPay

export interface OvertimeTimer {
  id: string;
  employeeId: string;
  employeeName: string;
  durationMinutes: number;
  overtimeHours: number;
  startTime: number; // Date.now()
  targetEndTime: number; // Date.now() + durationMinutes * 60 * 1000
  status: 'running' | 'ringing' | 'completed' | 'cancelled';
  note?: string;
  createdAt: string;
}

export interface AttendanceReminderSettings {
  enabled: boolean;
  time: string; // "09:00"
  label: string;
  lastTriggeredDate?: string; // "YYYY-MM-DD"
}

const TIMERS_STORAGE_KEY = 'workpay_overtime_timers';
const REMINDER_STORAGE_KEY = 'workpay_attendance_reminder';

class AlarmService {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private ringIntervalId: any = null;
  private vibrationIntervalId: any = null;
  private timerCheckIntervalId: any = null;
  private onAlarmTriggerCallback: ((timer: OvertimeTimer) => void) | null = null;
  private onDailyReminderCallback: ((settings: AttendanceReminderSettings) => void) | null = null;
  private onTimersUpdateCallback: (() => void) | null = null;

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
  private playBeepPulse() {
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

    // Repeat pulse every 600ms
    this.ringIntervalId = setInterval(() => {
      if (!this.isRinging) return;
      this.playBeepPulse();
    }, 600);

    // Vibration pattern on mobile APK (500ms vibration, 250ms silence)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 800]);
        this.vibrationIntervalId = setInterval(() => {
          if (!this.isRinging) return;
          navigator.vibrate([500, 250, 500, 250, 800]);
        }, 2500);
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
    setTimeout(() => this.playBeepPulse(), 400);
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
          tag: 'workpay-overtime-alarm',
        });
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  }

  // -------------------------------------------------------------
  // Overtime Timers CRUD & Background Watcher
  // -------------------------------------------------------------

  public getOvertimeTimers(): OvertimeTimer[] {
    try {
      const raw = localStorage.getItem(TIMERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public saveOvertimeTimers(timers: OvertimeTimer[]) {
    try {
      localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers));
      this.onTimersUpdateCallback?.();
    } catch (e) {}
  }

  // Create and start a new Overtime Timer
  public createOvertimeTimer(params: {
    employeeId: string;
    employeeName: string;
    durationMinutes: number;
    note?: string;
  }): OvertimeTimer {
    this.initAudioContext();
    this.requestNotificationPermission().catch(() => {});

    const now = Date.now();
    const durationMs = Math.round(params.durationMinutes * 60 * 1000);
    const overtimeHours = Math.round((params.durationMinutes / 60) * 100) / 100;

    const newTimer: OvertimeTimer = {
      id: `ot-timer-${now}-${Math.floor(Math.random() * 1000)}`,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      durationMinutes: params.durationMinutes,
      overtimeHours,
      startTime: now,
      targetEndTime: now + durationMs,
      status: 'running',
      note: params.note,
      createdAt: new Date().toISOString(),
    };

    const timers = this.getOvertimeTimers();
    timers.push(newTimer);
    this.saveOvertimeTimers(timers);
    return newTimer;
  }

  // Cancel or delete a timer
  public cancelTimer(timerId: string) {
    const timers = this.getOvertimeTimers().filter((t) => t.id !== timerId);
    this.saveOvertimeTimers(timers);
    this.stopAlarmSound();
  }

  // Mark a timer as completed or dismissed
  public dismissTimer(timerId: string) {
    this.stopAlarmSound();
    const timers = this.getOvertimeTimers().map((t) =>
      t.id === timerId ? { ...t, status: 'completed' as const } : t
    );
    this.saveOvertimeTimers(timers);
  }

  // Snooze a timer by additional minutes (e.g. 10m)
  public snoozeTimer(timerId: string, additionalMinutes: number = 10) {
    this.stopAlarmSound();
    const timers = this.getOvertimeTimers().map((t) => {
      if (t.id === timerId) {
        const newEndTime = Date.now() + additionalMinutes * 60 * 1000;
        return {
          ...t,
          status: 'running' as const,
          targetEndTime: newEndTime,
          durationMinutes: t.durationMinutes + additionalMinutes,
          overtimeHours: Math.round(((t.durationMinutes + additionalMinutes) / 60) * 100) / 100,
        };
      }
      return t;
    });
    this.saveOvertimeTimers(timers);
  }

  // -------------------------------------------------------------
  // Daily Attendance Reminder
  // -------------------------------------------------------------

  public getDailyReminderSettings(): AttendanceReminderSettings {
    try {
      const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      enabled: true,
      time: '09:00',
      label: 'Morning Shift Attendance Reminder',
    };
  }

  public saveDailyReminderSettings(settings: AttendanceReminderSettings) {
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Subscription Listeners
  // -------------------------------------------------------------

  public onAlarmTrigger(cb: (timer: OvertimeTimer) => void) {
    this.onAlarmTriggerCallback = cb;
  }

  public onDailyReminder(cb: (settings: AttendanceReminderSettings) => void) {
    this.onDailyReminderCallback = cb;
  }

  public onTimersUpdate(cb: () => void) {
    this.onTimersUpdateCallback = cb;
  }

  // Periodic 1-second background ticker to check timers
  private startBackgroundTicker() {
    if (this.timerCheckIntervalId) clearInterval(this.timerCheckIntervalId);

    this.timerCheckIntervalId = setInterval(() => {
      const now = Date.now();
      const timers = this.getOvertimeTimers();
      let hasChange = false;

      // 1. Check running overtime timers
      for (const t of timers) {
        if (t.status === 'running' && now >= t.targetEndTime) {
          t.status = 'ringing';
          hasChange = true;
          this.startAlarmSound();
          this.showNotification(
            `⏰ Overtime Completed: ${t.employeeName}`,
            `${t.employeeName} has completed ${t.overtimeHours}h overtime! Tap to mark attendance & record OT.`
          );
          if (this.onAlarmTriggerCallback) {
            this.onAlarmTriggerCallback(t);
          }
        }
      }

      if (hasChange) {
        this.saveOvertimeTimers(timers);
      }

      // 2. Check daily attendance reminder
      const reminder = this.getDailyReminderSettings();
      if (reminder.enabled && reminder.time) {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentTimeStr = new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        if (currentTimeStr === reminder.time && reminder.lastTriggeredDate !== todayStr) {
          reminder.lastTriggeredDate = todayStr;
          this.saveDailyReminderSettings(reminder);
          this.playBeepPulse();
          this.showNotification(
            '📋 WorkPay Attendance Reminder',
            "It's time to mark today's worker shift attendance!"
          );
          if (this.onDailyReminderCallback) {
            this.onDailyReminderCallback(reminder);
          }
        }
      }
    }, 1000);
  }
}

export const alarmService = new AlarmService();
