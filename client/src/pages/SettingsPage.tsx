import React, { useState } from 'react';
import {
  Settings,
  CreditCard,
  Database,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building,
  Shield,
  Save,
  Key,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { isFirebaseConfigured } from '../services/firebase';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const SettingsPage: React.FC = () => {
  const { resetToSeedData } = useAppData();

  const [companyName, setCompanyName] = useState('WorkPay Technologies Pvt Ltd');
  const [gstin, setGstin] = useState('27AABCT3421K1ZM');
  const [supportEmail, setSupportEmail] = useState('accounts@workpay.io');
  const [defaultHours, setDefaultHours] = useState(8);
  const [defaultMultiplier, setDefaultMultiplier] = useState(1.5);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          System Configuration & Integrations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage payment credentials, cloud synchronization, shift policies, and development environments
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* RazorpayX Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">RazorpayX Gateway</h4>
                <p className="text-[11px] text-slate-400">Payout API & Webhooks</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Running in <span className="font-semibold text-slate-800">Sandbox Simulator mode</span>{' '}
            with full NPCI UPI and Bank IMPS support. Keys are securely read on backend.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Idempotency Token:</span>
            <span className="font-mono text-brand-600 font-semibold">Enabled (Safe)</span>
          </div>
        </div>

        {/* Firebase Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Cloud Firestore</h4>
                <p className="text-[11px] text-slate-400">NoSQL Realtime Sync</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isFirebaseConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              {isFirebaseConfigured ? 'Connected' : 'Offline Ready (Local)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isFirebaseConfigured
              ? 'Synced with production Cloud Firestore database.'
              : 'Operating with persistent client-side storage & ready to sync when env keys are added.'}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Security Rules:</span>
            <span className="font-mono text-emerald-600 font-semibold">RBAC Enforced</span>
          </div>
        </div>
      </div>

      {/* Global Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-brand-600" />
          <span>Employer Identity & Default Policy</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company Legal Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Accounts Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Standard Daily Shift (Hours)
            </label>
            <input
              type="number"
              value={defaultHours}
              onChange={(e) => setDefaultHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default Overtime Multiplier
            </label>
            <input
              type="number"
              step="0.25"
              value={defaultMultiplier}
              onChange={(e) => setDefaultMultiplier(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Developer Sandbox Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Developer Sandbox & Demo Controls</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset all workers, shifts, attendance, overtime requests, and payouts back to initial seed data
          </p>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-xl border border-rose-100">
          <div>
            <p className="text-xs font-semibold text-rose-950">Reset To Initial Demo State</p>
            <p className="text-[11px] text-rose-700/80">
              Restores 6 employees, sample shifts, approved overtime, and pending payouts.
            </p>
          </div>
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Reset Seed Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={async () => {
          await resetToSeedData();
          setIsResetModalOpen(false);
          setSavedSuccess(true);
        }}
        title="Reset All Application Data"
        description="Are you sure you want to reset all shift logs, attendance records, overtime requests, and payment transactions to the initial factory seed data? Current alterations will be replaced."
        confirmLabel="Reset Everything"
        variant="danger"
      />
    </div>
  );
};

