import React, { useState, useMemo } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { GooeyNav, GooeyNavItem } from './components/common/GooeyNav';
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

  // Route routing: Default root '/' is the Main Web Application
  // Dedicated download page is at '/download', '/download.html', or '?download'
  const [viewMode, setViewMode] = useState<'download' | 'app'>(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    if (
      path === '/download' ||
      path === '/download.html' ||
      path.startsWith('/download') ||
      search.includes('download') ||
      hash.includes('download')
    ) {
      return 'download';
    }

    return 'app';
  });

  const handleGoToWebApp = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch (e) {}
    setViewMode('app');
  };

  const handleGoToDownload = () => {
    try {
      window.history.pushState({}, '', '/download');
    } catch (e) {}
    setViewMode('download');
  };

  if (viewMode === 'download') {
    return <DownloadAppPage onGoToWebApp={handleGoToWebApp} />;
  }

  // 1. Initial Authentication Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#EBE2CC] text-[#302C25] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#302C25] flex items-center justify-center text-[#EBE2CC] mx-auto shadow-lg shadow-[#302C25]/20 animate-pulse border border-[#1B1915]">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-[#453F35]">Connecting to WorkPay...</p>
        </div>
      </div>
    );
  }

  // 2. Gatekeeper: Before login, it MUST NOT go to the main page!
  if (!isAuthenticated) {
    return <Login onSuccess={() => refreshAll()} />;
  }

  // 3. Authenticated: Render Main App Dashboard
  const navItems: GooeyNavItem[] = [
    { label: 'Quick Pay', icon: <Zap className="w-3.5 h-3.5" /> },
    { label: 'Attendance & Pay', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { label: 'History', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const mobileNavItems: GooeyNavItem[] = [
    { label: 'Pay', icon: <Zap className="w-4 h-4" /> },
    { label: 'Attend', icon: <CalendarDays className="w-4 h-4" /> },
    { label: 'History', icon: <History className="w-4 h-4" /> },
    {
      label: 'Alarm',
      icon: (
        <div className="relative inline-flex items-center justify-center">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" />
        </div>
      ),
    },
    { label: 'Workers', icon: <Users className="w-4 h-4" /> },
  ];

  const mobileNavActiveIndex = useMemo(() => {
    if (isOvertimeAlarmOpen) return 3;
    if (isManageWorkersOpen) return 4;
    if (activeTab === 'attendance') return 1;
    if (activeTab === 'history') return 2;
    return 0; // quickpay
  }, [isOvertimeAlarmOpen, isManageWorkersOpen, activeTab]);

  const handleMobileNavChange = (index: number) => {
    if (index === 0) {
      setActiveTab('quickpay');
    } else if (index === 1) {
      setActiveTab('attendance');
    } else if (index === 2) {
      setActiveTab('history');
    } else if (index === 3) {
      setIsOvertimeAlarmOpen(true);
    } else if (index === 4) {
      setIsManageWorkersOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE2CC] text-[#302C25] flex flex-col font-sans pb-32 sm:pb-8 selection:bg-[#CFC6B1] selection:text-[#302C25] relative">
      {/* Warm Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#DED6C1]/60 via-transparent to-transparent -z-10" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_80%,_var(--tw-gradient-stops))] from-[#CFC6B1]/45 via-transparent to-transparent -z-10" />

      {/* Sleek Mobile-Optimized Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#DED6C1]/95 backdrop-blur-xl border-b border-[#CFC6B1] shadow-xs px-3 sm:px-6 py-2 sm:py-2.5 pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#302C25] flex items-center justify-center text-[#EBE2CC] shadow-md shadow-[#302C25]/20 shrink-0 border border-[#1B1915]">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#EBE2CC]" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-base sm:text-xl text-[#302C25] tracking-tight whitespace-nowrap">
                  WorkPay
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-[#EBE2CC] text-[#302C25] px-2 py-0.5 rounded-full border border-[#CFC6B1] whitespace-nowrap">
                  PAYROLL PRO
                </span>
              </div>
              <p className="text-[11px] text-[#635B4E] hidden xl:block whitespace-nowrap">
                Manage Shifts • Track Overtime • Pay Smarter
              </p>
            </div>
          </div>

          {/* Desktop GooeyNav Tabs from React Bits */}
          <div className="hidden md:flex items-center shrink-0">
            <GooeyNav
              items={navItems}
              activeIndex={activeTab === 'quickpay' ? 0 : activeTab === 'attendance' ? 1 : 2}
              onChange={(index) => {
                if (index === 0) setActiveTab('quickpay');
                else if (index === 1) setActiveTab('attendance');
                else if (index === 2) setActiveTab('history');
              }}
              theme="light"
              size="sm"
              color="#302C25"
              activeTextColor="#FAF6EE"
              colors={['#302C25', '#453E34', '#5C5346', '#1B1915']}
              frame={true}
              particleCount={16}
              spread={54}
              animationTime={600}
              timeVariance={280}
              gooeyness={0.55}
              wobble={0.45}
              hoverEffect={true}
            />
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Get APK Button */}
            <button
              onClick={handleGoToDownload}
              className="hidden lg:flex px-2.5 py-1.5 text-xs font-bold text-[#302C25] bg-[#EBE2CC] hover:bg-[#CFC6B1] rounded-xl border border-[#CFC6B1] transition-all items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title="Download Android APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#302C25]" />
              <span>Get APK</span>
            </button>

            {/* Shift & OT Alarm Button (Hidden on Mobile, Available in Mobile Bottom Dock) */}
            <button
              onClick={() => setIsOvertimeAlarmOpen(true)}
              className="hidden sm:flex px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-[#302C25] bg-[#EBE2CC] hover:bg-[#CFC6B1] rounded-xl border border-[#CFC6B1] transition-all items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title="Set Daily Shift End Alarm or Overtime Alarm"
            >
              <Bell className="w-3.5 h-3.5 text-[#736B5C] animate-bounce" />
              <span>Alarm</span>
            </button>

            {/* Cloud Sync Status & Trigger */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isSyncing
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                  : syncNotice
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-[#302C25] hover:text-[#1B1915] bg-[#EBE2CC] hover:bg-[#CFC6B1] border border-[#CFC6B1]'
              }`}
              title="Sync phone and laptop records via cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-700' : syncNotice ? 'text-emerald-700' : 'text-[#736B5C]'}`} />
              <span className="hidden sm:inline">{syncNotice || (isSyncing ? 'Syncing...' : 'Sync Cloud')}</span>
            </button>

            {/* Logged In User Profile & Sign Out Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-1.5 py-1 sm:py-1.5 bg-[#EBE2CC] hover:bg-[#CFC6B1]/70 rounded-xl border border-[#CFC6B1] shrink-0 shadow-2xs transition-colors">
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt="avatar"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#B7B09E] shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#302C25] text-[#EBE2CC] text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span
                className="text-xs font-bold text-[#302C25] max-w-[85px] sm:max-w-[120px] truncate"
                title={user?.name || user?.email || 'Logged In User'}
              >
                {user?.name || user?.email?.split('@')[0] || 'Account'}
              </span>
              <button
                onClick={logout}
                className="p-1 sm:p-1.5 text-[#635B4E] hover:text-rose-700 hover:bg-[#CFC6B1] rounded-lg transition-all flex items-center gap-1 shrink-0 border border-transparent hover:border-[#B7B09E]"
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
      <footer className="bg-[#DED6C1] border-t border-[#CFC6B1] py-4 sm:py-6 px-4 text-center text-xs text-[#635B4E] mt-auto hidden sm:block">
        <p className="font-medium">
          <span className="font-bold text-[#302C25]">WorkPay</span> – Worker Shift, Overtime & UPI Payout Platform
        </p>
        <p className="text-[11px] text-[#736B5C] mt-0.5">
          Standard 8-hour shift • Overtime calculated at (Shift Rate ÷ 8) per hour • Direct UPI Redirection & QR Settlement
        </p>
      </footer>

      {/* Liquid GooeyNav Floating Mobile Dock (Web & Android APK) */}
      <div className="fixed bottom-3 inset-x-2 z-40 md:hidden flex justify-center pointer-events-none pb-safe">
        <div className="pointer-events-auto w-full max-w-sm sm:max-w-md shadow-2xl rounded-full">
          <GooeyNav
            items={mobileNavItems}
            activeIndex={mobileNavActiveIndex}
            onChange={handleMobileNavChange}
            theme="light"
            size="mobile"
            color="#302C25"
            activeTextColor="#FAF6EE"
            colors={['#302C25', '#453E34', '#5C5346', '#1B1915']}
            frame={true}
            particleCount={16}
            spread={48}
            animationTime={550}
            timeVariance={240}
            gooeyness={0.6}
            wobble={0.45}
            hoverEffect={true}
            className="w-full"
          />
        </div>
      </div>

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
