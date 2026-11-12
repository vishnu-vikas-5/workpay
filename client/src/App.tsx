import React, { useState } from 'react';
import {
  CreditCard,
  Zap,
  History,
  Users,
  CalendarDays,
  LogOut,
  Smartphone,
  RefreshCw,
  Bell,
  Clock,
} from 'lucide-react';
import { QuickPayConsole } from './components/common/QuickPayConsole';
import { AttendanceSection } from './components/common/AttendanceSection';
import { PaymentHistorySection } from './components/common/PaymentHistorySection';
import { EmployeeModal } from './components/modals/EmployeeModal';
import { ManageEmployeesModal } from './components/modals/ManageEmployeesModal';
import { OvertimeAlarmModal } from './components/modals/OvertimeAlarmModal';
import { RingingAlarmModal } from './components/common/RingingAlarmModal';
import { ActiveAlarmPill } from './components/common/ActiveAlarmPill';
import { Login } from './pages/Login';
import { DownloadAppPage } from './pages/DownloadAppPage';
import { Employee } from './types';
import { useAppData } from './context/AppDataContext';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { employees, refreshAll, syncWithCloud, isSyncing } = useAppData();
  const { user, isAuthenticated, authLoading, firebaseUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'quickpay' | 'attendance' | 'history'>('quickpay');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [isOvertimeAlarmOpen, setIsOvertimeAlarmOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleManualSync = async () => {
    try {
      const res = await syncWithCloud();
      setSyncNotice(`Synced (${res.pulled} in, ${res.pushed} out)`);
      setTimeout(() => setSyncNotice(null), 3000);
    } catch (e: any) {
      setSyncNotice('Sync failed');
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  // 0. The Download Page is now the INDEX (default landing page at '/')!
  // Direct web portal access is available via '/app', '/portal', '/dashboard', '/login', '?app', or by clicking 'Open Web App'
  const [viewMode, setViewMode] = useState<'download' | 'app'>(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // Explicit requests for web app/portal
    if (
      path === '/app' ||
      path.startsWith('/app/') ||
      path === '/portal' ||
      path === '/dashboard' ||
      path === '/login' ||
      search.includes('app') ||
      search.includes('portal') ||
      hash.includes('app') ||
      hash.includes('portal')
    ) {
      return 'app';
    }

    // Default root '/' and any explicit download paths show DownloadAppPage as the index!
    return 'download';
  });

  const handleGoToWebApp = () => {
    try {
      window.history.pushState({}, '', '/app');
    } catch (e) {}
    setViewMode('app');
  };

  const handleGoToDownload = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch (e) {}
    setViewMode('download');
  };

  if (viewMode === 'download') {
    return <DownloadAppPage onGoToWebApp={handleGoToWebApp} />;
  }

  // 1. Initial Authentication Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/20 animate-pulse">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700">Connecting to WorkPay...</p>
        </div>
      </div>
    );
  }

  // 2. Gatekeeper: Before login, it MUST NOT go to the main page!
  if (!isAuthenticated) {
    return <Login onSuccess={() => refreshAll()} />;
  }

  // 3. Authenticated: Render Main App Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-32 sm:pb-8">
      {/* Sleek Mobile-Optimized Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight whitespace-nowrap">
                  WorkPay
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200 whitespace-nowrap">
                  PAYROLL PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block whitespace-nowrap">
                Manage Shifts • Track Overtime • Pay Smarter
              </p>
            </div>
          </div>

          {/* Desktop Top Tabs */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('quickpay')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'quickpay'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick Pay</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance & Weekly Pay</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Shift & OT Alarm Button */}
            <button
              onClick={() => setIsOvertimeAlarmOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-300 transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title="Set Daily Shift End Alarm or Overtime Alarm"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
              <span>Alarm</span>
            </button>

            {/* Cloud Sync Status & Trigger */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isSyncing
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                  : syncNotice
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80'
              }`}
              title="Sync phone and laptop records via cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : syncNotice ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{syncNotice || (isSyncing ? 'Syncing...' : 'Sync Cloud')}</span>
            </button>

            {/* Logged In User Profile & Sign Out Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-1.5 py-1 sm:py-1.5 bg-slate-100/90 hover:bg-slate-100 rounded-xl border border-slate-200/90 shrink-0 shadow-2xs">
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt="avatar"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-300 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-600 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span
                className="text-xs font-bold text-slate-800 max-w-[85px] sm:max-w-[120px] truncate"
                title={user?.name || user?.email || 'Logged In User'}
              >
                {user?.name || user?.email?.split('@')[0] || 'Account'}
              </span>
              <button
                onClick={logout}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all flex items-center gap-1 shrink-0 border border-transparent hover:border-slate-200"
                title="Sign Out of WorkPay"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] font-bold hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Single Page View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Tab 1: Quick Pay Console */}
        {activeTab === 'quickpay' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <QuickPayConsole />
            <div className="pt-2">
              <PaymentHistorySection />
            </div>
          </div>
        )}

        {/* Tab 2: Attendance & Weekly Payout */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <AttendanceSection />
          </div>
        )}

        {/* Tab 3: Payment History */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-150">
            <PaymentHistorySection />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 sm:py-6 px-4 text-center text-xs text-slate-500 mt-auto hidden sm:block">
        <p className="font-medium">
          <span className="font-bold text-slate-700">WorkPay</span> – Worker Shift, Overtime & UPI Payout Platform
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Standard 8-hour shift • Overtime calculated at (Shift Rate ÷ 8) per hour • Direct UPI Redirection & QR Settlement
        </p>
      </footer>

      {/* Fixed Native-Style Bottom Navigation for Mobile Devices */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1 px-1 grid grid-cols-5 md:hidden pb-safe shadow-lg">
        <button
          onClick={() => setActiveTab('quickpay')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-colors ${
            activeTab === 'quickpay' ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Quick Pay</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-colors ${
            activeTab === 'attendance' ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-colors ${
            activeTab === 'history' ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] leading-tight">History</span>
        </button>

        <button
          onClick={() => setIsOvertimeAlarmOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-amber-600 hover:text-amber-700 font-bold"
        >
          <Bell className="w-4 h-4 animate-bounce" />
          <span className="text-[10px] leading-tight">Alarm</span>
        </button>

        <button
          onClick={() => setIsManageWorkersOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-slate-400 hover:text-slate-700 font-medium"
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Workers</span>
        </button>
      </nav>

      {/* Floating Active Overtime Timer Pill */}
      <ActiveAlarmPill onOpenModal={() => setIsOvertimeAlarmOpen(true)} />

      {/* Real-Time Ringing Alarm Pop-up Modal */}
      <RingingAlarmModal />

      {/* Global Overtime Alarm & Reminder Modal */}
      <OvertimeAlarmModal
        isOpen={isOvertimeAlarmOpen}
        onClose={() => setIsOvertimeAlarmOpen(false)}
      />

      {/* Global Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isAddEmployeeOpen}
        employeeToEdit={employeeToEdit}
        onClose={() => {
          setIsAddEmployeeOpen(false);
          setEmployeeToEdit(null);
        }}
      />

      {/* Global Manage Employees Modal */}
      <ManageEmployeesModal
        isOpen={isManageWorkersOpen}
        onClose={() => setIsManageWorkersOpen(false)}
        onAddNew={() => {
          setEmployeeToEdit(null);
          setIsAddEmployeeOpen(true);
        }}
        onEdit={(emp) => {
          setEmployeeToEdit(emp);
          setIsAddEmployeeOpen(true);
        }}
      />
    </div>
  );
};

export default App;
