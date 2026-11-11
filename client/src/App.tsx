import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Dashboard } from './pages/Dashboard';
import { QuickPayPage } from './pages/QuickPayPage';
import { Employees } from './pages/Employees';
import { ShiftCalendar } from './pages/ShiftCalendar';
import { Attendance } from './pages/Attendance';
import { Overtime } from './pages/Overtime';
import { Payroll } from './pages/Payroll';
import { PaymentProcessing } from './pages/PaymentProcessing';
import { PaymentHistory } from './pages/PaymentHistory';
import { Reports } from './pages/Reports';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeePaymentHistory } from './pages/EmployeePaymentHistory';
import { Login } from './pages/Login';

export const App: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.hash.replace('#', '') || '/';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [payoutTargetPayrollId, setPayoutTargetPayrollId] = useState<string | undefined>(undefined);

  // Sync with browser hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      setCurrentPath(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Role Protection: Ensure employee stays within worker pages
  useEffect(() => {
    if (role === 'employee') {
      const allowed = ['/employee-dashboard', '/shifts', '/attendance', '/employee-payments', '/notifications', '/quick-pay'];
      if (!allowed.includes(currentPath)) {
        navigate('/employee-dashboard');
      }
    } else if (currentPath === '/employee-dashboard' || currentPath === '/employee-payments') {
      navigate('/');
    }
  }, [role, currentPath]);

  // Render Page Content
  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return <Dashboard onNavigate={navigate} />;
      case '/quick-pay':
        return <QuickPayPage />;
      case '/login':
        return <Login onSuccess={() => navigate('/')} />;
      case '/employees':
        return <Employees />;
      case '/shifts':
        return <ShiftCalendar />;
      case '/attendance':
        return <Attendance />;
      case '/overtime':
        return <Overtime />;
      case '/payroll':
        return (
          <Payroll
            onNavigateToPayment={(payrollId) => {
              setPayoutTargetPayrollId(payrollId);
              navigate('/payments');
            }}
          />
        );
      case '/payments':
        return (
          <PaymentProcessing
            initialPayrollId={payoutTargetPayrollId}
            onNavigateToHistory={() => navigate('/payment-history')}
          />
        );
      case '/payment-history':
        return <PaymentHistory />;
      case '/reports':
        return <Reports />;
      case '/notifications':
        return <NotificationsPage onNavigate={navigate} />;
      case '/settings':
        return <SettingsPage />;
      case '/audit-logs':
        return <AuditLogsPage />;
      case '/employee-dashboard':
        return <EmployeeDashboard onNavigate={navigate} />;
      case '/employee-payments':
        return <EmployeePaymentHistory />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onNavigate={navigate}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
