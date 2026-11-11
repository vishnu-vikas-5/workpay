import React, { useState } from 'react';
import {
  Users,
  Clock,
  AlarmClockCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { QuickPayConsole } from '../components/common/QuickPayConsole';
import { formatINR, formatHours, getPaymentStatusBadge, getShiftStatusBadge } from '../utils/utils';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { role } = useAuth();
  const {
    employees,
    shifts,
    attendance,
    overtimeRequests,
    payrollRecords,
    transactions,
    auditLogs,
  } = useAppData();

  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [filterDept, setFilterDept] = useState<string>('all');

  const activeEmployees = employees.filter((e) => e.status === 'active');
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const workingTodayCount = shifts.filter(
    (s) => s.shiftDate === todayStr && (s.shiftStatus === 'In Progress' || s.shiftStatus === 'Scheduled')
  ).length;

  const totalHoursWorked = shifts.reduce((sum, s) => sum + (s.totalWorkingHours || 0), 0);
  const totalOvertimeHours = overtimeRequests
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + (o.adjustedOvertimeHours ?? o.overtimeHours ?? 0), 0);

  const pendingOvertimeCount = overtimeRequests.filter((o) => o.status === 'pending').length;

  const totalSalaryPayable = payrollRecords
    .filter((p) => p.paymentStatus === 'unpaid')
    .reduce((sum, p) => sum + p.totalPayable, 0);

  const totalPaymentsMade = transactions
    .filter((t) => t.status === 'Successful')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingPaymentsCount = payrollRecords.filter((p) => p.paymentStatus === 'unpaid').length;

  // Chart Data: Weekly Working Hours Breakdown
  const weeklyHoursData = [
    { day: 'Mon', regular: 48, overtime: 8 },
    { day: 'Tue', regular: 52, overtime: 12 },
    { day: 'Wed', regular: 46, overtime: 6 },
    { day: 'Thu', regular: 50, overtime: 9 },
    { day: 'Fri', regular: 54, overtime: 14 },
    { day: 'Sat', regular: 38, overtime: 10 },
    { day: 'Sun', regular: 16, overtime: 4 },
  ];

  // Chart Data: Monthly Payroll Expenditure
  const monthlyExpenditureData = [
    { month: 'Jun', amount: 182000 },
    { month: 'Jul', amount: 215000 },
    { month: 'Aug', amount: 248000 },
    { month: 'Sep', amount: 236000 },
    { month: 'Oct', amount: 289000 },
    { month: 'Nov (Est)', amount: 312000 },
  ];

  // Chart Data: Payment Distribution
  const paymentDistributionData = [
    { name: 'RazorpayX UPI', value: 68, color: '#4f46e5' },
    { name: 'Direct Bank IMPS', value: 24, color: '#06b6d4' },
    { name: 'UPI Intent Manual', value: 8, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            WorkPay Executive Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time shift tracking, automatic overtime calculations & RazorpayX payroll disbursement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs">
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateRange === 'week' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateRange === 'month' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('quarter')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateRange === 'quarter' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quarter
            </button>
          </div>
        </div>
      </div>

      {/* Quick Pay: Shift & Overtime Calculator & Direct UPI Payment Console */}
      <QuickPayConsole />

      {/* Summary KPI Cards Grid (Section 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={activeEmployees.length}
          subtitle={`${employees.length} Total on payroll`}
          icon={Users}
          colorScheme="indigo"
          trend={{ value: '+2 Workers', isPositive: true }}
        />

        <StatCard
          title="Working Today"
          value={workingTodayCount}
          subtitle="Active on shift duty"
          icon={Clock}
          colorScheme="sky"
          trend={{ value: '100% Attendance', isPositive: true }}
        />

        <StatCard
          title="Approved Overtime"
          value={formatHours(totalOvertimeHours)}
          subtitle={`${pendingOvertimeCount} requests awaiting approval`}
          icon={AlarmClockCheck}
          colorScheme="amber"
          trend={{ value: '1.5x Multiplier', isPositive: true }}
        />

        <StatCard
          title="Salary Payable"
          value={formatINR(totalSalaryPayable)}
          subtitle={`${pendingPaymentsCount} payroll records ready`}
          icon={CreditCard}
          colorScheme="rose"
        />
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Settled via RazorpayX</p>
            <h4 className="text-lg font-bold text-emerald-600 mt-1">{formatINR(totalPaymentsMade)}</h4>
            <span className="text-[11px] text-slate-400">100% Verified UTR settled</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Gross Hours Tracked</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">{formatHours(totalHoursWorked)}</h4>
            <span className="text-[11px] text-slate-400">Net after break deductions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Payout Gateway Status</p>
            <h4 className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Automated Disbursal Ready
            </h4>
            <span className="text-[11px] text-slate-400">UPI VPA & Direct IMPS</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts (Section 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Hours Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Working & Overtime Hours</h3>
              <p className="text-xs text-slate-400">Regular shift hours vs calculated overtime</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-600" />
                <span className="text-slate-600">Regular (8h standard)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-slate-600">Overtime (1.5x)</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number) => [`${val} hours`]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="regular" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overtime" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Payment Channel Breakdown</h3>
            <p className="text-xs text-slate-400">RazorpayX disbursement distribution</p>
          </div>

          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val}% of payouts`]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {paymentDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Payroll Expenditure Trend Area Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Payroll Expenditure (INR ₹)</h3>
            <p className="text-xs text-slate-400">Total wage and overtime disbursement trend</p>
          </div>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            Current Run-rate: ₹3.12 Lakhs/mo
          </span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyExpenditureData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorExpenditure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                formatter={(val: number) => [formatINR(val), 'Disbursed']}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorExpenditure)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Grid (Section 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payout Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Automated Payouts</h3>
              <p className="text-xs text-slate-400">Live disbursements via RazorpayX</p>
            </div>
            <button
              onClick={() => onNavigate('/payment-history')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 4).map((tx) => {
              const badge = getPaymentStatusBadge(tx.status);
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {tx.employeeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {tx.employeeName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {tx.providerReferenceId || tx.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">{formatINR(tx.amount)}</p>
                    <span
                      className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Overtime Approvals */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Overtime Queue</h3>
              <p className="text-xs text-slate-400">Approval mandatory before overtime payroll</p>
            </div>
            <button
              onClick={() => onNavigate('/overtime')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Review ({pendingOvertimeCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {overtimeRequests.slice(0, 4).map((ot) => (
              <div key={ot.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {ot.employeeName} ({ot.department})
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {ot.reason || `Worked ${ot.overtimeHours}h extra on ${ot.date}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-amber-600">
                    +{ot.overtimeHours}h ({formatINR(ot.calculatedOvertimeWage)})
                  </span>
                  <div>
                    <span
                      className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        ot.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ot.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {ot.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

