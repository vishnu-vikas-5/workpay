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
  Plus,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { alarmService, ActiveAlarm, ShiftAlarmSettings } from '../../services/alarmService';

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

  const [shiftSettings, setShiftSettings] = useState<ShiftAlarmSettings>(
    alarmService.getShiftAlarmSettings()
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    defaultEmployeeId || employees[0]?.id || ''
  );
  const [otHours, setOtHours] = useState<number>(1); // Default 1 hour OT
  const [timingMode, setTimingMode] = useState<'from_shift_end' | 'from_now'>('from_shift_end');
  const [note, setNote] = useState<string>('');
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmployeeId(defaultEmployeeId);
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [defaultEmployeeId, employees]);

  useEffect(() => {
    if (!isOpen) return;
    setAlarms(alarmService.getActiveAlarms());
    setShiftSettings(alarmService.getShiftAlarmSettings());
    alarmService.checkOverlayPermission().then(setHasOverlayPermission).catch(() => {});

    const interval = setInterval(() => {
      setNow(Date.now());
      setAlarms(alarmService.getActiveAlarms());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveShiftSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alarmService.saveShiftAlarmSettings(shiftSettings);
    setToastNotice(`Daily Shift Alarm set to ${format12Hour(shiftSettings.shiftEndTime)}!`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleStartOtAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    const empName = emp ? emp.fullName : 'All Workers';

    alarmService.createOvertimeAlarm({
      employeeId: selectedEmployeeId,
      employeeName: empName,
      overtimeHours: otHours,
      fromShiftEnd: timingMode === 'from_shift_end',
      note: note.trim() || undefined,
    });

    setAlarms(alarmService.getActiveAlarms());
    setToastNotice(`Overtime Alarm set for ${empName} (${otHours}h OT)!`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleCancelAlarm = (id: string) => {
    alarmService.cancelAlarm(id);
    setAlarms(alarmService.getActiveAlarms());
  };

  const handleTestSound = () => {
    alarmService.testAlarmSound();
    setToastNotice('Sound is working!');
    setTimeout(() => setToastNotice(null), 3000);
  };

  function format12Hour(time24: string) {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  // Calculate projected alarm time if extending from shift end
  const projectedOtTime = (() => {
    const [hStr, mStr] = shiftSettings.shiftEndTime.split(':');
    const d = new Date();
    d.setHours(parseInt(hStr, 10) || 17, parseInt(mStr, 10) || 30, 0, 0);
    const targetMs = d.getTime() + otHours * 60 * 60 * 1000;
    return new Date(targetMs).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  })();

  const OT_OPTIONS = [
    { label: '⚡ 1 Min Test', val: 0.0167, isTest: true },
    { label: '⚡ 2 Min Test', val: 0.0333, isTest: true },
    { label: '+30 Mins (0.5h)', val: 0.5 },
    { label: '+1 Hour (1.0h)', val: 1.0, popular: true },
    { label: '+1.5 Hours', val: 1.5 },
    { label: '+2 Hours (2.0h)', val: 2.0 },
    { label: '+3 Hours (3.0h)', val: 3.0 },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sand-950/40 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#DED6C1] rounded-3xl shadow-2xl border border-[#CFC6B1] p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-5 text-[#302C25]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#CFC6B1]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EBE2CC] text-[#302C25] border border-[#CFC6B1] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#302C25]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#302C25] flex items-center gap-2">
                <span>Shift & Overtime Alarm</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Live Audible
                </span>
              </h3>
              <p className="text-[11px] text-[#635B4E]">
                Audible alarm alerts you to mark attendance & OT on time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#635B4E] hover:text-[#302C25] hover:bg-[#EBE2CC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Audio Button */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#EBE2CC] border border-[#CFC6B1] text-xs">
          <div className="flex items-center gap-2 text-[#302C25]">
            <Volume2 className="w-4 h-4 text-amber-700" />
            <span className="font-bold">Alarm Speaker Test</span>
          </div>
          <button
            type="button"
            onClick={handleTestSound}
            className="px-3 py-1 bg-[#DED6C1] hover:bg-[#CFC6B1] border border-[#B7B09E] rounded-xl text-[#302C25] font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Play className="w-3 h-3 fill-[#302C25] text-[#302C25]" />
            <span>Test Sound</span>
          </button>
        </div>

        {/* Auto-Open App on Alarm Permission Banner */}
        {hasOverlayPermission === false && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
            <div className="flex items-start gap-2 text-amber-900 pr-2">
              <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-[11px]">Auto-Open App on Alarm</p>
                <p className="text-[10px] text-amber-800">
                  Allow &ldquo;Appear on top&rdquo; so WorkPay automatically pops open when alarms ring.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await alarmService.requestOverlayPermission();
                setTimeout(async () => {
                  const allowed = await alarmService.checkOverlayPermission();
                  setHasOverlayPermission(allowed);
                }, 1500);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] whitespace-nowrap shadow-xs"
            >
              Enable
            </button>
          </div>
        )}

        {toastNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{toastNotice}</span>
          </div>
        )}

        {/* 1. DAILY SHIFT END ALARM (DEFAULT 5:30 PM) */}
        <div className="bg-[#EBE2CC] p-4 rounded-2xl border border-[#CFC6B1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#302C25]" />
              <span className="text-xs font-bold text-[#302C25] uppercase tracking-wider">
                1. Daily Shift End Alarm
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shiftSettings.enabled}
                onChange={(e) =>
                  setShiftSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#CFC6B1] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#B7B09E] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <p className="text-[11px] text-[#635B4E]">
            Rings every day to alert you to mark worker shift attendance at end of day.
          </p>

          {shiftSettings.enabled && (
            <form onSubmit={handleSaveShiftSettings} className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="time"
                  value={shiftSettings.shiftEndTime}
                  onChange={(e) =>
                    setShiftSettings((prev) => ({ ...prev, shiftEndTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#DED6C1] border border-[#CFC6B1] rounded-xl text-xs font-bold text-[#302C25] shadow-2xs focus:ring-2 focus:ring-[#B7B09E]"
                  required
                />
              </div>
              <span className="text-xs font-bold text-[#302C25] bg-[#DED6C1] px-2.5 py-2 rounded-xl border border-[#CFC6B1] shadow-2xs">
                {format12Hour(shiftSettings.shiftEndTime)}
              </span>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] text-xs font-bold rounded-xl transition-all shadow-xs border border-[#1B1915]"
              >
                Set Daily
              </button>
            </form>
          )}
        </div>

        {/* 2. OVERTIME (OT) ALARM EXTENSION (e.g. ADD 1 HOUR) */}
        <form onSubmit={handleStartOtAlarm} className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-sand-900 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-amber-700" />
              <span>2. Overtime (OT) Alarm Extension</span>
            </label>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
              Custom OT
            </span>
          </div>

          {/* Select Worker */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-sand-700">
              Worker Doing Overtime:
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#EBE2CC] border border-[#CFC6B1] rounded-xl text-xs font-semibold text-[#302C25] focus:ring-2 focus:ring-[#B7B09E]"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.phone || 'No Phone'}) — ₹{emp.shiftRate || emp.hourlyWage * 8}/shift
                </option>
              ))}
            </select>
          </div>

          {/* Choose OT Duration (+1 Hour, etc.) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-[#635B4E]">
              Select Overtime Duration to Add:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OT_OPTIONS.map((opt) => {
                const isSelected = otHours === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      setOtHours(opt.val);
                      if ((opt as any).isTest) {
                        setTimingMode('from_now');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-[#EBE2CC] hover:bg-[#CFC6B1] text-[#302C25] border-[#CFC6B1]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.popular && (
                      <span className="block text-[9px] font-normal opacity-90">Most Common</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing Mode: Extend from 5:30 PM vs From Now */}
          <div className="p-3 bg-[#EBE2CC] rounded-2xl border border-[#CFC6B1] space-y-2">
            <label className="block text-[11px] font-bold text-[#302C25]">
              Alarm Schedule Timing:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTimingMode('from_shift_end')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  timingMode === 'from_shift_end'
                    ? 'bg-[#DED6C1] border-[#B7B09E] text-[#302C25] shadow-2xs font-bold'
                    : 'bg-[#EBE2CC] border-[#CFC6B1] text-[#635B4E]'
                }`}
              >
                <span className="block font-bold">Extend Shift End ({format12Hour(shiftSettings.shiftEndTime)})</span>
                <span className="text-[10px] text-[#635B4E] block mt-0.5">
                  Rings at <strong className="text-amber-800">{projectedOtTime}</strong> ({otHours}h OT)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('from_now')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  timingMode === 'from_now'
                    ? 'bg-[#DED6C1] border-[#B7B09E] text-[#302C25] shadow-2xs font-bold'
                    : 'bg-[#EBE2CC] border-[#CFC6B1] text-[#635B4E]'
                }`}
              >
                <span className="block font-bold">Countdown from Now</span>
                <span className="text-[10px] text-[#635B4E] block mt-0.5">
                  Rings after <strong className="text-amber-800">{otHours} hour(s)</strong> from now
                </span>
              </button>
            </div>
          </div>

          {/* Start OT Alarm Button */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>
              Start {otHours < 0.1 ? (otHours < 0.02 ? '1 Min Test' : '2 Min Test') : `${otHours} Hour`} Overtime Alarm (Rings {timingMode === 'from_shift_end' ? `at ${projectedOtTime}` : `in ${Math.round(otHours * 60)} min(s)`})
            </span>
          </button>
        </form>

        {/* 3. ACTIVE OVERTIME ALARMS LIST */}
        <div className="space-y-2 pt-2 border-t border-sand-300/70">
          <h4 className="text-xs font-bold text-sand-900 uppercase tracking-wider flex items-center justify-between">
            <span>Running Alarms ({alarms.filter((a) => a.status === 'running' || a.status === 'ringing').length})</span>
          </h4>

          {alarms.filter((a) => a.status === 'running' || a.status === 'ringing').length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-[#F5EFE3] border border-sand-300 text-center text-xs text-sand-500">
              No active overtime alarms running. Choose a worker and duration above to start an alarm.
            </div>
          ) : (
            <div className="space-y-2">
              {alarms
                .filter((a) => a.status === 'running' || a.status === 'ringing')
                .map((alarm) => {
                  const msRemaining = Math.max(0, alarm.targetEndTime - now);
                  const totalSec = Math.floor(msRemaining / 1000);
                  const hrs = Math.floor(totalSec / 3600);
                  const mins = Math.floor((totalSec % 3600) / 60);
                  const secs = totalSec % 60;
                  const timeFormatted = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
                  const isRinging = alarm.status === 'ringing' || msRemaining === 0;

                  return (
                    <div
                      key={alarm.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isRinging
                          ? 'bg-rose-100/80 border-rose-400 animate-pulse text-rose-950'
                          : 'bg-amber-100/60 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate">{alarm.employeeName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FAF6EE] border border-amber-300 shrink-0">
                            +{alarm.overtimeHours}h OT
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {isRinging
                              ? '🚨 RINGING! TIME IS UP'
                              : `${timeFormatted} left (Alarm at ${alarm.scheduledTimeStr || 'Target'})`}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelAlarm(alarm.id)}
                        className="p-2 text-sand-500 hover:text-rose-600 hover:bg-sand-200 rounded-xl transition-colors shrink-0"
                        title="Cancel Alarm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
