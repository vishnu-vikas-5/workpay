import React, { useState, useEffect } from 'react';
import { Clock, Bell } from 'lucide-react';
import { alarmService, OvertimeTimer } from '../../services/alarmService';

interface ActiveAlarmPillProps {
  onOpenModal: () => void;
}

export const ActiveAlarmPill: React.FC<ActiveAlarmPillProps> = ({ onOpenModal }) => {
  const [timers, setTimers] = useState<OvertimeTimer[]>(alarmService.getOvertimeTimers());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      setTimers(alarmService.getOvertimeTimers());
    };

    alarmService.onTimersUpdate(update);
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const runningTimers = timers.filter((t) => t.status === 'running');
  if (runningTimers.length === 0) return null;

  // Show the timer closest to expiry
  const closest = runningTimers.sort((a, b) => a.targetEndTime - b.targetEndTime)[0];
  const msLeft = Math.max(0, closest.targetEndTime - now);
  const totalSec = Math.floor(msLeft / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const timeFormatted = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-2 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-2 text-xs font-bold transition-all transform hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="relative">
        <Clock className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '4s' }} />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping" />
      </div>
      <div className="text-left font-mono">
        <span className="block text-[10px] font-sans font-medium opacity-90">
          OT: {closest.employeeName}
        </span>
        <span>{timeFormatted} left</span>
      </div>
    </button>
  );
};
