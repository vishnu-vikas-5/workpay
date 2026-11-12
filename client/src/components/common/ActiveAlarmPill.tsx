import React, { useState, useEffect } from 'react';
import { Clock, Bell } from 'lucide-react';
import { alarmService, ActiveAlarm } from '../../services/alarmService';

interface ActiveAlarmPillProps {
  onOpenModal: () => void;
}

export const ActiveAlarmPill: React.FC<ActiveAlarmPillProps> = ({ onOpenModal }) => {
  const [alarms, setAlarms] = useState<ActiveAlarm[]>(alarmService.getActiveAlarms());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      setAlarms(alarmService.getActiveAlarms());
    };

    alarmService.onAlarmsUpdate(update);
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const runningAlarms = alarms.filter((a) => a.status === 'running');
  if (runningAlarms.length === 0) return null;

  // Closest alarm to expiry
  const closest = runningAlarms.sort((a, b) => a.targetEndTime - b.targetEndTime)[0];
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
      className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-2 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center gap-2.5 text-xs font-bold transition-all transform hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2 border border-white/20"
      title="View Active Alarms"
    >
      <div className="relative">
        <Clock className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '4s' }} />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping" />
      </div>
      <div className="text-left font-mono">
        <span className="block text-[10px] font-sans font-semibold opacity-90 truncate max-w-[120px]">
          OT: {closest.employeeName}
        </span>
        <span className="text-xs font-extrabold">{timeFormatted} left</span>
      </div>
    </button>
  );
};
