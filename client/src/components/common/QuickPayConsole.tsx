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
  Pencil,
  Trash2,
  Users,
  HandCoins,
} from 'lucide-react';
import { Employee, PaymentTransaction } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { EmployeeModal } from '../modals/EmployeeModal';
import { ManageEmployeesModal } from '../modals/ManageEmployeesModal';
import { LendMoneyModal } from '../modals/LendMoneyModal';
import { UpiQrModal } from './UpiQrModal';
import { formatINR } from '../../utils/utils';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../../utils/upiUtils';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';
import { GooglePayLogo, PhonePeLogo, PaytmLogo } from './PaymentBrandIcons';

export const QuickPayConsole: React.FC<{ onEmployeeAdded?: (emp: Employee) => void }> = ({ onEmployeeAdded }) => {
  const { employees, recordQuickPayment, deleteEmployee, refreshAll } = useAppData();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [shiftsCount, setShiftsCount] = useState<string | number>(1);
  const [overtimeHours, setOvertimeHours] = useState<string | number>(0);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [deductAdvanceEnabled, setDeductAdvanceEnabled] = useState(false);
  const [advanceDeductionAmount, setAdvanceDeductionAmount] = useState<string | number>('');
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    amount: number;
    employeeName: string;
    utr: string;
    tx?: PaymentTransaction;
  } | null>(null);

  const handleDeleteEmployee = async (emp: Employee) => {
    if (window.confirm(`Are you sure you want to remove "${emp.fullName}" from the employee roster?`)) {
      await deleteEmployee(emp.id);
      const remaining = employees.filter((e) => e.id !== emp.id);
      if (remaining.length > 0) {
        setSelectedEmpId(remaining[0].id);
      } else {
        setSelectedEmpId('');
      }
    }
  };

  // Set default employee selection when list loads
  React.useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || employees[0] || null;
  }, [employees, selectedEmpId]);

  // Numeric values parsed from user input allowing up to 2 decimal points
  const numShifts = typeof shiftsCount === 'string' ? (parseFloat(shiftsCount) || 0) : shiftsCount;
  const numOtHours = typeof overtimeHours === 'string' ? (parseFloat(overtimeHours) || 0) : overtimeHours;

  // Calculations per user request:
  // Shift rate is for 8 hours (can be ANY rate, e.g. 815, 815.50)
  // Overtime rate = Shift Rate / 8 per hour with 2 decimal precision
  const shiftRate = selectedEmployee?.shiftRate || (selectedEmployee?.hourlyWage ? selectedEmployee.hourlyWage * 8 : 800);
  const hourlyOvertimeRate = Math.round((shiftRate / 8) * 100) / 100;

  const regularShiftPay = Math.round(numShifts * shiftRate * 100) / 100;
  const overtimePay = Math.round(numOtHours * hourlyOvertimeRate * 100) / 100;
  const grossPay = Math.round((regularShiftPay + overtimePay) * 100) / 100;

  // Advance loan balance and deduction
  const employeeAdvanceBalance = selectedEmployee?.advanceBalance || 0;
  const parsedDeduction = typeof advanceDeductionAmount === 'string' ? (parseFloat(advanceDeductionAmount) || 0) : advanceDeductionAmount;
  const actualAdvanceDeduction = deductAdvanceEnabled ? Math.min(parsedDeduction, grossPay, employeeAdvanceBalance) : 0;
  const totalPayable = Math.max(0, Math.round((grossPay - actualAdvanceDeduction) * 100) / 100);

  // UPI Intent details
  const upiDetails = useMemo(() => {
    if (!selectedEmployee) return null;
    const payeeAddress = selectedEmployee.upiId || `${selectedEmployee.phone}@upi`;
    const noteSuffix = actualAdvanceDeduction > 0 ? ` (Less Adv: ₹${actualAdvanceDeduction})` : '';
    const uri = generateUpiIntentUri({
      payeeAddress,
      payeeName: selectedEmployee.fullName,
      amount: totalPayable,
      transactionNote: `Shift (${numShifts}) + OT (${numOtHours}h)${noteSuffix} - ${selectedEmployee.fullName}`,
      transactionRef: `WP-${Date.now().toString().slice(-6)}`,
    });
    return {
      uri,
      links: getAppSpecificUpiLinks(uri),
      payeeAddress,
    };
  }, [selectedEmployee, totalPayable, numShifts, numOtHours, actualAdvanceDeduction]);

  const handleOpenAnyUpi = () => {
    if (upiDetails?.uri) {
      window.location.href = upiDetails.uri;
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedEmployee) return;

    // Record verified transaction in state & storage
    const tx = await recordQuickPayment({
      employee: selectedEmployee,
      shiftsCount: numShifts,
      shiftRate,
      overtimeHours: numOtHours,
      overtimeRate: hourlyOvertimeRate,
      shiftPay: regularShiftPay,
      overtimePay,
      totalPayable,
      advanceDeducted: actualAdvanceDeduction,
      paymentMethod: 'upi_intent_manual',
    });

    setPaymentSuccessData({
      amount: totalPayable,
      employeeName: selectedEmployee.fullName,
      utr: tx.providerReferenceId || tx.id,
      tx,
    });

    setDeductAdvanceEnabled(false);
    setAdvanceDeductionAmount('');
    await refreshAll();
  };

  return (
    <div className="bg-[#DED6C1] rounded-3xl border border-[#CFC6B1] shadow-[0_12px_32px_rgba(183,176,158,0.3)] p-3.5 sm:p-6 relative overflow-hidden text-[#302C25]">
      {/* Background ambient badge */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-[#EBE2CC]/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-5 border-b border-[#CFC6B1]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBE2CC] text-[#302C25] text-[11px] font-bold border border-[#CFC6B1] mb-1">
            <Zap className="w-3 h-3 text-[#302C25] fill-[#302C25]" />
            <span>Instant Shift & Overtime Pay</span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-[#302C25] tracking-tight">
            Quick Pay: Shift & Overtime Wages
          </h2>
          <p className="text-[11px] sm:text-xs text-[#635B4E] mt-0.5">
            8h Shift Rate • Overtime at <span className="font-semibold text-[#302C25]">(Shift Rate ÷ 8)</span>/hr
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsManageWorkersOpen(true)}
            className="px-3 py-2 bg-[#EBE2CC] hover:bg-[#CFC6B1] text-[#302C25] border border-[#CFC6B1] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#635B4E]" />
            <span>Manage Employees</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEmployeeToEdit(null);
              setIsAddEmployeeOpen(true);
            }}
            className="px-4 py-2 bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] rounded-xl text-xs font-bold shadow-md shadow-[#302C25]/20 flex items-center justify-center gap-2 transition-all shrink-0 border border-[#1B1915]"
          >
            <UserPlus className="w-4 h-4 text-[#EBE2CC]" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6 items-start">
        {/* Left Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          {/* Step 1: Employee Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#302C25] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#302C25]" />
                <span>1. Select Employee</span>
              </label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageWorkersOpen(true)}
                  className="text-[10px] sm:text-[11px] font-semibold text-[#302C25] hover:text-[#1B1915] bg-[#EBE2CC] hover:bg-[#CFC6B1] border border-[#CFC6B1] px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-[#635B4E]" />
                  <span>Manage</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeToEdit(null);
                    setIsAddEmployeeOpen(true);
                  }}
                  className="text-[10px] sm:text-[11px] font-semibold text-[#302C25] hover:text-[#1B1915] bg-[#EBE2CC] hover:bg-[#CFC6B1] px-2 py-0.5 rounded-lg border border-[#CFC6B1]"
                >
                  + New
                </button>
              </div>
            </div>

            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2.5 sm:px-3.5 sm:py-3 bg-[#EBE2CC] hover:bg-[#EBE2CC]/90 border border-[#CFC6B1] rounded-xl text-xs font-semibold text-[#302C25] shadow-2xs focus:ring-2 focus:ring-[#B7B09E] focus:border-[#B7B09E] transition-colors"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} — ₹{emp.shiftRate || emp.hourlyWage * 8}/shift (OT: ₹
                  {Math.round((emp.shiftRate || emp.hourlyWage * 8) / 8)}/hr) — UPI: {emp.upiId}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Worker Info Chip with Edit, Remove, and Advance Lending Options */}
          {selectedEmployee && (
            <div className="space-y-1.5">
              <div className="p-2.5 sm:p-3 bg-[#EBE2CC] rounded-xl border border-[#CFC6B1] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#302C25] text-[#FAF6EE] font-bold flex items-center justify-center text-xs shrink-0">
                    {selectedEmployee.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#302C25] truncate">{selectedEmployee.fullName}</p>
                    <p className="text-[10px] sm:text-[11px] text-[#635B4E] truncate">{selectedEmployee.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] text-[#736B5C] font-semibold uppercase">UPI ID</p>
                    <p className="font-mono text-[11px] sm:text-xs font-bold text-[#302C25] truncate max-w-[120px] sm:max-w-none">
                      {selectedEmployee.upiId}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 border-l border-[#CFC6B1] pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeToEdit(selectedEmployee);
                        setIsAddEmployeeOpen(true);
                      }}
                      className="p-1 sm:p-1.5 text-[#635B4E] hover:text-[#302C25] hover:bg-[#DED6C1] rounded-lg border border-transparent hover:border-[#CFC6B1] transition-colors"
                      title="Edit Employee details and shift rate"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(selectedEmployee)}
                      className="p-1 sm:p-1.5 text-[#635B4E] hover:text-rose-700 hover:bg-[#DED6C1] rounded-lg border border-transparent hover:border-[#CFC6B1] transition-colors"
                      title="Remove Employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Advance Loan (Khata) Banner */}
              <div className="p-2 sm:p-2.5 bg-[#EBE2CC] border border-[#CFC6B1] rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <HandCoins className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-bold text-[#302C25] truncate text-[11px] sm:text-xs">
                    Advance Balance:
                  </span>
                  <span className={`font-black text-[11px] sm:text-xs ${employeeAdvanceBalance > 0 ? 'text-amber-800' : 'text-[#736B5C]'}`}>
                    {formatINR(employeeAdvanceBalance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLendModalOpen(true)}
                  className="px-2.5 py-1 bg-[#DED6C1] hover:bg-[#CFC6B1] border border-[#B7B09E] text-[#302C25] rounded-lg font-bold text-[10px] sm:text-[11px] shadow-2xs flex items-center gap-1 transition-colors shrink-0"
                >
                  <HandCoins className="w-3 h-3 text-amber-700" />
                  <span>{employeeAdvanceBalance > 0 ? 'Manage / Lend' : '+ Lend Money'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Shift Count & Overtime Hours */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
            {/* Shifts Count */}
            <div className="bg-[#EBE2CC] p-2.5 sm:p-3.5 rounded-2xl border border-[#CFC6B1] shadow-2xs flex flex-col justify-between">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-[#302C25] mb-0.5 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-[#302C25] shrink-0" />
                  <span className="truncate">2. Shifts (8h)</span>
                </label>
                <p className="text-[10px] text-[#635B4E] truncate">
                  {formatINR(shiftRate)}/shift
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof shiftsCount === 'string' ? (parseFloat(shiftsCount) || 0) : shiftsCount;
                    setShiftsCount(Math.max(0, Math.round((current - 1) * 10) / 10));
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] font-bold border border-[#CFC6B1] flex items-center justify-center shrink-0 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={shiftsCount}
                  onChange={(e) => setShiftsCount(e.target.value)}
                  onBlur={() => {
                    const parsed = parseFloat(String(shiftsCount));
                    setShiftsCount(isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100);
                  }}
                  className="w-full py-1 px-1 text-center font-bold text-sm sm:text-base bg-[#DED6C1] border border-[#CFC6B1] rounded-lg text-[#302C25]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof shiftsCount === 'string' ? (parseFloat(shiftsCount) || 0) : shiftsCount;
                    setShiftsCount(Math.round((current + 1) * 10) / 10);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] font-bold border border-[#CFC6B1] flex items-center justify-center shrink-0 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Overtime Hours (supports up to 2 decimal places) */}
            <div className="bg-[#EBE2CC] p-2.5 sm:p-3.5 rounded-2xl border border-[#CFC6B1] shadow-2xs flex flex-col justify-between">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-[#302C25] mb-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">3. OT Hours</span>
                </label>
                <p className="text-[10px] text-emerald-800 font-semibold truncate">
                  OT: {formatINR(hourlyOvertimeRate)}/hr
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof overtimeHours === 'string' ? (parseFloat(overtimeHours) || 0) : overtimeHours;
                    setOvertimeHours(Math.max(0, Math.round((current - 0.5) * 100) / 100));
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] font-bold border border-[#CFC6B1] flex items-center justify-center shrink-0 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={overtimeHours}
                  placeholder="0.00"
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  onBlur={() => {
                    const parsed = parseFloat(String(overtimeHours));
                    setOvertimeHours(isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100);
                  }}
                  className="w-full py-1 px-1 text-center font-bold text-sm sm:text-base bg-[#DED6C1] border border-[#CFC6B1] rounded-lg text-[#302C25]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof overtimeHours === 'string' ? (parseFloat(overtimeHours) || 0) : overtimeHours;
                    setOvertimeHours(Math.round((current + 0.5) * 100) / 100);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] font-bold border border-[#CFC6B1] flex items-center justify-center shrink-0 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output & Payment Actions (5 Cols) */}
        <div className="lg:col-span-5 bg-[#EBE2CC] rounded-2xl border border-[#CFC6B1] shadow-sm p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#CFC6B1]">
            <span className="text-xs font-bold text-[#635B4E] uppercase tracking-wider">
              Calculation Summary
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-900 bg-[#DED6C1] px-2 py-0.5 rounded-full border border-[#CFC6B1]">
              Live Auto-Calc
            </span>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-1.5 sm:space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#CFC6B1]">
              <span className="text-[#635B4E]">
                Shift Wages ({numShifts} × {formatINR(shiftRate)}):
              </span>
              <span className="font-bold text-[#302C25]">{formatINR(regularShiftPay)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CFC6B1]">
              <span className="text-[#635B4E]">
                Overtime ({numOtHours}h × {formatINR(hourlyOvertimeRate)}/hr):
              </span>
              <span className="font-bold text-amber-800">+{formatINR(overtimePay)}</span>
            </div>

            {/* If employee has an advance loan: Option to reduce from salary */}
            {employeeAdvanceBalance > 0 && (
              <div className="p-2.5 bg-[#DED6C1] border border-[#B7B09E] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-bold text-amber-950 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deductAdvanceEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDeductAdvanceEnabled(checked);
                        if (checked && (!advanceDeductionAmount || Number(advanceDeductionAmount) === 0)) {
                          setAdvanceDeductionAmount(Math.min(employeeAdvanceBalance, grossPay));
                        }
                      }}
                      className="rounded text-amber-700 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span>Reduce from Loan / Advance</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-900 bg-[#EBE2CC] px-2 py-0.5 rounded-md border border-[#CFC6B1]">
                    Bal: {formatINR(employeeAdvanceBalance)}
                  </span>
                </div>

                {deductAdvanceEnabled && (
                  <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
                    <span className="text-xs font-bold text-[#635B4E]">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={Math.min(employeeAdvanceBalance, grossPay)}
                      value={advanceDeductionAmount}
                      onChange={(e) => setAdvanceDeductionAmount(e.target.value)}
                      placeholder="Amount to deduct"
                      className="w-full py-1 px-2 text-xs font-bold bg-[#EBE2CC] border border-[#B7B09E] rounded-lg text-[#302C25] focus:ring-1 focus:ring-[#302C25]"
                    />
                    <button
                      type="button"
                      onClick={() => setAdvanceDeductionAmount(Math.min(employeeAdvanceBalance, grossPay))}
                      className="px-2 py-1 text-[10px] font-bold bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] rounded-lg shrink-0 transition-colors border border-[#CFC6B1]"
                    >
                      Deduct Full
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Advance Deduction Row if applied */}
            {actualAdvanceDeduction > 0 && (
              <div className="flex justify-between py-1 border-b border-[#CFC6B1] text-rose-700">
                <span className="font-semibold text-rose-800">
                  Less Advance Deduction:
                </span>
                <span className="font-bold">-{formatINR(actualAdvanceDeduction)}</span>
              </div>
            )}

            {/* Total Highlight */}
            <div className="p-2.5 sm:p-3 bg-[#DED6C1] rounded-xl border border-[#CFC6B1] flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#302C25] uppercase">
                  Total Payable Amount
                </span>
                <p className="text-[9px] sm:text-[10px] text-[#635B4E]">
                  {actualAdvanceDeduction > 0
                    ? `Gross: ${formatINR(grossPay)} — Less: ${formatINR(actualAdvanceDeduction)} Adv`
                    : 'Includes shifts + overtime'}
                </p>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#302C25] tracking-tight">
                {formatINR(totalPayable, true)}
              </h3>
            </div>
          </div>

          {/* UPI Instant Redirection Launchers */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-[#635B4E] uppercase tracking-wider">
              Pay via UPI:
            </p>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <a
                href={upiDetails?.links.gpay}
                className="py-2 px-1 bg-[#DED6C1] hover:bg-[#CFC6B1] border border-[#CFC6B1] hover:border-[#B7B09E] rounded-xl text-center text-[11px] sm:text-xs font-bold text-[#302C25] transition-all flex flex-col items-center gap-1 shadow-2xs group"
              >
                <GooglePayLogo className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-105" />
                <span className="truncate w-full font-semibold">Google Pay</span>
              </a>

              <a
                href={upiDetails?.links.phonepe}
                className="py-2 px-1 bg-[#DED6C1] hover:bg-[#CFC6B1] border border-[#CFC6B1] hover:border-[#B7B09E] rounded-xl text-center text-[11px] sm:text-xs font-bold text-[#302C25] transition-all flex flex-col items-center gap-1 shadow-2xs group"
              >
                <PhonePeLogo className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-105" />
                <span className="truncate w-full font-semibold">PhonePe</span>
              </a>

              <a
                href={upiDetails?.links.paytm}
                className="py-2 px-1 bg-[#DED6C1] hover:bg-[#CFC6B1] border border-[#CFC6B1] hover:border-[#B7B09E] rounded-xl text-center text-[11px] sm:text-xs font-bold text-[#302C25] transition-all flex flex-col items-center gap-1 shadow-2xs group"
              >
                <PaytmLogo className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-105" />
                <span className="truncate w-full font-semibold">Paytm</span>
              </a>
            </div>

            {/* Open Default App & QR buttons */}
            <div className="flex gap-1.5 sm:gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleOpenAnyUpi}
                className="flex-1 py-2 sm:py-2.5 px-3 bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#302C25]/20 transition-all border border-[#1B1915]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open UPI App</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="px-3 py-2 sm:py-2.5 bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#302C25] border border-[#CFC6B1] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
              className="w-full py-2 px-3 mt-1 bg-[#DED6C1] hover:bg-[#CFC6B1] text-[#2D5A27] border border-[#B7B09E] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-[#2D5A27]" />
              <span>Mark Paid & Download Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Success Confirmation Banner */}
      {paymentSuccessData && (
        <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-xs text-emerald-950">
                Payment of {formatINR(paymentSuccessData.amount)} Recorded Successfully in History!
              </p>
              <p className="text-[11px] text-emerald-700">
                Paid to {paymentSuccessData.employeeName} • Ref: {paymentSuccessData.utr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {paymentSuccessData.tx && (
              <button
                type="button"
                onClick={() =>
                  generatePaymentReceiptPDF(
                    paymentSuccessData.tx!,
                    undefined,
                    selectedEmployee || undefined
                  )
                }
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Payslip PDF</span>
              </button>
            )}
            <button
              onClick={() => setPaymentSuccessData(null)}
              className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isAddEmployeeOpen}
        employeeToEdit={employeeToEdit}
        onClose={() => {
          setIsAddEmployeeOpen(false);
          setEmployeeToEdit(null);
        }}
        onSuccess={(created) => {
          setSelectedEmpId(created.id);
          onEmployeeAdded?.(created);
        }}
      />

      {/* Manage Employees Directory Modal */}
      <ManageEmployeesModal
        isOpen={isManageWorkersOpen}
        onClose={() => setIsManageWorkersOpen(false)}
        onAddNew={() => {
          setEmployeeToEdit(null);
          setIsAddEmployeeOpen(true);
        }}
        onEdit={(emp) => {
          setEmployeeToEdit(emp);
          setIsAddEmployeeOpen(true);
        }}
      />

      {/* Lend Money / Advance (Khata) Modal */}
      <LendMoneyModal
        isOpen={isLendModalOpen}
        onClose={() => setIsLendModalOpen(false)}
        defaultEmployeeId={selectedEmployee?.id}
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

