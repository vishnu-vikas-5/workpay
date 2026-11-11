import React from 'react';
import {
  LayoutDashboard,
  Zap,
  Users,
  CalendarDays,
  Clock,
  AlarmClockCheck,
  Calculator,
  CreditCard,
  History,
  BarChart3,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCheck,
  Briefcase,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const { role, user } = useAuth();

  const handleNav = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  const navItems = [
    // Quick Pay directly accessible to all
    { name: '⚡ Quick Pay & Calc', path: '/quick-pay', icon: Zap },
    // Admin & Manager common
    ...(role === 'admin'
      ? [
          { name: 'Admin Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Employees', path: '/employees', icon: Users },
          { name: 'Shift Calendar', path: '/shifts', icon: CalendarDays },
          { name: 'Attendance', path: '/attendance', icon: Clock },
          { name: 'Overtime Approvals', path: '/overtime', icon: AlarmClockCheck },
          { name: 'Payroll Management', path: '/payroll', icon: Calculator },
          { name: 'Payment Processing', path: '/payments', icon: CreditCard },
          { name: 'Payment History', path: '/payment-history', icon: History },
          { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
          { name: 'Audit Logs', path: '/audit-logs', icon: ScrollText },
          { name: 'Settings & Config', path: '/settings', icon: Settings },
        ]
      : role === 'manager'
      ? [
          { name: 'Manager Overview', path: '/', icon: LayoutDashboard },
          { name: 'Assigned Workers', path: '/employees', icon: Users },
          { name: 'Shift Scheduling', path: '/shifts', icon: CalendarDays },
          { name: 'Attendance Logging', path: '/attendance', icon: Clock },
          { name: 'Overtime Review', path: '/overtime', icon: AlarmClockCheck },
          { name: 'Team Reports', path: '/reports', icon: BarChart3 },
        ]
      : [
          // Employee portal
          { name: 'My Dashboard', path: '/employee-dashboard', icon: LayoutDashboard },
          { name: 'My Shift Schedule', path: '/shifts', icon: CalendarDays },
          { name: 'My Attendance', path: '/attendance', icon: Clock },
          { name: 'My Payments & Payslips', path: '/employee-payments', icon: History },
        ]),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">WorkPay</span>
              <span className="text-[10px] font-semibold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full border border-brand-200">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">Shift & Payroll SaaS</p>
          </div>
        </div>

        {/* Current Role Banner */}
        <div className="px-4 py-3 mx-3 my-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
              role === 'admin'
                ? 'bg-indigo-600'
                : role === 'manager'
                ? 'bg-amber-600'
                : 'bg-emerald-600'
            }`}
          >
            {role === 'admin' ? (
              <ShieldCheck className="w-4 h-4" />
            ) : role === 'manager' ? (
              <Briefcase className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate capitalize">
              {role} Portal
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.name}</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-brand-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Bottom Tagline & RazorpayX Badge */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-xl border border-indigo-100/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>RazorpayX Payouts</span>
            </div>
            <p className="text-[11px] text-indigo-700/80 leading-relaxed">
              Automated UPI & Direct Bank IMPS salary settlements.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

