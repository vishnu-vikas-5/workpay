import React, { useState } from 'react';
import {
  Zap,
  Users,
  Banknote,
  Clock,
  ArrowRight,
  ExternalLink,
  QrCode,
  CheckCircle2,
  Phone,
  Search,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { QuickPayConsole } from '../components/common/QuickPayConsole';
import { EmployeeModal } from '../components/modals/EmployeeModal';
import { formatINR, formatTimestamp } from '../utils/utils';

export const QuickPayPage: React.FC = () => {
  const { employees, transactions } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const filteredEmployees = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone.includes(searchTerm) ||
      (e.upiId && e.upiId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const recentDirectTransactions = transactions
    .filter((t) => t.paymentMethod === 'upi_intent_manual' || t.paymentMethod === 'razorpayx_upi')
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200/60 mb-1">
            <Zap className="w-3.5 h-3.5 text-brand-600 fill-brand-600" />
            <span>Instant Worker Payout Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quick Pay: Shift & Overtime Calculator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Add employee details, specify shifts & overtime, auto-calculate wages, and pay directly via UPI.
          </p>
        </div>

        <button
          onClick={() => setIsAddEmployeeOpen(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Zap className="w-4 h-4" />
          <span>+ Add New Employee</span>
        </button>
      </div>

      {/* Main Quick Pay Interactive Console */}
      <QuickPayConsole />

      {/* Worker Quick Rates Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registered Worker Rates & UPI Directory</h2>
            <p className="text-xs text-slate-400">
              Shift rate is for 8 hours. Overtime is strictly (Shift Rate ÷ 8) per hour.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by worker or UPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Worker Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">UPI ID</th>
                <th className="py-2.5 px-3">8-Hour Shift Rate</th>
                <th className="py-2.5 px-3">Overtime Rate (Rate ÷ 8)</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const shiftRate = emp.shiftRate || emp.hourlyWage * 8;
                const otRate = Math.round((shiftRate / 8) * 100) / 100;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        {emp.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{emp.fullName}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{emp.phone}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md font-semibold border border-brand-100">
                        {emp.upiId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatINR(shiftRate)} <span className="text-[10px] text-slate-400 font-normal">/ 8h shift</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700">
                      {formatINR(otRate)} <span className="text-[10px] text-emerald-600 font-normal">/ hr</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <EmployeeModal isOpen={isAddEmployeeOpen} onClose={() => setIsAddEmployeeOpen(false)} />
    </div>
  );
};
