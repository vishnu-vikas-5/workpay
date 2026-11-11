import React, { useState, useEffect, useMemo } from 'react';
import { X, HandCoins, Plus, ArrowDownLeft, ArrowUpRight, History, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Employee, AdvanceRecord } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { formatINR } from '../../utils/utils';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../../utils/upiUtils';
import { GooglePayLogo, PhonePeLogo, PaytmLogo } from '../common/PaymentBrandIcons';

interface LendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmployeeId?: string;
}

export const LendMoneyModal: React.FC<LendMoneyModalProps> = ({
  isOpen,
  onClose,
  defaultEmployeeId,
}) => {
  const { employees, advances, lendMoney, repayAdvance } = useAppData();

  const [activeTab, setActiveTab] = useState<'lend' | 'history'>('lend');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmployeeId || '');
  const [amount, setAmount] = useState<string>('1000');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isRepayMode, setIsRepayMode] = useState<boolean>(false);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmpId(defaultEmployeeId);
    } else if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [defaultEmployeeId, employees, selectedEmpId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || employees[0] || null;
  }, [employees, selectedEmpId]);

  const employeeAdvances = useMemo(() => {
    if (!selectedEmployee) return [];
    return advances
      .filter((a) => a.employeeId === selectedEmployee.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [advances, selectedEmployee]);

  const currentBalance = selectedEmployee?.advanceBalance || 0;

  // Live UPI link for instant loan disbursement via UPI app
  const upiLink = useMemo(() => {
    if (!selectedEmployee || paymentMethod !== 'upi') return null;
    const numAmt = parseFloat(amount) || 0;
    if (numAmt <= 0) return null;
    const payeeAddress = selectedEmployee.upiId || `${selectedEmployee.phone}@upi`;
    const uri = generateUpiIntentUri({
      payeeAddress,
      payeeName: selectedEmployee.fullName,
      amount: numAmt,
      transactionNote: `Advance Loan - ${selectedEmployee.fullName}`,
      transactionRef: `LOAN-${Date.now().toString().slice(-6)}`,
    });
    return {
      uri,
      links: getAppSpecificUpiLinks(uri),
    };
  }, [selectedEmployee, amount, paymentMethod]);

  if (!isOpen) return null;

  const handleLendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert('Please enter a valid loan amount.');
      return;
    }

    setSubmitting(true);
    try {
      await lendMoney({
        employeeId: selectedEmployee.id,
        amount: numAmt,
        date,
        notes: notes.trim() || 'Cash Advance / Personal Loan',
        paymentMethod,
      });

      setSuccessToast(`Successfully lent ${formatINR(numAmt)} to ${selectedEmployee.fullName}!`);
      setNotes('');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert('Error recording loan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const numAmt = parseFloat(repayAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert('Please enter a valid repayment amount.');
      return;
    }

    setSubmitting(true);
    try {
      await repayAdvance({
        employeeId: selectedEmployee.id,
        amount: numAmt,
        date: new Date().toISOString().split('T')[0],
        notes: repayNotes.trim() || 'Direct Cash Repayment',
      });

      setSuccessToast(`Recorded repayment of ${formatINR(numAmt)} from ${selectedEmployee.fullName}!`);
      setIsRepayMode(false);
      setRepayAmount('');
      setRepayNotes('');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert('Error recording repayment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>Worker Lending & Advances</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Khata
                </span>
              </h3>
              <p className="text-xs text-slate-500">Lend money now & auto-reduce from upcoming salary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successToast && (
          <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Employee Selector Bar */}
        <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Select Worker
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} — Balance: {formatINR(emp.advanceBalance || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Balance Display */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-amber-200/80 shadow-2xs flex sm:flex-col justify-between items-center sm:items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding</span>
              <span className={`text-base font-black ${currentBalance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {formatINR(currentBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs: Lend Money vs History */}
        <div className="flex gap-2 border-b border-slate-100 my-3">
          <button
            type="button"
            onClick={() => setActiveTab('lend')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'lend'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lend Money (Add Advance)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Khata Ledger ({employeeAdvances.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {activeTab === 'lend' ? (
            <form onSubmit={handleLendSubmit} className="space-y-3.5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount to Lend (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500, 1000, 2000"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[500, 1000, 2000, 3000, 5000].map((quickAmt) => (
                    <button
                      key={quickAmt}
                      type="button"
                      onClick={() => setAmount(quickAmt.toString())}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        amount === quickAmt.toString()
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      +₹{quickAmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lending Date</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Disbursement Method
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'upi'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      ⚡ UPI
                    </button>
                  </div>
                </div>
              </div>

              {/* If UPI chosen: instant payment buttons */}
              {paymentMethod === 'upi' && upiLink && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2 animate-in fade-in">
                  <p className="text-[11px] font-bold text-indigo-900">
                    Pay {formatINR(parseFloat(amount) || 0)} directly via UPI:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <a
                      href={upiLink.links.gpay}
                      className="py-1.5 px-2 bg-white border border-indigo-100 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 shadow-2xs"
                    >
                      <GooglePayLogo className="w-5 h-5" />
                      <span>GPay</span>
                    </a>
                    <a
                      href={upiLink.links.phonepe}
                      className="py-1.5 px-2 bg-white border border-indigo-100 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 shadow-2xs"
                    >
                      <PhonePeLogo className="w-5 h-5" />
                      <span>PhonePe</span>
                    </a>
                    <a
                      href={upiLink.links.paytm}
                      className="py-1.5 px-2 bg-white border border-indigo-100 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 shadow-2xs"
                    >
                      <PaytmLogo className="w-5 h-5" />
                      <span>Paytm</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Note / Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reason / Note (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance, emergency medical, personal loan"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Explanation Note */}
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This amount will be added to <strong>{selectedEmployee?.fullName}</strong>'s balance. When paying salary in Quick Pay or Weekly Attendance, you can choose to reduce/deduct this amount anytime.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <HandCoins className="w-4 h-4" />
                <span>Record Loan of {formatINR(parseFloat(amount) || 0)}</span>
              </button>
            </form>
          ) : (
            /* History / Khata Tab */
            <div className="space-y-3">
              {/* Direct Cash Repayment Trigger */}
              {!isRepayMode ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Worker Returned Cash?</span>
                    <span className="text-[11px] text-slate-500">Record direct repayment outside salary</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRepayMode(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    + Record Cash Repayment
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRepaySubmit} className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950">Record Direct Cash Repayment</span>
                    <button
                      type="button"
                      onClick={() => setIsRepayMode(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={currentBalance || undefined}
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="Repayment amount (₹)"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-900"
                      required
                    />
                    <input
                      type="text"
                      value={repayNotes}
                      onChange={(e) => setRepayNotes(e.target.value)}
                      placeholder="Note (e.g. Returned ₹500 in cash)"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Save Cash Repayment
                  </button>
                </form>
              )}

              {/* List of Ledger Entries */}
              {employeeAdvances.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <HandCoins className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-600" />
                  <p className="text-xs font-medium">No loans or advances recorded for {selectedEmployee?.fullName} yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeAdvances.map((adv) => {
                    const isGive = adv.type === 'give';
                    return (
                      <div
                        key={adv.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between ${
                          isGive
                            ? 'bg-amber-50/40 border-amber-200/70'
                            : 'bg-emerald-50/40 border-emerald-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isGive
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isGive ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {isGive ? 'Lent to Worker' : adv.type === 'deduct' ? 'Deducted from Salary' : 'Direct Repayment'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{adv.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                              {adv.notes || (isGive ? 'Advance' : 'Salary deduction')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm font-black ${
                              isGive ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {isGive ? `+${formatINR(adv.amount)}` : `-${formatINR(adv.amount)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

