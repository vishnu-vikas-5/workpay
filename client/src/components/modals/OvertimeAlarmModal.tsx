import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Bell,
  Play,
  Trash2,
  Volume2,
  Calendar,
  Sparkles,
  Timer,
  CheckCircle2,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { alarmService, OvertimeTimer, AttendanceReminderSettings } from '../../services/alarmService';

interface OvertimeAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmployeeId?: string;
}

export const OvertimeAlarmModal: React.FC<OvertimeAlarmModalProps> = ({
  isOpen,
  onClose,
  defaultEmployeeId,
}) => {
  const { employees } = useAppData();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    defaultEmployeeId || employees[0]?.id || ''
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(60); // Default 1 hour
  const [customHours, setCustomHours] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [timers, setTimers] = useState<OvertimeTimer[]>([]);
  const [reminderSettings, setReminderSettings] = useState<AttendanceReminderSettings>(
    alarmService.getDailyReminderSettings()
  );
  const [now, setNow] = useState<number>(Date.now());
  const [testSoundNotice, setTestSoundNotice] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmployeeId(defaultEmployeeId);
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [defaultEmployeeId, employees]);

  // Refresh timers and update live tick
  useEffect(() => {
    if (!isOpen) return;
    setTimers(alarmService.getOvertimeTimers());
    setReminderSettings(alarmService.getDailyReminderSettings());

    const interval = setInterval(() => {
      setNow(Date.now());
      setTimers(alarmService.getOvertimeTimers());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    const empName = emp ? emp.fullName : 'All Workers';

    alarmService.createOvertimeTimer({
      employeeId: selectedEmployeeId,
      employeeName: empName,
      durationMinutes,
      note: note.trim() || undefined,
    });

    setTimers(alarmService.getOvertimeTimers());
    setNote('');
  };

  const handleCancelTimer = (timerId: string) => {
    alarmService.cancelTimer(timerId);
    setTimers(alarmService.getOvertimeTimers());
  };

  const handleTestSound = () => {
    alarmService.testAlarmSound();
    setTestSoundNotice('Alarm audio tested! Sound is working.');
    setTimeout(() => setTestSoundNotice(null), 3000);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    alarmService.saveDailyReminderSettings(reminderSettings);
    setTestSoundNotice('Daily attendance reminder updated!');
    setTimeout(() => setTestSoundNotice(null), 3000);
  };

  const PRESET_DURATIONS = [
    { label: '30 Mins (0.5h)', mins: 30 },
    { label: '1 Hour (1h)', mins: 60, popular: true },
    { label: '1.5 Hours', mins: 90 },
    { label: '2 Hours (2h)', mins: 120 },
    { label: '3 Hours (3h)', mins: 180 },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Overtime Alarm & Reminders</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Real-Time
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Audible alarm alerts you to mark attendance when OT is done
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio test banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Volume2 className="w-4 h-4 text-brand-600" />
            <span className="font-medium">Audio Alarm Alert</span>
          </div>
          <button
            type="button"
            onClick={handleTestSound}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Play className="w-3 h-3 fill-slate-700" />
            <span>Test Sound</span>
          </button>
        </div>

        {testSoundNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{testSoundNotice}</span>
          </div>
        )}

        {/* SET NEW OVERTIME TIMER FORM */}
        <form onSubmit={handleStartTimer} className="space-y-4">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>1. Select Worker Working Overtime</span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500/20"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.phone || 'No Phone'}) — ₹{emp.shiftRate || emp.hourlyWage * 8}/shift
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              <span>2. Choose Overtime Duration (Alarm Rings After)</span>
            </label>

            {/* Duration Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = durationMinutes === preset.mins;
                return (
                  <button
                    key={preset.mins}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(preset.mins);
                      setCustomHours((preset.mins / 60).toString());
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {preset.popular && (
                      <span className="block text-[9px] font-normal opacity-90">Recommended</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Duration Input */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-500">Or custom hours:</span>
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.5"
                value={customHours}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomHours(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setDurationMinutes(Math.round(val * 60));
                  }
                }}
                className="w-24 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
              <span className="text-xs font-semibold text-slate-600">
                hours ({durationMinutes} mins)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Optional Note
            </label>
            <input
              type="text"
              placeholder="e.g. Packing overtime, unloading shipment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>
              Start {durationMinutes >= 60 ? `${durationMinutes / 60} Hour` : `${durationMinutes} Mins`} Alarm
            </span>
          </button>
        </form>

        {/* ACTIVE TIMERS LIST */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Active Overtime Timers ({timers.filter((t) => t.status === 'running' || t.status === 'ringing').length})</span>
          </h4>

          {timers.filter((t) => t.status === 'running' || t.status === 'ringing').length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400">
              No active timers running right now. Choose a worker and duration above to start an overtime alarm.
            </div>
          ) : (
            <div className="space-y-2">
              {timers
                .filter((t) => t.status === 'running' || t.status === 'ringing')
                .map((timer) => {
                  const msRemaining = Math.max(0, timer.targetEndTime - now);
                  const totalSec = Math.floor(msRemaining / 1000);
                  const hrs = Math.floor(totalSec / 3600);
                  const mins = Math.floor((totalSec % 3600) / 60);
                  const secs = totalSec % 60;
                  const timeFormatted = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
                  const isRinging = timer.status === 'ringing' || msRemaining === 0;

                  return (
                    <div
                      key={timer.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isRinging
                          ? 'bg-rose-50 border-rose-300 animate-pulse text-rose-900'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{timer.employeeName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-amber-300">
                            {timer.overtimeHours}h OT
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-amber-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{isRinging ? '🚨 TIME EXPIRED! RINGING' : `${timeFormatted} remaining`}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelTimer(timer.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
                        title="Cancel Timer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* DAILY ATTENDANCE REMINDER CONFIG */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Daily Attendance Reminder</span>
          </h4>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Daily Alarm Reminder</span>
                <p className="text-[10px] text-slate-500">Chimes every day to remind you to mark attendance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderSettings.enabled}
                  onChange={(e) =>
                    setReminderSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {reminderSettings.enabled && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-medium text-slate-600">Reminder Time:</span>
                <input
                  type="time"
                  value={reminderSettings.time}
                  onChange={(e) =>
                    setReminderSettings((prev) => ({ ...prev, time: e.target.value }))
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleSaveReminder}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Save Time
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
