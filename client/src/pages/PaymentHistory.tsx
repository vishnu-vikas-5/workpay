import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  FileText,
  CreditCard,
  Building,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { PaymentTransaction } from '../types';
import {
  formatINR,
  maskAccountNumber,
  maskUpiId,
  getPaymentStatusBadge,
} from '../utils/utils';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';

export const PaymentHistory: React.FC = () => {
  const { role } = useAuth();
  const { transactions, payrollRecords, employees } = useAppData();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        tx.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        tx.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        (tx.providerReferenceId && tx.providerReferenceId.toLowerCase().includes(search.toLowerCase())) ||
        tx.payrollId.toLowerCase().includes(search.toLowerCase());

      const matchStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      const matchMethod = selectedMethod === 'all' || tx.paymentMethod === selectedMethod;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [transactions, search, selectedStatus, selectedMethod]);

  const totalSettled = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'Successful')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const handleDownloadReceipt = (tx: PaymentTransaction) => {
    const payroll = payrollRecords.find((p) => p.id === tx.payrollId);
    const employee = employees.find((e) => e.id === tx.employeeId);
    generatePaymentReceiptPDF(tx, payroll, employee);
  };

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredTransactions.map((tx) => ({
      'Transaction ID': tx.id,
      'Provider Ref / UTR': tx.providerReferenceId || 'N/A',
      'Employee Code': tx.employeeCode,
      'Employee Name': tx.employeeName,
      'Amount (INR)': tx.amount,
      'Payment Method': tx.paymentMethod,
      'Destination Type': tx.destination.type,
      'Destination Address':
        tx.destination.type === 'vpa'
          ? tx.destination.upiId
          : maskAccountNumber(tx.destination.accountNumber || tx.destination.maskedAccount),
      'Bank / IFSC': tx.destination.ifsc || 'UPI',
      'Status': tx.status,
      'Initiated At': new Date(tx.initiatedAt).toLocaleString('en-IN'),
      'Initiated By': tx.initiatedBy,
      'Failure Reason': tx.failureReason || 'None',
    }));

    if (type === 'xlsx') {
      exportToExcel(data, `WorkPay_Payout_Ledger_${new Date().toISOString().split('T')[0]}`);
    } else {
      exportToCSV(data, `WorkPay_Payout_Ledger_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Disbursement & Transaction Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable financial history, bank reference UTRs, and electronic PDF payment vouchers
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
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Settled via RazorpayX</p>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalSettled)}</h4>
            <span className="text-[11px] text-slate-400">All successful payout transfers</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Transactions</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{transactions.length} Records</h4>
            <span className="text-[11px] text-slate-400">Verified by banking gateway</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Audit Immutability</p>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Append-Only Ledger</h4>
            <span className="text-[11px] text-slate-400">Strictly tamper-evident</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker, UTR, Txn ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Successful">Successful</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
            <option value="Reversed">Reversed</option>
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Channels</option>
            <option value="razorpayx_upi">RazorpayX UPI</option>
            <option value="razorpayx_bank_transfer">Direct IMPS</option>
            <option value="upi_intent_manual">UPI Intent</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Transaction ID / UTR</th>
                <th className="py-3 px-4">Worker & Beneficiary</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Channel & Route</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const badge = getPaymentStatusBadge(tx.status);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-900">{tx.id}</p>
                        <p className="font-mono text-[11px] text-brand-600">
                          {tx.providerReferenceId || 'Pending UTR'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{tx.employeeName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {tx.destination.type === 'vpa'
                            ? maskUpiId(tx.destination.upiId)
                            : maskAccountNumber(tx.destination.accountNumber || tx.destination.maskedAccount)}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          {tx.paymentMethod === 'razorpayx_upi' ? (
                            <Smartphone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          ) : (
                            <Building className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          )}
                          <span className="capitalize">
                            {tx.paymentMethod.replace('razorpayx_', '').replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.initiatedAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(tx.initiatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            title="Audit Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(tx)}
                            title="Download PDF Payment Receipt"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Transaction Details</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTx.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Provider Ref (UTR / RRN):</span>
                  <span className="font-mono font-bold text-brand-600">
                    {selectedTx.providerReferenceId || 'WP-UTR-PENDING'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Razorpay Payout ID:</span>
                  <span className="font-mono text-slate-700">
                    {selectedTx.razorpayPayoutId || 'pout_demo'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Amount Settled:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatINR(selectedTx.amount, true)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Worker:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTx.employeeName} ({selectedTx.employeeCode})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {selectedTx.destination.type === 'vpa'
                      ? `UPI: ${selectedTx.destination.upiId}`
                      : `A/C: ${maskAccountNumber(selectedTx.destination.accountNumber || selectedTx.destination.maskedAccount)} (${selectedTx.destination.ifsc})`}
                  </span>
                </div>
              </div>

              {/* Webhook Audit Timeline */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Verified Webhook Audit Log
                </p>
                <div className="space-y-3 border-l-2 border-indigo-200 ml-2 pl-3">
                  {selectedTx.webhookLogs?.map((log, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <p className="font-bold text-slate-900">{log.event}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <p className="text-slate-600 mt-0.5">{log.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => handleDownloadReceipt(selectedTx)}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
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

