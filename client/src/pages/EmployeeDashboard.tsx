import React, { useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  AlarmClockCheck,
  CreditCard,
  CheckCircle2,
  FileText,
  Building,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { StatCard } from '../components/common/StatCard';
import { formatINR, formatHours, maskAccountNumber, maskUpiId } from '../utils/utils';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';

interface EmployeeDashboardProps {
  onNavigate: (path: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { employees, shifts, attendance, overtimeRequests, payrollRecords, transactions } =
    useAppData();

  // Find the logged-in employee record
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === user?.employeeId || e.email === user?.email) || employees[0];
  }, [employees, user]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Employee-scoped datasets (strictly isolated to prevent seeing others' data!)
  const myShifts = useMemo(() => {
    return shifts.filter((s) => s.employeeId === currentEmployee.id);
  }, [shifts, currentEmployee]);

  const myTodayShift = useMemo(() => {
    return myShifts.find((s) => s.shiftDate === todayStr);
  }, [myShifts, todayStr]);

  const myAttendance = useMemo(() => {
    return attendance.filter((a) => a.employeeId === currentEmployee.id);
  }, [attendance, currentEmployee]);

  const myOvertime = useMemo(() => {
    return overtimeRequests.filter((o) => o.employeeId === currentEmployee.id);
  }, [overtimeRequests, currentEmployee]);

  const myPayrolls = useMemo(() => {
    return payrollRecords.filter((p) => p.employeeId === currentEmployee.id);
  }, [payrollRecords, currentEmployee]);

  const myTransactions = useMemo(() => {
    return transactions.filter((t) => t.employeeId === currentEmployee.id);
  }, [transactions, currentEmployee]);

  // Aggregate stats
  const totalHoursWorked = myShifts.reduce((sum, s) => sum + (s.totalWorkingHours || 0), 0);
  const totalApprovedOT = myOvertime
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + (o.adjustedOvertimeHours ?? o.overtimeHours ?? 0), 0);

  const totalEarningsReceived = myTransactions
    .filter((t) => t.status === 'Successful')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingWages = myPayrolls
    .filter((p) => p.paymentStatus === 'unpaid')
    .reduce((sum, p) => sum + p.totalPayable, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-700 to-indigo-600 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
            Worker Self-Service Portal
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {currentEmployee.fullName}!
          </h1>
          <p className="text-xs text-indigo-100">
            {currentEmployee.designation} • {currentEmployee.department} ({currentEmployee.employeeCode})
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-right shrink-0">
          <p className="text-[11px] text-indigo-200">Hourly Wage Rate</p>
          <p className="text-xl font-bold text-white">{formatINR(currentEmployee.hourlyWage)}/hr</p>
          <p className="text-[10px] text-amber-300">
            {currentEmployee.overtimeMultiplier}x Overtime Rate ({formatINR(currentEmployee.hourlyWage * currentEmployee.overtimeMultiplier)}/hr)
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Hours Worked"
          value={formatHours(totalHoursWorked)}
          subtitle="All completed shifts"
          icon={Clock}
          colorScheme="indigo"
        />

        <StatCard
          title="Approved Overtime"
          value={formatHours(totalApprovedOT)}
          subtitle="Verified by supervisor"
          icon={AlarmClockCheck}
          colorScheme="amber"
        />

        <StatCard
          title="Total Wages Received"
          value={formatINR(totalEarningsReceived)}
          subtitle="Settled via RazorpayX"
          icon={CheckCircle2}
          colorScheme="emerald"
        />

        <StatCard
          title="Pending Disbursal"
          value={formatINR(pendingWages)}
          subtitle="Processed in next cycle"
          icon={CreditCard}
          colorScheme="sky"
        />
      </div>

      {/* Today's Shift & Attendance Callout */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Today's Shift Assignment</h3>
          <span className="text-xs text-slate-400">{todayStr}</span>
        </div>

        {myTodayShift ? (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {myTodayShift.scheduledStartTime} – {myTodayShift.scheduledEndTime}
                </span>
                <span className="text-xs font-mono text-brand-600 font-medium">
                  ({myTodayShift.shiftCode})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Break Duration: {myTodayShift.breakDurationMinutes} mins • Assigned by: {myTodayShift.assignedBy}
              </p>
              {myTodayShift.notes && (
                <p className="text-xs text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded inline-block mt-1">
                  Note: {myTodayShift.notes}
                </p>
              )}
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  myTodayShift.shiftStatus === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                Status: {myTodayShift.shiftStatus}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No active shift rostered for today. Enjoy your rest day!
          </div>
        )}
      </div>

      {/* Grid: Upcoming Shifts & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Shifts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">My Shift Schedule</h3>
            <button
              onClick={() => onNavigate('/shifts')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Full Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myShifts.slice(0, 5).map((shift) => (
              <div key={shift.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">
                    {new Date(shift.shiftDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-slate-400">
                    {shift.scheduledStartTime} – {shift.scheduledEndTime}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700">{shift.totalWorkingHours} hrs</span>
                  <span className="block text-[10px] text-slate-400">{shift.shiftStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payout History & Download Slip */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Salary Disbursements</h3>
            <button
              onClick={() => onNavigate('/employee-payments')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>All Payslips</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myTransactions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No payment disbursements recorded yet.
              </div>
            ) : (
              myTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{formatINR(tx.amount)}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      UTR: {tx.providerReferenceId || 'WP-UTR'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Settled
                    </span>
                    <button
                      onClick={() => generatePaymentReceiptPDF(tx, myPayrolls[0], currentEmployee)}
                      title="Download Payslip"
                      className="p-1.5 rounded-lg bg-slate-50 text-brand-600 hover:bg-brand-50"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

