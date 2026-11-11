import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  Download,
  Clock,
  User,
  Info,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = useAppData();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());

    const matchType = selectedType === 'all' || log.entityType === selectedType;

    return matchSearch && matchType;
  });

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      Action: l.action,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId,
      'Performed By': l.performedBy,
      Role: l.performedByRole,
      Details: JSON.stringify(l.details),
    }));

    if (type === 'xlsx') {
      exportToExcel(data, `WorkPay_Audit_Trail_${new Date().toISOString().split('T')[0]}`);
    } else {
      exportToCSV(data, `WorkPay_Audit_Trail_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Security & Compliance Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, non-repudiable log of all shift alterations, overtime adjustments, and salary payouts
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">All Entity Domains</option>
            <option value="payment">Payment Disbursements</option>
            <option value="overtime">Overtime Approvals</option>
            <option value="shift">Shift Assignments</option>
            <option value="employee">Worker Profiles</option>
            <option value="auth">Authentication</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Structured Audit Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-brand-600 text-[11px]">
                    {log.entityId}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">{log.performedBy}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{log.performedByRole}</span>
                  </td>
                  <td className="py-3 px-4">
                    <pre className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-700 max-w-sm overflow-x-auto">
                      {JSON.stringify(log.details)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

