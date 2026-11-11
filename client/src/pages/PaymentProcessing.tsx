import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Smartphone,
  Building,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Info,
  Phone,
  FileText,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { PayrollRecord, Employee } from '../types';
import { formatINR, maskAccountNumber, maskUpiId } from '../utils/utils';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { UpiQrModal } from '../components/common/UpiQrModal';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../utils/upiUtils';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';

interface PaymentProcessingProps {
  initialPayrollId?: string;
  onNavigateToHistory: () => void;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  initialPayrollId,
  onNavigateToHistory,
}) => {
  const { role, user } = useAuth();
  const { payrollRecords, employees, disbursePayout } = useAppData();

  const [selectedPayrollId, setSelectedPayrollId] = useState<string>(
    initialPayrollId || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual'
  >('razorpayx_upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [upiQrModalOpen, setUpiQrModalOpen] = useState(false);
  const [payoutResult, setPayoutResult] = useState<{
    success: boolean;
    utr?: string;
    error?: string;
  } | null>(null);

  // Unpaid approved payroll records ready for payment
  const readyPayrolls = useMemo(() => {
    return payrollRecords.filter((p) => p.paymentStatus === 'unpaid');
  }, [payrollRecords]);

  // Set default selection if none chosen
  React.useEffect(() => {
    if (!selectedPayrollId && readyPayrolls.length > 0) {
      setSelectedPayrollId(readyPayrolls[0].id);
    }
  }, [readyPayrolls, selectedPayrollId]);

  const currentPayroll = useMemo(() => {
    return payrollRecords.find((p) => p.id === selectedPayrollId);
  }, [payrollRecords, selectedPayrollId]);

  const currentEmployee = useMemo(() => {
    if (!currentPayroll) return null;
    return employees.find((e) => e.id === currentPayroll.employeeId) || null;
  }, [currentPayroll, employees]);

  // UPI Intent URI and Links
  const upiDetails = useMemo(() => {
    if (!currentEmployee || !currentPayroll) return null;
    const payeeAddress = currentEmployee.upiId || `${currentEmployee.phone}@upi`;
    const uri = generateUpiIntentUri({
      payeeAddress,
      payeeName: currentEmployee.fullName,
      amount: currentPayroll.totalPayable,
      transactionNote: `WorkPay Shift Wages - ${currentEmployee.fullName}`,
      transactionRef: `WP-${currentPayroll.id}`,
    });
    return {
      uri,
      links: getAppSpecificUpiLinks(uri),
      payeeAddress,
    };
  }, [currentEmployee, currentPayroll]);

  // Disburse via RazorpayX or Mark as Paid
  const handleDisburse = async (methodOverride?: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual') => {
    if (!currentPayroll) return;
    setIsProcessing(true);
    setPayoutResult(null);

    const chosenMethod = methodOverride || paymentMethod;

    try {
      const res = await disbursePayout(currentPayroll.id, chosenMethod);
      if (res.success && res.transaction) {
        setPayoutResult({
          success: true,
          utr: res.transaction.providerReferenceId,
        });
      } else {
        setPayoutResult({
          success: false,
          error: res.error || 'Payout could not be completed.',
        });
      }
    } catch (err: any) {
      setPayoutResult({
        success: false,
        error: err.message || 'Payment failed',
      });
    } finally {
      setIsProcessing(false);
      setConfirmModalOpen(false);
    }
  };

  const handleOpenUpiAppDirect = () => {
    if (upiDetails?.uri) {
      window.location.href = upiDetails.uri;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            UPI Payouts & Redirection Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pay workers directly via UPI ID, redirect to installed UPI apps, or disburse through RazorpayX
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToHistory}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2"
          >
            <span>View Payment Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gateway Status Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>UPI Intent & RazorpayX Ready</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Pay Shift Wages Directly via Worker UPI ID
            </h2>
            <p className="text-xs text-indigo-200/90 max-w-xl leading-relaxed">
              Calculates regular 8-hour shift wages + hourly overtime (Shift Rate ÷ 8). Redirects
              directly to Google Pay, PhonePe, Paytm, or dispatches automated payouts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs space-y-1.5 shrink-0 min-w-[200px]">
            <p className="text-indigo-200 font-medium">Pending Payout Queue:</p>
            <p className="text-2xl font-bold">{readyPayrolls.length} Workers</p>
            <p className="text-indigo-200 text-[11px]">
              Total Value:{' '}
              <span className="text-white font-bold">
                {formatINR(readyPayrolls.reduce((sum, p) => sum + p.totalPayable, 0))}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Payout Console */}
      {readyPayrolls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Workers Are Paid</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are currently no unpaid payroll records awaiting disbursement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Payroll Record Selection */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Select Worker</h3>
              <p className="text-xs text-slate-400">Choose approved worker shift to pay</p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {readyPayrolls.map((payroll) => {
                const isSelected = payroll.id === selectedPayrollId;
                const emp = employees.find((e) => e.id === payroll.employeeId);
                return (
                  <div
                    key={payroll.id}
                    onClick={() => {
                      setSelectedPayrollId(payroll.id);
                      setPayoutResult(null);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/50 shadow-xs ring-1 ring-brand-600/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">
                        {payroll.employeeName}
                      </span>
                      <span className="font-bold text-brand-600 text-xs">
                        {formatINR(payroll.totalPayable)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono text-brand-700">
                        {emp?.upiId || 'UPI ID pending'}
                      </span>
                      <span className="font-mono text-slate-400">{emp?.phone}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        Shift Rate: {formatINR(emp?.shiftRate || 800)} (8h)
                      </span>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        +{payroll.overtimeHours}h OT
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Beneficiary Verification & Payout Engine */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Employee Details, Overtime Breakdown & UPI Payment
              </h3>
              <p className="text-xs text-slate-400">
                Redirect to your preferred UPI app or execute automated payout
              </p>
            </div>

            {currentPayroll && currentEmployee ? (
              <div className="space-y-5">
                {/* Beneficiary Details Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                        {currentEmployee.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          {currentEmployee.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {currentEmployee.phone}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-brand-700 font-bold">
                            UPI: {currentEmployee.upiId || `${currentEmployee.phone}@upi`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">
                        Total Payable Amount
                      </span>
                      <h3 className="text-2xl font-bold text-brand-600">
                        {formatINR(currentPayroll.totalPayable, true)}
                      </h3>
                    </div>
                  </div>

                  {/* Mathematical Calculation Breakdown (Per User Request) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 text-xs">
                    {/* Shift Rate */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        8-Hour Shift Rate
                      </span>
                      <p className="text-base font-bold text-slate-900 mt-0.5">
                        {formatINR(currentEmployee.shiftRate || currentPayroll.regularWages)}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Standard shift ({currentPayroll.regularHours} hrs)
                      </span>
                    </div>

                    {/* Hourly Overtime Rate */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Overtime (Shift Rate ÷ 8)
                      </span>
                      <p className="text-base font-bold text-amber-600 mt-0.5">
                        {formatINR(
                          (currentEmployee.shiftRate || currentEmployee.hourlyWage * 8) / 8
                        )}{' '}
                        <span className="text-xs font-normal">/ hr</span>
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {currentPayroll.overtimeHours} Overtime Hours worked
                      </span>
                    </div>

                    {/* Total Overtime Wages */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Calculated OT Pay
                      </span>
                      <p className="text-base font-bold text-emerald-600 mt-0.5">
                        +{formatINR(currentPayroll.overtimeWages)}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {currentPayroll.overtimeHours}h ×{' '}
                        {formatINR(
                          (currentEmployee.shiftRate || currentEmployee.hourlyWage * 8) / 8
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Direct UPI Redirection Buttons (Prominently featured per user request) */}
                <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                        <span>Instant UPI Redirection Options</span>
                      </h4>
                      <p className="text-[11px] text-indigo-700/80 mt-0.5">
                        Click below to open installed payment apps directly with amount & UPI pre-filled:
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUpiQrModalOpen(true)}
                      className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Show QR Code</span>
                    </button>
                  </div>

                  {/* 1-Click UPI App Launchers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={upiDetails?.links.gpay}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <span className="text-base">🟢</span>
                      <span>Google Pay</span>
                    </a>

                    <a
                      href={upiDetails?.links.phonepe}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <span className="text-base">🟣</span>
                      <span>PhonePe</span>
                    </a>

                    <a
                      href={upiDetails?.links.paytm}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs text-slate-800 flex flex-col items-center justify-center gap-1 shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <span className="text-base">🔵</span>
                      <span>Paytm</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleOpenUpiAppDirect}
                      className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-brand-500/20 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Any UPI App</span>
                    </button>
                  </div>
                </div>

                {/* Payout Result Alert */}
                {payoutResult && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      payoutResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {payoutResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-xs">
                        {payoutResult.success
                          ? 'Salary Settlement Recorded Successfully!'
                          : 'Disbursement Error'}
                      </p>
                      <p className="text-xs mt-0.5">
                        {payoutResult.success
                          ? `Payment recorded for ${currentEmployee.fullName}. Banking Ref / UTR: ${payoutResult.utr}`
                          : payoutResult.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDisburse('upi_intent_manual')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Paid via UPI – Mark as Completed</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Communicating with RazorpayX...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>
                          Automated Payout {formatINR(currentPayroll.totalPayable)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {currentPayroll && currentEmployee && (
        <ConfirmationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => handleDisburse(paymentMethod)}
          title="Confirm Salary Disbursement"
          description={`Are you sure you want to disburse ${formatINR(
            currentPayroll.totalPayable
          )} to ${currentEmployee.fullName} via UPI ID ${currentEmployee.upiId}? This action is immutable.`}
          confirmLabel={`Yes, Pay ${formatINR(currentPayroll.totalPayable)}`}
          loading={isProcessing}
        />
      )}

      {/* UPI Intent QR Modal */}
      {currentPayroll && currentEmployee && upiDetails && (
        <UpiQrModal
          isOpen={upiQrModalOpen}
          onClose={() => setUpiQrModalOpen(false)}
          payeeAddress={upiDetails.payeeAddress}
          payeeName={currentEmployee.fullName}
          amount={currentPayroll.totalPayable}
          transactionNote={`WorkPay Salary - ${currentEmployee.fullName}`}
          transactionRef={`WP-${currentPayroll.id}`}
          onMarkPaid={() => handleDisburse('upi_intent_manual')}
        />
      )}
    </div>
  );
};
