import React, { useState, useMemo } from 'react';
import {
  AlarmClockCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { OvertimeRequest } from '../types';
import { formatINR, formatHours } from '../utils/utils';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

export const Overtime: React.FC = () => {
  const { role } = useAuth();
  const { overtimeRequests, approveOvertime, rejectOvertime } = useAppData();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [adjustingOt, setAdjustingOt] = useState<OvertimeRequest | null>(null);
  const [adjustedHoursInput, setAdjustedHoursInput] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const canApprove = role === 'admin' || role === 'manager';

  const filteredRequests = useMemo(() => {
    return overtimeRequests.filter((ot) => {
      const matchSearch =
        ot.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        ot.department.toLowerCase().includes(search.toLowerCase()) ||
        ot.date.includes(search);
      const matchStatus = selectedStatus === 'all' || ot.status === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [overtimeRequests, search, selectedStatus]);

  const pendingCount = overtimeRequests.filter((o) => o.status === 'pending').length;
  const approvedTotalWage = overtimeRequests
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + (o.adjustedOvertimeWage ?? o.calculatedOvertimeWage), 0);

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredRequests.map((o) => ({
      'Request ID': o.id,
      'Worker': o.employeeName,
      'Department': o.department,
      'Shift Date': o.date,
      'Standard Shift': `${o.scheduledHours} hrs`,
      'Actual Worked': `${o.actualHours} hrs`,
      'Overtime Hours': o.adjustedOvertimeHours ?? o.overtimeHours,
      'Base Hourly Wage': o.hourlyWage,
      'OT Multiplier': `${o.overtimeMultiplier}x`,
      'Payable OT Wage': o.adjustedOvertimeWage ?? o.calculatedOvertimeWage,
      'Status': o.status,
      'Approved By': o.approvedBy || 'N/A',
      'Reason': o.reason || 'Standard Overtime',
    }));

    if (type === 'xlsx') {
      exportToExcel(data, `WorkPay_Overtime_${new Date().toISOString().split('T')[0]}`);
    } else {
      exportToCSV(data, `WorkPay_Overtime_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Overtime Wage Calculation & Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforces policy: Overtime is never payable until reviewed and approved by management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <span className="text-slate-200">|</span>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Awaiting Approval</p>
            <h4 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount} Requests</h4>
            <span className="text-[11px] text-slate-400">Action needed before payroll</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlarmClockCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Approved OT Wages</p>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(approvedTotalWage)}</h4>
            <span className="text-[11px] text-slate-400">Ready for payroll disbursement</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Statutory Rule Engine</p>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Multiplier: 1.5x / 2.0x</h4>
            <span className="text-[11px] text-slate-400">Audit-logged manual adjustments</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Overtime Policy Info Callout (Per Shift Rate ÷ 8 spec) */}
      <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <p className="font-bold text-indigo-950 mb-0.5">Shift & Overtime Wage Formulation:</p>
          <p>
            <span className="font-semibold">Standard Shift</span>: 8 hours (paid at employee's Shift Rate).{' '}
            <span className="font-semibold">Overtime Rate</span> = <span className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">Shift Rate ÷ 8 per hour</span>.{' '}
            <span className="font-semibold">Overtime Wages</span> = Overtime Hours × (Shift Rate ÷ 8).{' '}
            <span className="text-indigo-800 font-semibold underline">
              Overtime is reviewed and approved before disbursement via worker UPI ID.
            </span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worker, department, date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Statuses ({overtimeRequests.length})</option>
            <option value="pending">Pending Approval ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Overtime Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Worker & Department</th>
                <th className="py-3 px-4">Shift Date</th>
                <th className="py-3 px-4">Actual / Std Hours</th>
                <th className="py-3 px-4">OT Hours</th>
                <th className="py-3 px-4">OT Rate & Wage</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                {canApprove && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No overtime requests found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((ot) => {
                  const effectiveHours = ot.adjustedOvertimeHours ?? ot.overtimeHours;
                  const effectiveWage = ot.adjustedOvertimeWage ?? ot.calculatedOvertimeWage;
                  const otRate = ot.hourlyWage * ot.overtimeMultiplier;

                  return (
                    <tr key={ot.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{ot.employeeName}</p>
                        <p className="text-[11px] text-slate-400">{ot.department}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{ot.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{ot.actualHours} hrs</span>
                        <span className="text-slate-400 text-[11px]"> / {ot.scheduledHours}h standard</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          +{effectiveHours} hrs
                        </span>
                        {ot.adjustedOvertimeHours !== undefined &&
                          ot.adjustedOvertimeHours !== ot.overtimeHours && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              (Adjusted from {ot.overtimeHours}h)
                            </span>
                          )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{formatINR(effectiveWage)}</p>
                        <span className="text-[10px] text-slate-400">
                          {formatINR(otRate)}/hr ({ot.overtimeMultiplier}x)
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600">{ot.reason || 'Shift Overtime'}</p>
                        {ot.approvalNotes && (
                          <p className="text-[10px] text-brand-600 mt-0.5 italic">
                            Admin: {ot.approvalNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            ot.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ot.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {ot.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Approval Actions */}
                      {canApprove && (
                        <td className="py-3 px-4 text-right">
                          {ot.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveOvertime(ot.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustingOt(ot);
                                  setAdjustedHoursInput(ot.overtimeHours);
                                  setAdjustNotes('');
                                }}
                                title="Adjust hours with audit log"
                                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectOvertime(ot.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {ot.approvedBy ? `Reviewed by ${ot.approvedBy.split(' ')[0]}` : 'Finalized'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Overtime Modal */}
      {adjustingOt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Adjust & Approve Overtime Hours
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All adjustments are recorded in the immutable audit log with administrator notes
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjusted Hours (Recorded: {adjustingOt.overtimeHours}h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="12"
                  value={adjustedHoursInput}
                  onChange={(e) => setAdjustedHoursInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Audit Log Justification Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deducted 30m idle wait time; adjusted to 2.0h net"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAdjustingOt(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await approveOvertime(adjustingOt.id, adjustNotes, adjustedHoursInput);
                  setAdjustingOt(null);
                }}
                className="px-4 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Save Adjustment & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

