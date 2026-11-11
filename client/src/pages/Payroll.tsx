import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Filter,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { PayrollRecord, PayrollPeriodType } from '../types';
import { formatINR, formatHours } from '../utils/utils';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

interface PayrollProps {
  onNavigateToPayment: (payrollId?: string) => void;
}

export const Payroll: React.FC<PayrollProps> = ({ onNavigateToPayment }) => {
  const { role } = useAuth();
  const {
    payrollRecords,
    generatePayroll,
    approvePayrollRecord,
    employees,
  } = useAppData();

  const [periodType, setPeriodType] = useState<PayrollPeriodType>('weekly');
  const [startDate, setStartDate] = useState<string>('2026-11-03');
  const [endDate, setEndDate] = useState<string>('2026-11-10');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const isAdmin = role === 'admin';

  const totalUnpaidPayable = useMemo(() => {
    return payrollRecords
      .filter((p) => p.paymentStatus === 'unpaid')
      .reduce((sum, p) => sum + p.totalPayable, 0);
  }, [payrollRecords]);

  const totalDisbursed = useMemo(() => {
    return payrollRecords
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + p.totalPayable, 0);
  }, [payrollRecords]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await generatePayroll(periodType, startDate, endDate);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = payrollRecords.map((p) => ({
      'Payroll ID': p.id,
      'Employee Code': p.employeeCode,
      'Employee Name': p.employeeName,
      'Department': p.department,
      'Period': `${p.periodStartDate} to ${p.periodEndDate} (${p.periodType})`,
      'Shifts': p.totalShifts,
      'Regular Hours': p.regularHours,
      'Regular Wages (INR)': p.regularWages,
      'Overtime Hours': p.overtimeHours,
      'Overtime Wages (INR)': p.overtimeWages,
      'Bonuses': p.bonuses,
      'Deductions': p.deductions,
      'Total Net Payable (INR)': p.totalPayable,
      'Approval Status': p.approvalStatus,
      'Payment Status': p.paymentStatus,
    }));

    if (type === 'xlsx') {
      exportToExcel(data, `WorkPay_Payroll_${new Date().toISOString().split('T')[0]}`);
    } else {
      exportToCSV(data, `WorkPay_Payroll_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Payroll Calculation & Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile completed shifts, approved overtime, statutory deductions and prepare RazorpayX payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <span className="text-slate-200">|</span>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              CSV
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => onNavigateToPayment()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Disburse Payouts ({payrollRecords.filter((p) => p.paymentStatus === 'unpaid').length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Unpaid Salary Queue</p>
            <h4 className="text-2xl font-bold text-amber-600 mt-1">{formatINR(totalUnpaidPayable)}</h4>
            <span className="text-[11px] text-slate-400">Ready for instant payout</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Settled Payroll</p>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalDisbursed)}</h4>
            <span className="text-[11px] text-slate-400">Disbursed via RazorpayX</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Duplicate Prevention</p>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Idempotency Locked</h4>
            <span className="text-[11px] text-slate-400">Payroll cycles cannot be paid twice</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Payroll Generator Form (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Generate New Payroll Cycle
            </h3>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Period Cycle
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PayrollPeriodType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="daily">Daily Settlement</option>
                <option value="weekly">Weekly Cycle</option>
                <option value="monthly">Monthly Salary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>{isGenerating ? 'Calculating...' : 'Run Payroll Engine'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payroll Records Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Payroll Calculation Records</h3>
          <span className="text-xs text-slate-400">{payrollRecords.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Payroll ID</th>
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">Cycle Period</th>
                <th className="py-3 px-4">Regular Wages</th>
                <th className="py-3 px-4">Approved OT Wages</th>
                <th className="py-3 px-4">Net Payable</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {payrollRecords.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-brand-600">{p.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{p.employeeName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{p.employeeCode}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">
                      {p.periodStartDate} – {p.periodEndDate}
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">
                      {p.totalShifts} shifts ({p.periodType})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{formatINR(p.regularWages)}</span>
                    <span className="block text-[10px] text-slate-400">({p.regularHours} hrs)</span>
                  </td>
                  <td className="py-3 px-4">
                    {p.overtimeHours > 0 ? (
                      <div>
                        <span className="font-bold text-amber-600">{formatINR(p.overtimeWages)}</span>
                        <span className="block text-[10px] text-slate-400">
                          ({p.overtimeHours}h approved)
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">₹0</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatINR(p.totalPayable)}
                    </span>
                    {(p.bonuses > 0 || p.deductions > 0) && (
                      <span className="block text-[10px] text-slate-400">
                        +{formatINR(p.bonuses)} / -{formatINR(p.deductions)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.paymentStatus === 'processing'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {p.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.paymentStatus === 'unpaid' && isAdmin ? (
                      <button
                        onClick={() => onNavigateToPayment(p.id)}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedRecord(p)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        View Breakdown
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Payroll Breakdown</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-900">{selectedRecord.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cycle:</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.periodStartDate} to {selectedRecord.periodEndDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regular Shift Wages:</span>
                  <span className="font-medium text-slate-800">
                    {formatINR(selectedRecord.regularWages)} ({selectedRecord.regularHours}h)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Overtime Wages:</span>
                  <span className="font-bold text-amber-600">
                    {formatINR(selectedRecord.overtimeWages)} ({selectedRecord.overtimeHours}h)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Incentives / Bonuses:</span>
                  <span className="font-medium text-emerald-600">
                    +{formatINR(selectedRecord.bonuses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statutory Deductions:</span>
                  <span className="font-medium text-rose-600">
                    -{formatINR(selectedRecord.deductions)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold">
                  <span>Net Disbursable:</span>
                  <span className="text-brand-600">{formatINR(selectedRecord.totalPayable)}</span>
                </div>
              </div>

              {selectedRecord.paymentTransactionId && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Transaction ID: </span>
                  <span className="font-mono">{selectedRecord.paymentTransactionId}</span>
                </div>
              )}
            </div>

            <div className="mt-5">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

