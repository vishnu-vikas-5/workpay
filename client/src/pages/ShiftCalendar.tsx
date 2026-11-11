import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Filter,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Shift, ShiftStatus } from '../types';
import { ShiftAssignModal } from '../components/modals/ShiftAssignModal';
import { getShiftStatusBadge, formatHours } from '../utils/utils';

export const ShiftCalendar: React.FC = () => {
  const { role, user } = useAuth();
  const { shifts, employees, departments, cancelShift } = useAppData();

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(
    role === 'employee' && user?.employeeId ? user.employeeId : 'all'
  );
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const canManage = role === 'admin' || role === 'manager';

  // Compute 7 days for the selected week
  const weekDays = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + currentWeekOffset * 7);

    // Get Monday of current week
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(baseDate.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [currentWeekOffset]);

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // If worker, only show their own
      if (role === 'employee' && user?.employeeId) {
        if (s.employeeId !== user.employeeId) return false;
      } else if (selectedEmployee !== 'all') {
        if (s.employeeId !== selectedEmployee) return false;
      }

      if (selectedDept !== 'all' && s.department !== selectedDept) return false;

      return true;
    });
  }, [shifts, selectedEmployee, selectedDept, role, user]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Shift Schedule & Rosters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign shift timings, enforce break allowances, and prevent overlapping schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs text-xs font-semibold">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Table
            </button>
          </div>

          {canManage && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Week Navigation & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h4 className="text-xs font-bold text-slate-800">
              {new Date(weekDays[0]).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              –{' '}
              {new Date(weekDays[6]).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h4>
            <span className="text-[10px] text-brand-600 font-semibold">
              {currentWeekOffset === 0 ? 'Current Week' : `${Math.abs(currentWeekOffset)} week(s) ${currentWeekOffset > 0 ? 'ahead' : 'ago'}`}
            </span>
          </div>
          <button
            onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {currentWeekOffset !== 0 && (
            <button
              onClick={() => setCurrentWeekOffset(0)}
              className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 underline ml-1"
            >
              Reset to Today
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {role !== 'employee' && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="all">All Workers ({employees.length})</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.employeeCode})
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Week Calendar Grid View */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 text-center bg-slate-50/80">
            {weekDays.map((dateStr) => {
              const d = new Date(dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              return (
                <div key={dateStr} className={`py-3 px-1 border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-brand-50/60' : ''}`}>
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-brand-600' : 'text-slate-800'}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 min-h-[460px] divide-x divide-slate-100">
            {weekDays.map((dateStr) => {
              const dayShifts = filteredShifts.filter((s) => s.shiftDate === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={dateStr}
                  className={`p-2 space-y-2 flex flex-col ${isToday ? 'bg-brand-50/10' : ''}`}
                >
                  {dayShifts.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300 text-[11px] py-12 italic">
                      No shifts
                    </div>
                  ) : (
                    dayShifts.map((shift) => {
                      const badgeClass = getShiftStatusBadge(shift.shiftStatus);
                      return (
                        <div
                          key={shift.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-xs hover:shadow-card transition-all text-xs group relative"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-slate-900 truncate">
                              {shift.employeeName}
                            </span>
                            {canManage && shift.shiftStatus === 'Scheduled' && (
                              <button
                                onClick={() => cancelShift(shift.id)}
                                title="Cancel Shift"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {shift.scheduledStartTime} – {shift.scheduledEndTime}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 truncate max-w-[80px]">
                              {shift.department}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${badgeClass}`}>
                              {shift.shiftStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Shift Code</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Scheduled Hours</th>
                  <th className="py-3 px-4">Actual Timings</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredShifts.map((s) => {
                  const badgeClass = getShiftStatusBadge(s.shiftStatus);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-medium text-brand-600">{s.shiftCode}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{s.employeeName}</p>
                        <p className="text-[11px] text-slate-400">{s.department}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{s.shiftDate}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {s.scheduledStartTime} – {s.scheduledEndTime} ({s.breakDurationMinutes}m break)
                      </td>
                      <td className="py-3 px-4">
                        {s.actualClockIn ? (
                          <span className="font-medium text-slate-800">
                            {s.actualClockIn} – {s.actualClockOut || 'Active now'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not clocked in</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
                          {s.shiftStatus}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          {s.shiftStatus === 'Scheduled' && (
                            <button
                              onClick={() => cancelShift(s.id)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      <ShiftAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};

