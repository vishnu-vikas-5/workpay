import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Clock,
  HandCoins,
  QrCode,
  FileCheck,
  ArrowDown,
} from 'lucide-react';

export const DownloadAppPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setDownloadStarted(true);

    // Direct download trigger
    const link = document.createElement('a');
    link.href = '/WorkPay.apk';
    link.download = 'WorkPay.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Brand Banner */}
      <header className="max-w-xl mx-auto w-full text-center pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-4 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Official Android Release</span>
        </div>
      </header>

      {/* Main Download Card */}
      <main className="max-w-xl mx-auto w-full space-y-6 my-auto py-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          {/* App Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-xl shadow-brand-500/20 ring-4 ring-white/10">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white">
              <Smartphone className="w-12 h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* App Title & Tagline */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              WorkPay for Android
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Shift tracking, automatic overtime & instant UPI wage settlements for your workforce.
            </p>
          </div>

          {/* Specs Badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] font-semibold text-slate-300">
            <span className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              Version 1.0.0
            </span>
            <span className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              Size: ~12 MB
            </span>
            <span className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              Android 8.0+
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-400/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified Clean APK
            </span>
          </div>

          {/* Download CTA Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 hover:from-brand-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-base shadow-xl shadow-brand-500/30 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Download className={`w-5 h-5 transition-transform ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5'}`} />
              <span>{downloading ? 'Starting Download...' : 'Download Android App (.apk)'}</span>
            </button>

            {downloadStarted && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Download started! Check your phone&apos;s notification bar or Downloads folder.</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Direct download • No Google Play account required
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Instant & Offline</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Works 100% offline with instant local storage and automatic cloud sync.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Shift & Overtime</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Flexible shift rates with 2-decimal overtime calculation (Shift Rate ÷ 8).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Direct UPI Pay</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              1-click launchers for Google Pay, PhonePe, and Paytm with PDF receipts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Lending / Khata</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Lend money instantly and automatically deduct from worker shift payouts.
            </p>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">
            How to Install on Android
          </h3>

          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Download the APK</p>
                <p className="text-[11px] text-slate-400">
                  Tap the download button above to save <span className="font-mono text-indigo-300">WorkPay.apk</span> to your device.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Allow Installation</p>
                <p className="text-[11px] text-slate-400">
                  Open the downloaded file. If Android prompts &quot;Install unknown apps&quot; or &quot;File might be harmful&quot;, tap <span className="font-bold text-white">Settings → Allow from this source</span> or <span className="font-bold text-white">Download / Install Anyway</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Open & Sign In</p>
                <p className="text-[11px] text-slate-400">
                  Launch WorkPay from your home screen and log in with Google or Email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-white/5">
        <p className="text-[11px]">
          WorkPay • Standalone APK Distribution Portal
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          SHA-256 Verified Clean Release • Direct from WorkPay Engine
        </p>
      </footer>
    </div>
  );
};
