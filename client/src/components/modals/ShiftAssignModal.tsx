import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle, Users, Check } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { Employee } from '../../types';

interface ShiftAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
  defaultDate?: string;
}

export const ShiftAssignModal: React.FC<ShiftAssignModalProps> = ({
  isOpen,
  onClose,
  preselectedEmployeeId,
  defaultDate,
}) => {
  const { employees, assignShift, assignBulkShifts } = useAppData();

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(preselectedEmployeeId || employees[0]?.id || '');
  const [selectedBulkEmpIds, setSelectedBulkEmpIds] = useState<string[]>([]);
  const [shiftDate, setShiftDate] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeEmployees = employees.filter((e) => e.status === 'active');

  const toggleBulkEmployee = (id: string) => {
    setSelectedBulkEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBulkEmpIds.length === activeEmployees.length) {
      setSelectedBulkEmpIds([]);
    } else {
      setSelectedBulkEmpIds(activeEmployees.map((e) => e.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'single') {
        const emp = employees.find((e) => e.id === selectedEmpId);
        if (!emp) throw new Error('Please select an employee.');

        const res = await assignShift({
          shiftCode: `SHF-${Math.floor(1000 + Math.random() * 9000)}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          department: emp.department,
          shiftDate,
          scheduledStartTime: startTime,
          scheduledEndTime: endTime,
          breakDurationMinutes: Number(breakMinutes),
          totalWorkingHours: 8,
          regularHours: 8,
          overtimeHours: 0,
          shiftStatus: 'Scheduled',
          assignedBy: 'Admin / Manager',
          notes,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to assign shift');
          setSubmitting(false);
          return;
        }
      } else {
        if (selectedBulkEmpIds.length === 0) {
          setErrorMsg('Please select at least one employee for bulk shift assignment.');
          setSubmitting(false);
          return;
        }

        const res = await assignBulkShifts(selectedBulkEmpIds, {
          shiftCode: '',
          shiftDate,
          scheduledStartTime: startTime,
          scheduledEndTime: endTime,
          breakDurationMinutes: Number(breakMinutes),
          totalWorkingHours: 8,
          regularHours: 8,
          overtimeHours: 0,
          shiftStatus: 'Scheduled',
          assignedBy: 'Admin / Manager',
          notes,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to assign some shifts');
          setSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Assign New Shift</h3>
            <p className="text-xs text-slate-400">Schedule worker hours with automatic overlap check</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'single' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Single Employee
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'bulk' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Multiple Employees (Bulk)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'single' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Worker
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              >
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode}) – {emp.department}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Workers ({selectedBulkEmpIds.length} chosen)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  {selectedBulkEmpIds.length === activeEmployees.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                {activeEmployees.map((emp) => {
                  const isChecked = selectedBulkEmpIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleBulkEmployee(emp.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-brand-50 text-brand-900 font-medium' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>
                        {emp.fullName} <span className="text-slate-400">({emp.department})</span>
                      </span>
                      {isChecked && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shift Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Date</label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            />
          </div>

          {/* Timings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unpaid Break Duration (Minutes)
            </label>
            <select
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value={0}>0 mins (No break)</option>
              <option value={15}>15 mins</option>
              <option value={30}>30 mins (Standard lunch)</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins (1 hour)</option>
            </select>
          </div>

          {/* Shift Task Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shift Instructions / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Loading dock priority, forklift batch inspection"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors"
            >
              {submitting ? 'Assigning...' : 'Assign Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

