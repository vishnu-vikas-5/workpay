import React, { useMemo } from 'react';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle2,
  Calendar,
  Smartphone,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { formatINR, maskAccountNumber, maskUpiId } from '../utils/utils';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';

export const EmployeePaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const { employees, transactions, payrollRecords } = useAppData();

  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === user?.employeeId || e.email === user?.email) || employees[0];
  }, [employees, user]);

  const myTransactions = useMemo(() => {
    return transactions.filter((t) => t.employeeId === currentEmployee.id);
  }, [transactions, currentEmployee]);

  const totalReceived = useMemo(() => {
    return myTransactions
      .filter((t) => t.status === 'Successful')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [myTransactions]);

  const handleDownload = (tx: any) => {
    const payroll = payrollRecords.find((p) => p.id === tx.payrollId);
    generatePaymentReceiptPDF(tx, payroll, currentEmployee);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Salary Slips & Payment History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official records of wage disbursements settled directly to your verified bank or UPI VPA
          </p>
        </div>

        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold">
          Total Disbursed: <span className="font-bold">{formatINR(totalReceived)}</span>
        </div>
      </div>

      {/* Payout Beneficiary Registered Account Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Registered Settlement Destination
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentEmployee.upiId ? (
                <span className="font-mono text-brand-700 font-semibold">
                  UPI VPA: {currentEmployee.upiId}
                </span>
              ) : (
                <span className="font-mono text-slate-800">
                  Bank A/C: {maskAccountNumber(currentEmployee.bankAccount?.accountNumber)} (
                  {currentEmployee.bankAccount?.ifsc})
                </span>
              )}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          RazorpayX Beneficiary Verified
        </span>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt / UTR</th>
                <th className="py-3 px-4">Settlement Date</th>
                <th className="py-3 px-4">Disbursement Amount</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Download Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {myTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No payment transactions recorded for your account yet.
                  </td>
                </tr>
              ) : (
                myTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-900">{tx.id}</p>
                      <p className="font-mono text-[11px] text-brand-600 font-semibold">
                        UTR: {tx.providerReferenceId || 'WP-UTR-PENDING'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(tx.initiatedAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700 capitalize">
                        {tx.paymentMethod === 'razorpayx_upi' ? (
                          <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                          <Building className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        <span>{tx.paymentMethod.replace('razorpayx_', '').replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownload(tx)}
                        className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

