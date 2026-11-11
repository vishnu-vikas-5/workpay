import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Briefcase,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(selectedRole, email || undefined);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole, demoEmail: string) => {
    setLoading(true);
    try {
      await login(role, demoEmail);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-500/20 mb-3">
          <CreditCard className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">WorkPay</h2>
        <p className="text-xs font-semibold text-brand-600 mt-0.5">
          Manage Shifts. Track Overtime. Pay Smarter.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Modern Worker Shift, Overtime & RazorpayX Payroll SaaS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200/80 sm:rounded-3xl sm:px-10 space-y-6">
          {/* Quick Demo Access Header */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Instant Persona Login (1-Click)</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Select any role to test full workflows without typing credentials:
            </p>

            <div className="space-y-2.5">
              {/* Admin Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin@workpay.io')}
                className="w-full p-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-left flex items-center justify-between transition-all group hover:border-indigo-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Administrator</p>
                    <p className="text-[11px] text-slate-500">
                      Full access: Rosters, overtime approvals, payouts
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Manager Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('manager', 'manager@workpay.io')}
                className="w-full p-3 rounded-2xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 text-left flex items-center justify-between transition-all group hover:border-amber-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Shift Manager</p>
                    <p className="text-[11px] text-slate-500">
                      Assign shifts, log attendance, submit overtime
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Employee Persona */}
              <button
                type="button"
                onClick={() => handleQuickLogin('employee', 'rajesh@workpay.io')}
                className="w-full p-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-left flex items-center justify-between transition-all group hover:border-emerald-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Rajesh Kumar (Worker)</p>
                    <p className="text-[11px] text-slate-500">
                      View shifts, clock logs, personal payslips & UTRs
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold text-[10px]">
                Or Sign In with Email
              </span>
            </div>
          </div>

          {/* Custom Credentials Form */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Sign-In Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="admin">Administrator</option>
                <option value="manager">Shift Manager</option>
                <option value="employee">Employee / Worker</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="name@workpay.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to WorkPay'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

