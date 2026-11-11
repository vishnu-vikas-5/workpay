import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCheck,
  QrCode,
  Fingerprint,
  FileCheck,
  AlertCircle,
  Play,
  Square,
  Filter,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { formatHours } from '../utils/utils';

export const Attendance: React.FC = () => {
  const { role, user } = useAuth();
  const {
    employees,
    shifts,
    attendance,
    clockInEmployee,
    clockOutEmployee,
    markAttendanceAbsent,
  } = useAppData();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>(
    role === 'employee' && user?.employeeId ? user.employeeId : 'all'
  );
  const [clockInModalEmp, setClockInModalEmp] = useState<string | null>(null);
  const [clockOutModalAttId, setClockOutModalAttId] = useState<string | null>(null);
  const [clockTimeInput, setClockTimeInput] = useState<string>('09:00');
  const [breakMinutesInput, setBreakMinutesInput] = useState<number>(30);
  const [absentModalEmp, setAbsentModalEmp] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState<string>('');

  const canManage = role === 'admin' || role === 'manager';
  const canRecord = role === 'admin' || role === 'manager';

  // Filtered attendance for selected date & employee
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (role === 'employee' && user?.employeeId) {
        if (a.employeeId !== user.employeeId) return false;
      } else if (selectedEmployee !== 'all') {
        if (a.employeeId !== selectedEmployee) return false;
      }
      return a.date === selectedDate;
    });
  }, [attendance, selectedDate, selectedEmployee, role, user]);

  // Today's scheduled shifts to see who hasn't clocked in yet
  const scheduledForToday = useMemo(() => {
    return shifts.filter((s) => s.shiftDate === selectedDate && s.shiftStatus !== 'Cancelled');
  }, [shifts, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Attendance & Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time clock-in/out, biometric & QR badge-in, break deductions, and duration tallying
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Verification Modes Pill Banner (QR & Biometric Extensibility) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Verification Engine:
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
            <QrCode className="w-3.5 h-3.5" />
            QR Kiosk Ready
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1 border border-indigo-200">
            <Fingerprint className="w-3.5 h-3.5" />
            Biometric Sync
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            Supervisor Manual
          </span>
        </div>

        {role !== 'employee' && (
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Workers</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.employeeCode})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Scheduled Workers for Date with Quick Clock-In / Out Actions */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Scheduled Shifts for {selectedDate}
              </h3>
              <p className="text-xs text-slate-400">
                Clock in workers upon arrival to track exact hours
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
              {scheduledForToday.length} Workers Rostered
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledForToday.map((shift) => {
              const attRecord = attendance.find(
                (a) => a.shiftId === shift.id || (a.employeeId === shift.employeeId && a.date === shift.shiftDate)
              );
              const isClockedIn = !!attRecord?.clockInTime && attRecord.status !== 'absent';
              const isClockedOut = !!attRecord?.clockOutTime;

              return (
                <div
                  key={shift.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">{shift.employeeName}</span>
                      <span className="font-mono text-[10px] text-brand-600">{shift.shiftCode}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Scheduled: {shift.scheduledStartTime} – {shift.scheduledEndTime}
                    </p>
                    <div className="mt-1 text-[11px]">
                      {attRecord?.status === 'absent' ? (
                        <span className="text-rose-600 font-semibold">Marked Absent</span>
                      ) : isClockedOut ? (
                        <span className="text-emerald-700 font-semibold">
                          Completed: {attRecord?.clockInTime} – {attRecord?.clockOutTime} ({attRecord?.workingDurationHours}h)
                        </span>
                      ) : isClockedIn ? (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          Clocked in at {attRecord?.clockInTime}
                        </span>
                      ) : (
                        <span className="text-slate-400">Awaiting arrival</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2">
                    {!isClockedIn ? (
                      <>
                        <button
                          onClick={() => {
                            setClockInModalEmp(shift.employeeId);
                            setClockTimeInput(shift.scheduledStartTime || '09:00');
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Play className="w-3 h-3" />
                          <span>Clock In</span>
                        </button>
                        <button
                          onClick={() => setAbsentModalEmp(shift.employeeId)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"
                        >
                          Absent
                        </button>
                      </>
                    ) : !isClockedOut ? (
                      <button
                        onClick={() => {
                          setClockOutModalAttId(attRecord!.id);
                          setClockTimeInput(shift.scheduledEndTime || '17:00');
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Square className="w-3 h-3" />
                        <span>Clock Out & Calculate Hours</span>
                      </button>
                    ) : (
                      <div className="w-full text-center text-[11px] text-slate-400 py-0.5">
                        Shift Complete
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Attendance Log for {selectedDate}</h3>
          <span className="text-xs text-slate-400">{filteredAttendance.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Break Deduction</th>
                <th className="py-3 px-4">Net Working Hours</th>
                <th className="py-3 px-4">Overtime</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No attendance logs found for this date.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{att.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{att.department}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {att.clockInTime || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {att.clockOutTime || (
                        <span className="text-indigo-600 font-sans font-semibold">Active In Shift</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{att.breakDurationMinutes} mins</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatHours(att.workingDurationHours)}
                    </td>
                    <td className="py-3 px-4">
                      {att.overtimeHours > 0 ? (
                        <span className="font-bold text-amber-600">
                          +{formatHours(att.overtimeHours)}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                        {att.verificationMethod === 'qr_code' ? (
                          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        ) : att.verificationMethod === 'biometric' ? (
                          <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        {att.verificationMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          att.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clock In Modal */}
      {clockInModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Confirm Clock In</h3>
            <p className="text-xs text-slate-500 mb-4">Record arrival time for employee</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clock In Time (HH:mm)
                </label>
                <input
                  type="time"
                  value={clockTimeInput}
                  onChange={(e) => setClockTimeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setClockInModalEmp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await clockInEmployee(clockInModalEmp, undefined, clockTimeInput);
                  setClockInModalEmp(null);
                }}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Confirm Clock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out & Break Modal */}
      {clockOutModalAttId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Clock Out & Calculate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter departure time and deduct unpaid breaks
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clock Out Time (HH:mm)
                </label>
                <input
                  type="time"
                  value={clockTimeInput}
                  onChange={(e) => setClockTimeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unpaid Break Duration (Mins)
                </label>
                <select
                  value={breakMinutesInput}
                  onChange={(e) => setBreakMinutesInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={0}>0 minutes</option>
                  <option value={30}>30 minutes (Standard)</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (1 hr)</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setClockOutModalAttId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await clockOutEmployee(clockOutModalAttId, clockTimeInput, breakMinutesInput);
                  setClockOutModalAttId(null);
                }}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Calculate Hours & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Absent Modal */}
      {absentModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Mark Worker Absent</h3>
            <p className="text-xs text-slate-500 mb-4">Record reason for shift absence</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Absence Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Sick leave, Uninformed leave"
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAbsentModalEmp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await markAttendanceAbsent(absentModalEmp, selectedDate, undefined, absentReason);
                  setAbsentModalEmp(null);
                  setAbsentReason('');
                }}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Mark Absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
