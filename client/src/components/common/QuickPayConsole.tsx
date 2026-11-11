import React, { useState, useMemo } from 'react';
import {
  Zap,
  UserPlus,
  Smartphone,
  Banknote,
  Clock,
  ExternalLink,
  QrCode,
  CheckCircle2,
  FileText,
  Sparkles,
  Phone,
  User,
  Calculator,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { EmployeeModal } from '../modals/EmployeeModal';
import { UpiQrModal } from './UpiQrModal';
import { formatINR } from '../../utils/utils';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../../utils/upiUtils';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';

export const QuickPayConsole: React.FC = () => {
  const { employees, disbursePayout, refreshAll } = useAppData();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [shiftsCount, setShiftsCount] = useState<number>(1);
  const [overtimeHours, setOvertimeHours] = useState<number>(2);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    amount: number;
    employeeName: string;
    utr: string;
  } | null>(null);

  // Set default employee selection when list loads
  React.useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || employees[0] || null;
  }, [employees, selectedEmpId]);

  // Calculations per user request:
  // Shift rate is for 8 hours
  // Overtime rate = Shift Rate / 8 per hour
  const shiftRate = selectedEmployee?.shiftRate || (selectedEmployee?.hourlyWage ? selectedEmployee.hourlyWage * 8 : 800);
  const hourlyOvertimeRate = Math.round((shiftRate / 8) * 100) / 100;

  const regularShiftPay = Math.round(shiftsCount * shiftRate);
  const overtimePay = Math.round(overtimeHours * hourlyOvertimeRate);
  const totalPayable = regularShiftPay + overtimePay;

  // UPI Intent details
  const upiDetails = useMemo(() => {
    if (!selectedEmployee) return null;
    const payeeAddress = selectedEmployee.upiId || `${selectedEmployee.phone}@upi`;
    const uri = generateUpiIntentUri({
      payeeAddress,
      payeeName: selectedEmployee.fullName,
      amount: totalPayable,
      transactionNote: `Shift (${shiftsCount}) + OT (${overtimeHours}h) - ${selectedEmployee.fullName}`,
      transactionRef: `WP-${Date.now().toString().slice(-6)}`,
    });
    return {
      uri,
      links: getAppSpecificUpiLinks(uri),
      payeeAddress,
    };
  }, [selectedEmployee, totalPayable, shiftsCount, overtimeHours]);

  const handleOpenAnyUpi = () => {
    if (upiDetails?.uri) {
      window.location.href = upiDetails.uri;
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedEmployee) return;

    // Call payout handler
    const mockPayrollId = `pay-${Date.now()}`;
    const res = await disbursePayout(mockPayrollId, 'upi_intent_manual');

    setPaymentSuccessData({
      amount: totalPayable,
      employeeName: selectedEmployee.fullName,
      utr: `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    });

    await refreshAll();
  };

  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/20 to-white rounded-3xl border border-indigo-100/90 shadow-card p-6 relative overflow-hidden">
      {/* Background ambient badge */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200/60 mb-1">
            <Zap className="w-3.5 h-3.5 text-brand-600 fill-brand-600" />
            <span>Instant Shift & Overtime Payment</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quick Pay: Add Shift Hours, Auto-Calculate & Pay via UPI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift rate is for 8 hrs. Overtime is calculated at{' '}
            <span className="font-semibold text-slate-700">(Shift Rate ÷ 8)</span> per hour.
          </p>
        </div>

        <button
          onClick={() => setIsAddEmployeeOpen(true)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Left Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step 1: Employee Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-600" />
                <span>1. Select Employee</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddEmployeeOpen(true)}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                + New Employee
              </button>
            </div>

            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} — ₹{emp.shiftRate || emp.hourlyWage * 8}/shift (OT: ₹
                  {Math.round((emp.shiftRate || emp.hourlyWage * 8) / 8)}/hr) — UPI: {emp.upiId}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Worker Info Chip */}
          {selectedEmployee && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {selectedEmployee.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedEmployee.fullName}</p>
                  <p className="text-[11px] text-slate-500">{selectedEmployee.phone}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">UPI ID (VPA)</p>
                <p className="font-mono font-bold text-brand-700">{selectedEmployee.upiId}</p>
              </div>
            </div>
          )}

          {/* Step 2: Shift Count & Overtime Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Shifts Count */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Number of Shifts (8 hrs each)</span>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShiftsCount(Math.max(1, shiftsCount - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={shiftsCount}
                  onChange={(e) => setShiftsCount(Math.max(1, Number(e.target.value)))}
                  className="flex-1 py-1 px-2 text-center font-bold text-base bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShiftsCount(shiftsCount + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Rate: {formatINR(shiftRate)} per 8hr shift
              </p>
            </div>

            {/* Overtime Hours */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Overtime Hours</span>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setOvertimeHours(Math.max(0, overtimeHours - 0.5))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(Math.max(0, Number(e.target.value)))}
                  className="flex-1 py-1 px-2 text-center font-bold text-base bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setOvertimeHours(overtimeHours + 0.5)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                OT Rate: {formatINR(hourlyOvertimeRate)}/hr (Rate ÷ 8)
              </p>
            </div>
          </div>
        </div>

        {/* Right Output & Payment Actions (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-indigo-100 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Calculation Summary
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Auto-Calc
            </span>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">
                Shift Wages ({shiftsCount} shift{shiftsCount > 1 ? 's' : ''} × {formatINR(shiftRate)}):
              </span>
              <span className="font-bold text-slate-900">{formatINR(regularShiftPay)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">
                Overtime ({overtimeHours}h × {formatINR(hourlyOvertimeRate)}/hr):
              </span>
              <span className="font-bold text-amber-600">+{formatINR(overtimePay)}</span>
            </div>

            {/* Total Highlight */}
            <div className="p-3 bg-gradient-to-r from-brand-50 to-indigo-50/60 rounded-xl border border-brand-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-brand-900 uppercase">
                  Total Payable Amount
                </span>
                <p className="text-[10px] text-brand-600">Includes shifts + overtime</p>
              </div>
              <h3 className="text-2xl font-black text-brand-700 tracking-tight">
                {formatINR(totalPayable, true)}
              </h3>
            </div>
          </div>

          {/* UPI Instant Redirection Launchers */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Pay via UPI (Direct App Redirection):
            </p>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={upiDetails?.links.gpay}
                className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-800 transition-colors flex flex-col items-center gap-0.5"
              >
                <span className="text-base">🟢</span>
                <span>Google Pay</span>
              </a>

              <a
                href={upiDetails?.links.phonepe}
                className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-800 transition-colors flex flex-col items-center gap-0.5"
              >
                <span className="text-base">🟣</span>
                <span>PhonePe</span>
              </a>

              <a
                href={upiDetails?.links.paytm}
                className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-800 transition-colors flex flex-col items-center gap-0.5"
              >
                <span className="text-base">🔵</span>
                <span>Paytm</span>
              </a>
            </div>

            {/* Open Default App & QR buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenAnyUpi}
                className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open UPI App</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="Scan QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span>QR</span>
              </button>
            </div>

            {/* Mark as Paid */}
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="w-full py-2 px-3 mt-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Mark as Paid & Generate Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Success Confirmation Banner */}
      {paymentSuccessData && (
        <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-xs text-emerald-950">
                Payment of {formatINR(paymentSuccessData.amount)} Recorded Successfully!
              </p>
              <p className="text-[11px] text-emerald-700">
                Paid to {paymentSuccessData.employeeName} • Ref: {paymentSuccessData.utr}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPaymentSuccessData(null)}
            className="text-xs font-bold text-emerald-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
      />

      {/* UPI QR Modal */}
      {selectedEmployee && upiDetails && (
        <UpiQrModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          payeeAddress={upiDetails.payeeAddress}
          payeeName={selectedEmployee.fullName}
          amount={totalPayable}
          transactionNote={`Shift + Overtime - ${selectedEmployee.fullName}`}
          transactionRef={`WP-${Date.now().toString().slice(-6)}`}
          onMarkPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
};
