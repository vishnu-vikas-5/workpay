import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Users,
  Clock,
  AlarmClockCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useAppData } from '../context/AppDataContext';
import { formatINR, formatHours } from '../utils/utils';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

export const Reports: React.FC = () => {
  const { employees, shifts, overtimeRequests, payrollRecords, transactions, departments } =
    useAppData();

  const [activeTab, setActiveTab] = useState<'attendance' | 'overtime' | 'department' | 'payments'>(
    'attendance'
  );

  // Department-wise payroll aggregation
  const departmentPayrollData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of departments) {
      map.set(d.name, 0);
    }
    for (const p of payrollRecords) {
      const cur = map.get(p.department) || 0;
      map.set(p.department, cur + p.totalPayable);
    }
    return Array.from(map.entries()).map(([dept, amount]) => ({
      department: dept.split(' ')[0], // short label
      fullName: dept,
      amount,
    }));
  }, [payrollRecords, departments]);

  // Overtime summary per employee
  const workerOvertimeData = useMemo(() => {
    return employees.map((emp) => {
      const approvedOT = overtimeRequests
        .filter((o) => o.employeeId === emp.id && o.status === 'approved')
        .reduce((sum, o) => sum + (o.adjustedOvertimeHours ?? o.overtimeHours ?? 0), 0);
      const otWages = overtimeRequests
        .filter((o) => o.employeeId === emp.id && o.status === 'approved')
        .reduce((sum, o) => sum + (o.adjustedOvertimeWage ?? o.calculatedOvertimeWage ?? 0), 0);

      return {
        name: emp.fullName.split(' ')[0],
        fullName: emp.fullName,
        hours: approvedOT,
        wages: otWages,
      };
    });
  }, [employees, overtimeRequests]);

  const handleExport = (type: 'xlsx' | 'csv') => {
    let data: any[] = [];
    let filename = `WorkPay_Report_${activeTab}`;

    if (activeTab === 'attendance') {
      data = shifts.map((s) => ({
        Shift: s.shiftCode,
        Worker: s.employeeName,
        Department: s.department,
        Date: s.shiftDate,
        'Scheduled Hours': `${s.scheduledStartTime} - ${s.scheduledEndTime}`,
        'Actual Hours': `${s.actualClockIn || 'N/A'} - ${s.actualClockOut || 'N/A'}`,
        'Total Hours': s.totalWorkingHours,
        'Regular Hours': s.regularHours,
        'Overtime Hours': s.overtimeHours,
        Status: s.shiftStatus,
      }));
    } else if (activeTab === 'overtime') {
      data = overtimeRequests.map((o) => ({
        Worker: o.employeeName,
        Department: o.department,
        Date: o.date,
        'Overtime Hours': o.adjustedOvertimeHours ?? o.overtimeHours,
        'Hourly Wage': o.hourlyWage,
        Multiplier: o.overtimeMultiplier,
        'Calculated OT Wage': o.adjustedOvertimeWage ?? o.calculatedOvertimeWage,
        Status: o.status,
      }));
    } else if (activeTab === 'department') {
      data = departmentPayrollData.map((d) => ({
        Department: d.fullName,
        'Total Payroll Expenditure (INR)': d.amount,
      }));
    } else {
      data = transactions.map((t) => ({
        'Transaction ID': t.id,
        'Provider Ref (UTR)': t.providerReferenceId || 'Pending',
        Worker: t.employeeName,
        Amount: t.amount,
        Method: t.paymentMethod,
        Status: t.status,
        Date: t.initiatedAt,
      }));
    }

    if (type === 'xlsx') {
      exportToExcel(data, filename);
    } else {
      exportToCSV(data, filename);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Workforce & Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated attendance, overtime wage distribution, department cost centers, and exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
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

      {/* Report Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs max-w-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'attendance'
              ? 'bg-brand-50 text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance & Shifts
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'overtime'
              ? 'bg-brand-50 text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overtime Hours
        </button>
        <button
          onClick={() => setActiveTab('department')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'department'
              ? 'bg-brand-50 text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Department Cost
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'payments'
              ? 'bg-brand-50 text-brand-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Disbursement Ledger
        </button>
      </div>

      {/* Department Cost Visualization */}
      {activeTab === 'department' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Department-Wise Payroll Distribution (INR ₹)
            </h3>
            <p className="text-xs text-slate-400">Total wage allocation across functional teams</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPayrollData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatINR(val), 'Disbursed Payroll']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Overtime Analysis Visualization */}
      {activeTab === 'overtime' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Worker Overtime Load & Wages</h3>
            <p className="text-xs text-slate-400">Approved overtime hours per employee</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workerOvertimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    name === 'hours' ? `${val} hrs` : formatINR(val),
                    name === 'hours' ? 'Overtime Hours' : 'Overtime Wages',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="hours" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Report Data Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 capitalize">{activeTab} Dataset</h3>
          <span className="text-xs text-slate-400">Ready for instant .XLSX / .CSV download</span>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'department' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Department Cost Center</th>
                  <th className="py-3 px-4 text-right">Total Net Expenditure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentPayrollData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.fullName}</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600">
                      {formatINR(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'overtime' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Approved OT Hours</th>
                  <th className="py-3 px-4 text-right">Calculated OT Wages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerOvertimeData.map((w, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{w.fullName}</td>
                    <td className="py-3 px-4 font-bold text-amber-600">+{w.hours} hrs</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(w.wages)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Identifier</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Metric / Status</th>
                  <th className="py-3 px-4 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.slice(0, 8).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-brand-600 font-medium">
                      {s.shiftCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.employeeName}</td>
                    <td className="py-3 px-4 capitalize">{s.shiftStatus}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {s.totalWorkingHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

