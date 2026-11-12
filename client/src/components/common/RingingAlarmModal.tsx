import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  VolumeX,
  UserCheck,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { alarmService, ActiveAlarm } from '../../services/alarmService';

export const RingingAlarmModal: React.FC = () => {
  const { markDailyAttendance, markAllAttendance, employees } = useAppData();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [isMarking, setIsMarking] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Check for ringing alarms
  useEffect(() => {
    const checkRinging = () => {
      const alarms = alarmService.getActiveAlarms();
      const ringing = alarms.find((a) => a.status === 'ringing');
      if (ringing && (!activeAlarm || activeAlarm.id !== ringing.id)) {
        setActiveAlarm(ringing);
      }
    };

    checkRinging();

    alarmService.onAlarmTrigger((alarm) => {
      setActiveAlarm(alarm);
    });

    const interval = setInterval(checkRinging, 1000);
    return () => clearInterval(interval);
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  // Handler for Overtime completion: Mark attendance with OT
  const handleMarkOvertimeAttendance = async () => {
    if (!activeAlarm.employeeId) return;
    setIsMarking(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await markDailyAttendance({
        employeeId: activeAlarm.employeeId,
        date: today,
        status: 'present',
        overtimeHours: activeAlarm.overtimeHours,
      });

      alarmService.dismissAlarm(activeAlarm.id);
      setSuccessNotice(
        `Recorded attendance with ${activeAlarm.overtimeHours}h OT for ${activeAlarm.employeeName}!`
      );
      setTimeout(() => {
        setSuccessNotice(null);
        setActiveAlarm(null);
      }, 1500);
    } catch (err: any) {
      console.warn('Error marking attendance from alarm:', err);
    } finally {
      setIsMarking(false);
    }
  };

  // Handler for Daily Shift End (e.g. 5:30 PM): Mark all workers present
  const handleMarkAllShiftEnd = async () => {
    setIsMarking(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await markAllAttendance(today, 'present');
      alarmService.dismissAlarm(activeAlarm.id);
      setSuccessNotice('Marked all employees present for today!');
      setTimeout(() => {
        setSuccessNotice(null);
        setActiveAlarm(null);
      }, 1500);
    } catch (err) {
      console.warn('Error marking all attendance:', err);
    } finally {
      setIsMarking(false);
    }
  };

  // Handler to extend OT by 1 hour when shift ends
  const handleAddOvertimeExtension = () => {
    alarmService.dismissAlarm(activeAlarm.id);
    const firstEmp = employees[0];
    if (firstEmp) {
      alarmService.createOvertimeAlarm({
        employeeId: firstEmp.id,
        employeeName: firstEmp.fullName,
        overtimeHours: 1.0,
        fromShiftEnd: true,
      });
    }
    setActiveAlarm(null);
  };

  const handleSnooze = () => {
    alarmService.snoozeAlarm(activeAlarm.id, 10);
    setActiveAlarm(null);
  };

  const handleDismiss = () => {
    alarmService.dismissAlarm(activeAlarm.id);
    setActiveAlarm(null);
  };

  const isShiftEnd = activeAlarm.type === 'shift_end';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-rose-500 p-5 sm:p-6 text-center space-y-4 animate-in zoom-in-95">
        {/* Animated Pulsing Alarm Bell */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/20">
          <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-40"></div>
          <Bell className="w-8 h-8 animate-bounce" />
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            {isShiftEnd ? '⏰ SHIFT END (5:30 PM)' : '⏰ OVERTIME FINISHED!'}
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-2">
            {isShiftEnd ? 'Daily Shift Completed' : activeAlarm.employeeName}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {isShiftEnd ? (
              <span>Regular shift has concluded. Please mark today&apos;s worker attendance.</span>
            ) : (
              <span>
                Completed <strong className="text-rose-600">{activeAlarm.overtimeHours} hour(s)</strong> overtime ({activeAlarm.durationMinutes} mins).
              </span>
            )}
          </p>
        </div>

        {successNotice ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {isShiftEnd ? (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllShiftEnd}
                  disabled={isMarking}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>{isMarking ? 'Marking Attendance...' : 'Mark All Workers Present Today'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddOvertimeExtension}
                  className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Worker Doing Overtime (+1 Hour OT)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleMarkOvertimeAttendance}
                disabled={isMarking}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isMarking
                    ? 'Recording...'
                    : `Mark Attendance + ${activeAlarm.overtimeHours}h Overtime Now`}
                </span>
              </button>
            )}

            {/* Snooze & Stop Row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSnooze}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Snooze (10 mins)</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
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
