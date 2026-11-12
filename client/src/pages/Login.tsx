import React, { useState } from 'react';
import {
  CreditCard,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        const res = await signInWithEmail(email, password);
        if (res.success) {
          setSuccessMessage('Successfully signed in!');
          setTimeout(() => onSuccess(), 800);
        } else {
          setErrorMessage(res.error || 'Invalid credentials.');
        }
      } else {
        const res = await signUpWithEmail(email, password, displayName);
        if (res.success) {
          setSuccessMessage('Account created successfully!');
          setTimeout(() => onSuccess(), 800);
        } else {
          setErrorMessage(res.error || 'Account creation failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        setSuccessMessage('Signed in with Google!');
        setTimeout(() => onSuccess(), 800);
      } else {
        setErrorMessage(res.error || 'Google sign-in was cancelled or failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-sand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Warm Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sand-200/60 via-transparent to-transparent -z-10" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-sand-300/40 via-transparent to-transparent -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand */}
        <div className="w-14 h-14 rounded-3xl bg-sand-900 flex items-center justify-center text-[#EBE2CC] mx-auto shadow-lg shadow-sand-900/20 mb-3 border border-sand-950">
          <CreditCard className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-sand-950 tracking-tight">WorkPay</h2>
        <p className="text-xs font-semibold text-sand-700 mt-0.5">
          Manage Shifts. Track Attendance. Pay Smarter.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FAF6EE] py-8 px-4 shadow-xl border border-sand-300 sm:rounded-3xl sm:px-10 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#F5EFE3] hover:bg-sand-200 text-sand-900 font-bold text-xs rounded-xl border border-sand-300 shadow-xs hover:border-sand-400 flex items-center justify-center gap-2.5 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sand-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAF6EE] px-2 text-sand-500 font-semibold text-[10px]">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#F5EFE3] p-1 rounded-2xl border border-sand-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                tab === 'signin'
                  ? 'bg-sand-900 text-[#FAF6EE] shadow-xs'
                  : 'text-sand-700 hover:text-sand-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-sand-900 text-[#FAF6EE] shadow-xs'
                  : 'text-sand-700 hover:text-sand-950'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-sand-800 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6EE] border border-sand-300 rounded-xl text-xs font-medium text-sand-950 focus:ring-2 focus:ring-sand-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-sand-800 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF6EE] border border-sand-300 rounded-xl text-xs font-medium text-sand-950 focus:ring-2 focus:ring-sand-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-sand-800 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF6EE] border border-sand-300 rounded-xl text-xs font-medium text-sand-950 focus:ring-2 focus:ring-sand-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sand-900 hover:bg-sand-800 text-[#FAF6EE] rounded-xl text-xs font-bold shadow-md shadow-sand-900/20 transition-all flex items-center justify-center gap-1.5 border border-sand-950"
            >
              <span>{loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
