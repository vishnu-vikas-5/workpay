import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  QrCode,
  FileText,
  UserCheck,
  Zap,
  Users,
  Smartphone,
  Check,
  HandCoins,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { Employee, Attendance, PaymentTransaction } from '../../types';
import { formatINR } from '../../utils/utils';
import { UpiQrModal } from './UpiQrModal';
import { LendMoneyModal } from '../modals/LendMoneyModal';
import { OvertimeAlarmModal } from '../modals/OvertimeAlarmModal';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../../utils/upiUtils';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';
import { GooglePayLogo, PhonePeLogo, PaytmLogo } from './PaymentBrandIcons';

// Helper to get Monday of current week
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
}

function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export const AttendanceSection: React.FC = () => {
  const {
    employees,
    attendance,
    markDailyAttendance,
    markAllAttendance,
    settleWeeklyAttendance,
    recordQuickPayment,
    refreshAll,
    cleanDuplicateData,
  } = useAppData();

  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatDateISO(new Date()));
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // Live color feedback toast
  const [feedbackToast, setFeedbackToast] = useState<{
    workerName: string;
    status: 'present' | 'half-day' | 'absent';
    amount?: number;
  } | null>(null);

  const triggerFeedback = (workerName: string, status: 'present' | 'half-day' | 'absent', amount?: number) => {
    setFeedbackToast({ workerName, status, amount });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Payment modal state
  const [payingWorkerData, setPayingWorkerData] = useState<{
    employee: Employee;
    totalPayable: number;
    shiftsCount: number;
    overtimeHours: number;
    shiftPay: number;
    overtimePay: number;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [weeklyDeductAdvance, setWeeklyDeductAdvance] = useState<boolean>(false);
  const [weeklyDeductionAmount, setWeeklyDeductionAmount] = useState<string | number>('');
  const [lendModalEmpId, setLendModalEmpId] = useState<string | null>(null);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false);
  const [alarmTargetEmpId, setAlarmTargetEmpId] = useState<string | undefined>(undefined);
  const [payoutSuccess, setPayoutSuccess] = useState<{
    employeeName: string;
    amount: number;
    utr: string;
    tx: PaymentTransaction;
  } | null>(null);

  // Compute 7 days for the current week with attendance counts
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const iso = formatDateISO(d);
      const isToday = iso === formatDateISO(new Date());
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayNumber = d.getDate();

      const dayRecords = attendance.filter((a) => a.date === iso);
      const hasRecords = dayRecords.length > 0;
      const presentCount = dayRecords.filter((a) => a.status === 'present').length;
      const halfDayCount = dayRecords.filter((a) => a.status === 'half-day').length;
      const absentCount = dayRecords.filter((a) => a.status === 'absent').length;

      return {
        date: d,
        iso,
        isToday,
        dayName,
        dayNumber,
        hasRecords,
        presentCount,
        halfDayCount,
        absentCount,
      };
    });
  }, [currentMonday, attendance]);

  const weekStartDate = weekDays[0].iso;
  const weekEndDate = weekDays[6].iso;

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
    setSelectedDateStr(formatDateISO(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
    setSelectedDateStr(formatDateISO(next));
  };

  // Weekly aggregated earnings for each employee
  const weeklyWorkerSummary = useMemo(() => {
    return employees.map((emp) => {
      const shiftRate = emp.shiftRate || emp.hourlyWage * 8 || 800;
      const hourlyOtRate = Math.round((shiftRate / 8) * 100) / 100;

      // Filter attendance records for this employee during the selected week
      const records = attendance.filter(
        (a) => a.employeeId === emp.id && a.date >= weekStartDate && a.date <= weekEndDate
      );

      let totalShifts = 0;
      let totalOvertimeHours = 0;
      let isFullyPaid = records.length > 0;
      let lastTxId = '';

      records.forEach((r) => {
        if (r.status === 'present') totalShifts += 1;
        else if (r.status === 'half-day') totalShifts += 0.5;

        totalOvertimeHours = Math.round((totalOvertimeHours + (r.overtimeHours || 0)) * 100) / 100;
        if (!r.isPaid) isFullyPaid = false;
        if (r.paidTransactionId) lastTxId = r.paidTransactionId;
      });

      const shiftPay = Math.round(totalShifts * shiftRate * 100) / 100;
      const overtimePay = Math.round(totalOvertimeHours * hourlyOtRate * 100) / 100;
      const totalPayable = Math.round((shiftPay + overtimePay) * 100) / 100;

      return {
        employee: emp,
        shiftRate,
        hourlyOtRate,
        totalShifts,
        totalOvertimeHours,
        shiftPay,
        overtimePay,
        totalPayable,
        recordsCount: records.length,
        isFullyPaid: records.length > 0 && isFullyPaid && totalPayable > 0,
        lastTxId,
      };
    });
  }, [employees, attendance, weekStartDate, weekEndDate]);

  // Advance loan deduction for weekly payout
  const workerAdvanceBal = payingWorkerData?.employee.advanceBalance || 0;
  const grossWeeklyPay = payingWorkerData ? Math.round((payingWorkerData.shiftPay + payingWorkerData.overtimePay) * 100) / 100 : 0;
  const parsedDeduction = typeof weeklyDeductionAmount === 'string' ? (parseFloat(weeklyDeductionAmount) || 0) : weeklyDeductionAmount;
  const actualWeeklyDeduction = weeklyDeductAdvance ? Math.min(parsedDeduction, grossWeeklyPay, workerAdvanceBal) : 0;
  const netWeeklyPayable = Math.max(0, Math.round((grossWeeklyPay - actualWeeklyDeduction) * 100) / 100);

  // UPI intent URI for paying worker
  const payingUpiDetails = useMemo(() => {
    if (!payingWorkerData) return null;
    const payeeAddress = payingWorkerData.employee.upiId || `${payingWorkerData.employee.phone}@upi`;
    const noteSuffix = actualWeeklyDeduction > 0 ? ` (Less Adv: ₹${actualWeeklyDeduction})` : '';
    const uri = generateUpiIntentUri({
      payeeAddress,
      payeeName: payingWorkerData.employee.fullName,
      amount: netWeeklyPayable,
      transactionNote: `Weekly wages (${payingWorkerData.startDate} to ${payingWorkerData.endDate})${noteSuffix} - ${payingWorkerData.employee.fullName}`,
      transactionRef: `WP-WK-${Date.now().toString().slice(-6)}`,
    });
    return {
      uri,
      links: getAppSpecificUpiLinks(uri),
      payeeAddress,
    };
  }, [payingWorkerData, netWeeklyPayable, actualWeeklyDeduction]);

  // Execute payment for weekly wages
  const handleConfirmWeeklyPayment = async () => {
    if (!payingWorkerData) return;

    const tx = await recordQuickPayment({
      employee: payingWorkerData.employee,
      shiftsCount: payingWorkerData.shiftsCount,
      shiftRate: payingWorkerData.employee.shiftRate || 800,
      overtimeHours: payingWorkerData.overtimeHours,
      overtimeRate: Math.round(((payingWorkerData.employee.shiftRate || 800) / 8) * 100) / 100,
      shiftPay: payingWorkerData.shiftPay,
      overtimePay: payingWorkerData.overtimePay,
      totalPayable: netWeeklyPayable,
      advanceDeducted: actualWeeklyDeduction,
      paymentMethod: 'upi_intent_manual',
    });

    // Mark attendance records as paid and update advance balance
    await settleWeeklyAttendance({
      employeeId: payingWorkerData.employee.id,
      startDate: payingWorkerData.startDate,
      endDate: payingWorkerData.endDate,
      transactionId: tx.id,
      advanceDeducted: actualWeeklyDeduction,
    });

    setPayoutSuccess({
      employeeName: payingWorkerData.employee.fullName,
      amount: netWeeklyPayable,
      utr: tx.providerReferenceId || tx.id,
      tx,
    });

    setWeeklyDeductAdvance(false);
    setWeeklyDeductionAmount('');
    setPayingWorkerData(null);
    setIsQrOpen(false);
    await refreshAll();
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-sand-300/80 shadow-[0_10px_30px_rgba(183,176,158,0.25)] p-3.5 sm:p-6 space-y-4 sm:space-y-5">
      {/* Top Banner & Week Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60 mb-1">
            <CalendarDays className="w-3 h-3 text-emerald-600" />
            <span>Attendance & Weekly Payroll</span>
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
            Daily Attendance & Weekly Payout
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Mark daily worker attendance & OT; settle wages directly via UPI at week end.
          </p>
        </div>

        {/* View Toggle & Week Navigator */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          {/* Week switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={handlePrevWeek}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="px-1.5 font-mono text-[10px] sm:text-[11px] text-slate-700 whitespace-nowrap">
              {weekDays[0].dayNumber} {weekDays[0].date.toLocaleDateString('en-IN', { month: 'short' })} –{' '}
              {weekDays[6].dayNumber} {weekDays[6].date.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                activeTab === 'daily'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                activeTab === 'weekly'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weekly Pay
            </button>
          </div>

          {/* Overtime Alarm & Reminder Action Button */}
          <button
            onClick={() => {
              setAlarmTargetEmpId(undefined);
              setIsAlarmModalOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-900 border border-amber-300/80 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Set Overtime Alarm or Daily Reminder"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            <span>OT Alarm</span>
          </button>
        </div>
      </div>

      {/* Week Days Tabs (Monday - Sunday) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((d) => {
          const isSelected = selectedDateStr === d.iso;
          return (
            <button
              key={d.iso}
              onClick={() => {
                setSelectedDateStr(d.iso);
                setActiveTab('daily');
              }}
              className={`py-1.5 px-0.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all border relative ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md ring-2 ring-brand-400/40'
                  : d.isToday
                  ? 'bg-brand-50 text-brand-800 border-brand-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
              }`}
            >
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase">{d.dayName}</span>
              <span className="text-xs sm:text-sm font-extrabold">{d.dayNumber}</span>
              {d.hasRecords ? (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {d.presentCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" title={`${d.presentCount} Present`} />
                  )}
                  {d.halfDayCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-xs" title={`${d.halfDayCount} Half-day`} />
                  )}
                  {d.absentCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" title={`${d.absentCount} Absent`} />
                  )}
                </div>
              ) : d.isToday ? (
                <span
                  className={`text-[7px] sm:text-[8px] font-bold px-1 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-brand-200 text-brand-800'
                  }`}
                >
                  TODAY
                </span>
              ) : (
                <span className="text-[8px] text-slate-300 mt-0.5">•</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live Color Feedback Toast Banner */}
      {feedbackToast && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedbackToast.status === 'present'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : feedbackToast.status === 'half-day'
              ? 'bg-sky-50 text-sky-900 border-sky-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.status === 'present' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {feedbackToast.status === 'half-day' && <Clock className="w-4 h-4 text-sky-600" />}
            {feedbackToast.status === 'absent' && <XCircle className="w-4 h-4 text-rose-600" />}
            <span>
              {feedbackToast.status === 'present'
                ? `✓ Marked Present for ${feedbackToast.workerName}`
                : feedbackToast.status === 'half-day'
                ? `⚡ Marked Half-Day for ${feedbackToast.workerName}`
                : `✕ Marked Absent for ${feedbackToast.workerName}`}
            </span>
          </div>
          {feedbackToast.amount !== undefined && (
            <span className="font-extrabold px-2 py-0.5 bg-white rounded-lg shadow-xs border border-current text-[11px]">
              Earned: {formatINR(feedbackToast.amount)}
            </span>
          )}
        </div>
      )}

      {/* Mode 1: Daily Attendance Marking */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-900">
                Marking Attendance for:{' '}
                <span className="text-brand-700 font-mono">
                  {new Date(selectedDateStr).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
              <p className="text-[11px] text-slate-500">
                Select Present (1 shift), Half-Day (0.5), or Absent, and specify daily overtime hours.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await cleanDuplicateData();
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors"
                title="Remove duplicate attendance and dummy records"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Remove Duplicates</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await markAllAttendance(selectedDateStr, 'present');
                  triggerFeedback('All Active Workers', 'present');
                }}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>

          {/* Workers Attendance List */}
          <div className="space-y-3">
            {employees.map((emp) => {
              const currentAtt = attendance.find(
                (a) => a.employeeId === emp.id && a.date === selectedDateStr
              );
              const isMarked = !!currentAtt;
              const status: 'present' | 'absent' | 'half-day' | 'unmarked' = isMarked
                ? (currentAtt.status === 'half-day' || currentAtt.status === 'absent' ? currentAtt.status : 'present')
                : 'unmarked';
              const otHours = currentAtt?.overtimeHours || 0;
              const shiftRate = emp.shiftRate || emp.hourlyWage * 8 || 800;
              const hourlyOtRate = Math.round((shiftRate / 8) * 100) / 100;

              const shiftsCount = status === 'present' ? 1 : status === 'half-day' ? 0.5 : 0;
              const dailyPay = Math.round((shiftsCount * shiftRate + otHours * hourlyOtRate) * 100) / 100;

              // Distinctive card color styling based on attendance status
              const cardBgStyle =
                status === 'present'
                  ? 'bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white border-2 border-emerald-400 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-400/20'
                  : status === 'half-day'
                  ? 'bg-gradient-to-r from-sky-50/90 via-sky-50/40 to-white border-2 border-sky-400 shadow-sm shadow-sky-500/10 ring-1 ring-sky-400/20'
                  : status === 'absent'
                  ? 'bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white border-2 border-rose-300 shadow-sm shadow-rose-500/10 ring-1 ring-rose-400/20'
                  : 'bg-white border-2 border-dashed border-slate-300 hover:border-slate-400';

              const avatarBg =
                status === 'present'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                  : status === 'half-day'
                  ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                  : status === 'absent'
                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                  : 'bg-slate-400 text-white';

              return (
                <div
                  key={emp.id}
                  className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${cardBgStyle}`}
                >
                  {/* Worker Name, Badge & Rates */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 transition-colors ${avatarBg}`}>
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm truncate">{emp.fullName}</p>
                        {/* Live Color Status Badge */}
                        {status === 'present' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Present (1 Shift)</span>
                          </span>
                        )}
                        {status === 'half-day' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold border border-sky-300">
                            <Clock className="w-3 h-3 text-sky-600" />
                            <span>Half-Day (0.5)</span>
                          </span>
                        )}
                        {status === 'absent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Absent</span>
                          </span>
                        )}
                        {status === 'unmarked' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            <span>Unmarked</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                        <span className="font-mono text-slate-500">{emp.phone}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-brand-100">
                          {emp.upiId}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-700">{formatINR(shiftRate)}/shift</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Status Buttons with Color Highlights */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          markDailyAttendance({
                            employeeId: emp.id,
                            date: selectedDateStr,
                            status: 'present',
                            overtimeHours: otHours,
                          });
                          triggerFeedback(emp.fullName, 'present', shiftRate + otHours * hourlyOtRate);
                        }}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold scale-[1.03]'
                            : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {status === 'present' && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>Present (1)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          markDailyAttendance({
                            employeeId: emp.id,
                            date: selectedDateStr,
                            status: 'half-day',
                            overtimeHours: otHours,
                          });
                          triggerFeedback(emp.fullName, 'half-day', Math.round(shiftRate * 0.5 + otHours * hourlyOtRate));
                        }}
                        className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                          status === 'half-day'
                            ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400 font-extrabold scale-[1.03]'
                            : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                        }`}
                      >
                        {status === 'half-day' && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>Half (0.5)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          markDailyAttendance({
                            employeeId: emp.id,
                            date: selectedDateStr,
                            status: 'absent',
                            overtimeHours: 0,
                          });
                          triggerFeedback(emp.fullName, 'absent', 0);
                        }}
                        className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400 font-extrabold scale-[1.03]'
                            : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                        }`}
                      >
                        {status === 'absent' && <XCircle className="w-3 h-3" />}
                        <span>Absent</span>
                      </button>
                    </div>

                    {/* Overtime Counter for the Day (supports up to 2 decimal places) */}
                    {status !== 'absent' && (
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs shadow-xs">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span className="font-semibold text-slate-600 text-[11px]">OT:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newOt = Math.max(0, Math.round((otHours - 0.5) * 100) / 100);
                            markDailyAttendance({
                              employeeId: emp.id,
                              date: selectedDateStr,
                              status: status === 'unmarked' ? 'present' : status,
                              overtimeHours: newOt,
                            });
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={otHours || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newOt = isNaN(val) ? 0 : Math.max(0, Math.round(val * 100) / 100);
                            markDailyAttendance({
                              employeeId: emp.id,
                              date: selectedDateStr,
                              status: status === 'unmarked' ? 'present' : status,
                              overtimeHours: newOt,
                            });
                          }}
                          className="font-bold text-amber-700 text-xs w-11 text-center bg-slate-50 border border-slate-200 rounded px-0.5 py-0.5 focus:bg-white"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">h</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newOt = Math.round((otHours + 0.5) * 100) / 100;
                            markDailyAttendance({
                              employeeId: emp.id,
                              date: selectedDateStr,
                              status: status === 'unmarked' ? 'present' : status,
                              overtimeHours: newOt,
                            });
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Today's Calculated Wage Pill */}
                    {status === 'present' && (
                      <div className="px-2.5 py-1 bg-emerald-100/90 border border-emerald-300 rounded-xl text-right shadow-xs">
                        <span className="text-[9px] text-emerald-800 font-bold block uppercase">Earned Today</span>
                        <span className="font-black text-emerald-950 text-xs sm:text-sm">{formatINR(dailyPay)}</span>
                      </div>
                    )}
                    {status === 'half-day' && (
                      <div className="px-2.5 py-1 bg-sky-100/90 border border-sky-300 rounded-xl text-right shadow-xs">
                        <span className="text-[9px] text-sky-800 font-bold block uppercase">Earned Today</span>
                        <span className="font-black text-sky-950 text-xs sm:text-sm">{formatINR(dailyPay)}</span>
                      </div>
                    )}
                    {status === 'absent' && (
                      <div className="px-2.5 py-1 bg-rose-100/80 border border-rose-200 rounded-xl text-right shadow-xs">
                        <span className="text-[9px] text-rose-700 font-bold block uppercase">Earned Today</span>
                        <span className="font-black text-rose-800 text-xs sm:text-sm">₹0</span>
                      </div>
                    )}
                    {status === 'unmarked' && (
                      <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-right">
                        <span className="text-[9px] text-slate-400 font-semibold block uppercase">Earned Today</span>
                        <span className="font-bold text-slate-400 text-xs sm:text-sm">—</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Weekly Payroll & Pay at End of Week */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-brand-50 to-indigo-50/60 p-4 rounded-2xl border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-sm text-brand-950">
                Weekly Wage Disbursement ({weekStartDate} to {weekEndDate})
              </span>
              <p className="text-brand-700 mt-0.5">
                Review accumulated shifts and overtime hours for the week and settle wages directly to workers via UPI.
              </p>
            </div>
            <div className="font-bold text-xs text-brand-800 bg-white px-3 py-1.5 rounded-xl border border-brand-200 shadow-xs">
              Total Weekly Payable:{' '}
              <span className="text-brand-700 text-sm font-black">
                {formatINR(weeklyWorkerSummary.reduce((sum, w) => sum + (w.isFullyPaid ? 0 : w.totalPayable), 0))}
              </span>
            </div>
          </div>

          {/* Weekly Worker Cards */}
          <div className="space-y-3">
            {weeklyWorkerSummary.map((item) => {
              const cardBorder = item.isFullyPaid
                ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                : item.totalPayable > 0
                ? 'bg-white border-indigo-200/80 shadow-xs'
                : 'bg-white border-slate-200/90 shadow-xs';

              return (
                <div
                  key={item.employee.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all ${cardBorder}`}
                >
                  {/* Worker Information */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 ${
                      item.isFullyPaid ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-indigo-600 text-white'
                    }`}>
                      {item.employee.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.employee.fullName}</p>
                      <p className="font-mono text-xs text-brand-700 font-semibold">{item.employee.upiId}</p>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                        <span>Rate: {formatINR(item.shiftRate)}/shift • OT: {formatINR(item.hourlyOtRate)}/hr</span>
                        {item.employee.advanceBalance && item.employee.advanceBalance > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Loan: {formatINR(item.employee.advanceBalance)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Summary of Shifts & OT */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Shifts</span>
                      <span className="font-bold text-slate-800">{item.totalShifts}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overtime</span>
                      <span className="font-bold text-amber-600">{item.totalOvertimeHours}h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Wages</span>
                      <span className="font-black text-brand-700 text-xs sm:text-sm">{formatINR(item.totalPayable, true)}</span>
                    </div>
                  </div>

                  {/* Pay Action or Settled Badge */}
                  <div className="self-end md:self-auto shrink-0 flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLendModalEmpId(item.employee.id)}
                      className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200/80 transition-colors flex items-center gap-1"
                      title="Lend money or view loan ledger"
                    >
                      <HandCoins className="w-3.5 h-3.5 text-amber-600" />
                      <span>Khata</span>
                    </button>

                    {item.isFullyPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Paid for Week</span>
                      </span>
                    ) : item.totalPayable <= 0 ? (
                      <span className="px-3 py-2 text-slate-400 text-xs font-semibold">No shifts</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyDeductAdvance(false);
                          setWeeklyDeductionAmount('');
                          setPayingWorkerData({
                            employee: item.employee,
                            totalPayable: item.totalPayable,
                            shiftsCount: item.totalShifts,
                            overtimeHours: item.totalOvertimeHours,
                            shiftPay: item.shiftPay,
                            overtimePay: item.overtimePay,
                            startDate: weekStartDate,
                            endDate: weekEndDate,
                          });
                        }}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 sm:gap-2 transition-all"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Pay {formatINR(item.totalPayable)} via UPI</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Success Toast */}
      {payoutSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-xs text-emerald-950">
                Weekly Payment of {formatINR(payoutSuccess.amount)} Settled!
              </p>
              <p className="text-[11px] text-emerald-700">
                Paid to {payoutSuccess.employeeName} • Ref: {payoutSuccess.utr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generatePaymentReceiptPDF(payoutSuccess.tx)}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Weekly Payslip</span>
            </button>
            <button
              onClick={() => setPayoutSuccess(null)}
              className="text-xs text-emerald-800 font-bold underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Weekly UPI Payment Modal Drawer */}
      {payingWorkerData && payingUpiDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 fill-brand-600 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weekly Wage UPI Payout</h3>
                  <p className="text-[11px] text-slate-500">{payingWorkerData.employee.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingWorkerData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Breakdown Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Shifts Worked:</span>
                <span className="font-bold text-slate-900">
                  {payingWorkerData.shiftsCount} shifts × {formatINR(payingWorkerData.employee.shiftRate || 800)} = {formatINR(payingWorkerData.shiftPay)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Overtime Worked:</span>
                <span className="font-bold text-amber-700">
                  +{payingWorkerData.overtimeHours}h OT = {formatINR(payingWorkerData.overtimePay)}
                </span>
              </div>

              {/* Advance Loan Deduction Option if worker has an outstanding loan */}
              {workerAdvanceBal > 0 && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 my-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weeklyDeductAdvance}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setWeeklyDeductAdvance(checked);
                          if (checked && (!weeklyDeductionAmount || Number(weeklyDeductionAmount) === 0)) {
                            setWeeklyDeductionAmount(Math.min(workerAdvanceBal, grossWeeklyPay));
                          }
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                      />
                      <span>Reduce from Loan / Advance</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                      Bal: {formatINR(workerAdvanceBal)}
                    </span>
                  </div>

                  {weeklyDeductAdvance && (
                    <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
                      <span className="text-xs font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={Math.min(workerAdvanceBal, grossWeeklyPay)}
                        value={weeklyDeductionAmount}
                        onChange={(e) => setWeeklyDeductionAmount(e.target.value)}
                        placeholder="Amount to deduct"
                        className="w-full py-1 px-2 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setWeeklyDeductionAmount(Math.min(workerAdvanceBal, grossWeeklyPay))}
                        className="px-2 py-1 text-[10px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg shrink-0 transition-colors"
                      >
                        Full
                      </button>
                    </div>
                  )}
                </div>
              )}

              {actualWeeklyDeduction > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Less Advance Deduction:</span>
                  <span>-{formatINR(actualWeeklyDeduction)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Net Weekly Payable:</span>
                <span className="font-black text-brand-700 text-base">{formatINR(netWeeklyPayable, true)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Payee UPI VPA:</span>
                <span className="font-mono font-bold text-brand-700">{payingUpiDetails.payeeAddress}</span>
              </div>
            </div>

            {/* Direct App Launchers */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-700 uppercase">Pay via Installed App:</p>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={payingUpiDetails.links.gpay}
                  className="py-2.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-center text-xs font-bold text-slate-800 flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs transition-all group"
                >
                  <GooglePayLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
                  <span className="truncate w-full font-semibold">Google Pay</span>
                </a>
                <a
                  href={payingUpiDetails.links.phonepe}
                  className="py-2.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-center text-xs font-bold text-slate-800 flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs transition-all group"
                >
                  <PhonePeLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
                  <span className="truncate w-full font-semibold">PhonePe</span>
                </a>
                <a
                  href={payingUpiDetails.links.paytm}
                  className="py-2.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-center text-xs font-bold text-slate-800 flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs transition-all group"
                >
                  <PaytmLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
                  <span className="truncate w-full font-semibold">Paytm</span>
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (payingUpiDetails?.uri) window.location.href = payingUpiDetails.uri;
                  }}
                  className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Any UPI App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQrOpen(true)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmWeeklyPayment}
                className="w-full py-2.5 px-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Paid & Generate Weekly Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for Weekly Payment */}
      {payingWorkerData && payingUpiDetails && (
        <UpiQrModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          payeeAddress={payingUpiDetails.payeeAddress}
          payeeName={payingWorkerData.employee.fullName}
          amount={netWeeklyPayable}
          transactionNote={`Weekly wages - ${payingWorkerData.employee.fullName}`}
          transactionRef={`WP-WK-${Date.now().toString().slice(-6)}`}
          onMarkPaid={handleConfirmWeeklyPayment}
        />
      )}

      {/* Lend Money / Khata Ledger Modal */}
      {lendModalEmpId && (
        <LendMoneyModal
          isOpen={!!lendModalEmpId}
          onClose={() => setLendModalEmpId(null)}
          defaultEmployeeId={lendModalEmpId}
        />
      )}

      {/* Overtime Alarm & Reminder Modal */}
      <OvertimeAlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        defaultEmployeeId={alarmTargetEmpId}
      />
    </div>
  );
};
