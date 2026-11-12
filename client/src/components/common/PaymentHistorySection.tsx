import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  FileText,
  Smartphone,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { PaymentTransaction } from '../../types';
import { formatINR, formatDateTime } from '../../utils/utils';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';
import { exportToCSV } from '../../utils/exportUtils';

export const PaymentHistorySection: React.FC = () => {
  const { transactions, employees, deleteTransaction } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchTerm.toLowerCase();
      const nameMatch = tx.employeeName?.toLowerCase().includes(q);
      const utrMatch = tx.providerReferenceId?.toLowerCase().includes(q) || tx.id?.toLowerCase().includes(q);
      const upiMatch = tx.destination?.upiId?.toLowerCase().includes(q);
      const phoneMatch = tx.employeePhone?.includes(q);
      return nameMatch || utrMatch || upiMatch || phoneMatch;
    });
  }, [transactions, searchTerm]);

  const stats = useMemo(() => {
    const totalAmount = Math.round(
      transactions
        .filter((t) => t.status === 'Successful')
        .reduce((sum, t) => sum + (t.amount || 0), 0) * 100
    ) / 100;
    const totalShifts = Math.round(transactions.reduce((sum, t) => sum + (t.shiftsCount || 1), 0) * 10) / 10;
    const totalOT = Math.round(transactions.reduce((sum, t) => sum + (t.overtimeHours || 0), 0) * 100) / 100;
    return {
      totalAmount,
      totalCount: transactions.length,
      totalShifts,
      totalOT,
    };
  }, [transactions]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (tx: PaymentTransaction) => {
    const emp = employees.find((e) => e.id === tx.employeeId);
    generatePaymentReceiptPDF(tx, undefined, emp);
  };

  const handleExportCSV = () => {
    const exportData = filtered.map((tx) => ({
      'Transaction ID': tx.id,
      'Provider UTR / Ref': tx.providerReferenceId || 'N/A',
      'Employee Name': tx.employeeName,
      'Phone': tx.employeePhone || 'N/A',
      'UPI ID': tx.destination?.upiId || 'N/A',
      'Shifts Count': tx.shiftsCount ?? 1,
      'Shift Rate (INR)': tx.shiftRate ?? 'N/A',
      'Overtime Hours': tx.overtimeHours ?? 0,
      'Overtime Rate (INR/hr)': tx.overtimeRate ?? 'N/A',
      'Gross Pay (INR)': tx.grossPay ?? tx.amount,
      'Advance Deducted (INR)': tx.advanceDeducted ?? 0,
      'Net Paid (INR)': tx.amount,
      'Remaining Loan Balance (INR)': tx.remainingAdvanceBalance ?? 0,
      'Payment Status': tx.status,
      'Date & Time': new Date(tx.initiatedAt).toLocaleString('en-IN'),
    }));
    exportToCSV(exportData, `WorkPay_Payment_History_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="bg-[#FAF6EE] backdrop-blur-md rounded-3xl border border-sand-300 shadow-[0_12px_32px_rgba(183,176,158,0.25)] p-3.5 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sand-300/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sand-200 text-sand-900 flex items-center justify-center font-bold border border-sand-300">
            <History className="w-5 h-5 text-sand-800" />
          </div>
          <div>
            <h3 className="text-lg font-black text-sand-950 tracking-tight flex items-center gap-2">
              <span>Payment History & Transaction Records</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-900 border border-emerald-300/80">
                {transactions.length} records
              </span>
            </h3>
            <p className="text-xs text-sand-600">
              Complete audit record of shift and overtime disbursements paid via UPI
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {filtered.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-sand-200 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#F5EFE3] rounded-2xl border border-sand-300">
          <span className="text-[11px] font-bold text-sand-600 uppercase tracking-wider">Total Paid Out</span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{formatINR(stats.totalAmount)}</p>
          <span className="text-[10px] text-sand-500">All settled disbursements</span>
        </div>

        <div className="p-3.5 bg-[#F5EFE3] rounded-2xl border border-sand-300">
          <span className="text-[11px] font-bold text-sand-600 uppercase tracking-wider">Total Payments</span>
          <p className="text-xl font-black text-sand-950 mt-0.5">{stats.totalCount}</p>
          <span className="text-[10px] text-sand-500">Recorded payouts</span>
        </div>

        <div className="p-3.5 bg-[#F5EFE3] rounded-2xl border border-sand-300">
          <span className="text-[11px] font-bold text-sand-600 uppercase tracking-wider">Total Shifts Paid</span>
          <p className="text-xl font-black text-sand-900 mt-0.5">{stats.totalShifts}</p>
          <span className="text-[10px] text-sand-500">8-hour shifts</span>
        </div>

        <div className="p-3.5 bg-[#F5EFE3] rounded-2xl border border-sand-300">
          <span className="text-[11px] font-bold text-sand-600 uppercase tracking-wider">Overtime Paid</span>
          <p className="text-xl font-black text-amber-700 mt-0.5">{stats.totalOT} hrs</p>
          <span className="text-[10px] text-sand-500">Rate ÷ 8 per hour</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-sand-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by worker name, phone, UPI ID, or UTR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-semibold text-sand-950 placeholder-sand-500 focus:outline-none focus:ring-2 focus:ring-sand-400 focus:border-sand-500"
        />
      </div>

      {/* Transactions Table / Cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <History className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">No payment records found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Use the Quick Pay console above to calculate and record worker shift & overtime payouts.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View: Clean Card List */}
          <div className="block sm:hidden space-y-3">
            {filtered.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 bg-[#F5EFE3] rounded-2xl border border-sand-300 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sand-900 text-[#FAF6EE] font-bold flex items-center justify-center text-xs">
                      {tx.employeeName?.slice(0, 2).toUpperCase() || 'WP'}
                    </div>
                    <div>
                      <p className="font-bold text-sand-950 text-xs">{tx.employeeName}</p>
                      <p className="text-[10px] text-sand-600">{formatDateTime(tx.initiatedAt)}</p>
                    </div>
                  </div>
                  <span className="font-black text-sand-950 text-sm">
                    {formatINR(tx.amount, true)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-sand-300 text-[11px]">
                  <span className="font-mono text-sand-900 font-semibold bg-[#FAF6EE] px-2 py-0.5 rounded border border-sand-300">
                    {tx.destination?.upiId}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-950 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Paid via UPI</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <span className="text-[11px] text-sand-700 font-medium">
                    {tx.notes || `${tx.shiftsCount || 1} shift + ${tx.overtimeHours || 0}h OT`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(tx)}
                      className="px-2.5 py-1 bg-sand-200 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                      title="Download Payslip PDF"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Slip</span>
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1 text-sand-500 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet View: Table */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-sand-300">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-sand-200 border-b border-sand-300 text-sand-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5">Date & Time</th>
                  <th className="py-3 px-3.5">Employee</th>
                  <th className="py-3 px-3.5">UPI ID (VPA)</th>
                  <th className="py-3 px-3.5">Shift & Overtime Breakdown</th>
                  <th className="py-3 px-3.5">Amount</th>
                  <th className="py-3 px-3.5">Provider Ref / UTR</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/80">
                {filtered.map((tx) => {
                  const isCopied = copiedId === tx.id;
                  const shiftBreakdown =
                    tx.notes ||
                    (tx.shiftsCount
                      ? `${tx.shiftsCount} shift${tx.shiftsCount > 1 ? 's' : ''} (₹${tx.shiftRate || 800}) + ${tx.overtimeHours || 0}h OT (₹${tx.overtimeRate || 100}/hr)`
                      : '1 Shift + Overtime');

                  return (
                    <tr key={tx.id} className="hover:bg-[#F5EFE3] transition-colors">
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-sand-700 font-medium">
                        {formatDateTime(tx.initiatedAt)}
                      </td>

                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sand-900 text-[#FAF6EE] font-bold flex items-center justify-center text-[11px]">
                            {tx.employeeName?.slice(0, 2).toUpperCase() || 'WP'}
                          </div>
                          <div>
                            <p className="font-bold text-sand-950">{tx.employeeName}</p>
                            {tx.employeePhone && (
                              <p className="text-[10px] text-sand-600 font-mono">{tx.employeePhone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-sand-200 px-2 py-1 rounded-md font-mono text-[11px] text-sand-900 font-semibold border border-sand-300">
                          <Smartphone className="w-3 h-3 text-sand-800" />
                          <span>{tx.destination?.upiId || `${tx.employeePhone}@upi`}</span>
                          <button
                            onClick={() => handleCopy(tx.destination?.upiId || '', tx.id)}
                            className="text-sand-600 hover:text-sand-950"
                            title="Copy UPI ID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5">
                        <span className="font-semibold text-sand-800 bg-sand-200 border border-sand-300 text-[11px] px-2 py-0.5 rounded-md inline-block">
                          {shiftBreakdown}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="font-black text-sm text-sand-950">
                          {formatINR(tx.amount, true)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-sand-600">
                          {tx.providerReferenceId || tx.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-950 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Paid via UPI</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownload(tx)}
                            className="px-2.5 py-1 bg-sand-200 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="Download Payslip PDF"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Slip</span>
                          </button>

                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1 text-sand-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

