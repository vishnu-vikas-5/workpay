import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Volume2,
  X,
  VolumeX,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { alarmService, OvertimeTimer } from '../../services/alarmService';

export const RingingAlarmModal: React.FC = () => {
  const { markDailyAttendance } = useAppData();
  const [activeRingingTimer, setActiveRingingTimer] = useState<OvertimeTimer | null>(null);
  const [marking, setMarking] = useState<boolean>(false);
  const [markedNotice, setMarkedNotice] = useState<string | null>(null);

  // Listen for alarms triggering
  useEffect(() => {
    // Check if any timer is currently in 'ringing' status
    const checkRinging = () => {
      const timers = alarmService.getOvertimeTimers();
      const ringing = timers.find((t) => t.status === 'ringing');
      if (ringing && (!activeRingingTimer || activeRingingTimer.id !== ringing.id)) {
        setActiveRingingTimer(ringing);
      }
    };

    checkRinging();

    alarmService.onAlarmTrigger((timer) => {
      setActiveRingingTimer(timer);
    });

    const interval = setInterval(checkRinging, 1000);
    return () => clearInterval(interval);
  }, [activeRingingTimer]);

  if (!activeRingingTimer) return null;

  const handleMarkAttendanceWithOT = async () => {
    setMarking(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await markDailyAttendance({
        employeeId: activeRingingTimer.employeeId,
        date: today,
        status: 'present',
        overtimeHours: activeRingingTimer.overtimeHours,
      });

      alarmService.dismissTimer(activeRingingTimer.id);
      setMarkedNotice(
        `Marked present with ${activeRingingTimer.overtimeHours}h OT for ${activeRingingTimer.employeeName}!`
      );
      setTimeout(() => {
        setMarkedNotice(null);
        setActiveRingingTimer(null);
      }, 1500);
    } catch (err: any) {
      console.warn('Error marking attendance from alarm:', err);
    } finally {
      setMarking(false);
    }
  };

  const handleSnooze = () => {
    alarmService.snoozeTimer(activeRingingTimer.id, 10);
    setActiveRingingTimer(null);
  };

  const handleDismiss = () => {
    alarmService.dismissTimer(activeRingingTimer.id);
    setActiveRingingTimer(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-rose-500 p-5 sm:p-6 text-center space-y-4 animate-in zoom-in-95">
        {/* Animated Pulsing Alarm Bell */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/20">
          <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40"></div>
          <Bell className="w-8 h-8 animate-bounce" />
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            ⏰ OVERTIME COMPLETED!
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-2">
            {activeRingingTimer.employeeName}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Finished working <span className="font-bold text-rose-600">{activeRingingTimer.overtimeHours} hour(s)</span> overtime ({activeRingingTimer.durationMinutes} mins).
          </p>
        </div>

        {markedNotice ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{markedNotice}</span>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleMarkAttendanceWithOT}
              disabled={marking}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {marking
                  ? 'Marking Attendance...'
                  : `Mark Attendance + ${activeRingingTimer.overtimeHours}h Overtime Now`}
              </span>
            </button>

            {/* Snooze and Dismiss row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSnooze}
                className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Snooze (10 mins)</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop Alarm</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
