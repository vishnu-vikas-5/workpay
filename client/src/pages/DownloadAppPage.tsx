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
  FileCheck,
  ArrowRight,
  Globe,
} from 'lucide-react';

interface DownloadAppPageProps {
  onGoToWebApp?: () => void;
}

export const DownloadAppPage: React.FC<DownloadAppPageProps> = ({ onGoToWebApp }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const APK_DOWNLOAD_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? '/WorkPay.apk'
      : 'https://raw.githubusercontent.com/vishnu-vikas-5/workpay/main/WorkPay-debug.apk';

  const handleDownload = () => {
    setDownloading(true);
    setDownloadStarted(true);

    const link = document.createElement('a');
    link.href = APK_DOWNLOAD_URL;
    link.download = 'WorkPay.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(false), 2000);
  };

  const handleOpenWebApp = () => {
    if (onGoToWebApp) {
      onGoToWebApp();
    } else {
      window.location.href = '/app';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-sand-950 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-sand-300 selection:text-sand-950 relative overflow-x-hidden">
      {/* Warm Ambient Background Gradients matching palette: #EBE2CC, #DED6C1, #CFC6B1 */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sand-200/60 via-transparent to-transparent -z-10" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-sand-300/40 via-transparent to-transparent -z-10" />

      {/* Top Brand Banner */}
      <header className="max-w-xl mx-auto w-full text-center pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand-200/90 border border-sand-300 text-sand-800 text-xs font-bold mb-2 shadow-2xs backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-sand-700" />
          <span>Official Android Release • WorkPay v1.0.0</span>
        </div>
      </header>

      {/* Main Download Card with Liquid Glass Theme */}
      <main className="max-w-xl mx-auto w-full space-y-6 my-auto py-4">
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center border border-white/80">
          {/* App Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-sand-900 to-sand-800 p-0.5 shadow-xl shadow-sand-900/20 ring-4 ring-sand-300/50">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-sand-900 via-sand-800 to-sand-950 flex items-center justify-center text-[#EBE2CC]">
              <Smartphone className="w-12 h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* App Title & Tagline */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-sand-950 tracking-tight">
              WorkPay for Android
            </h1>
            <p className="text-xs sm:text-sm text-sand-700 max-w-sm mx-auto leading-relaxed">
              Shift tracking, automatic 2-decimal overtime & instant UPI wage settlements for your workforce.
            </p>
          </div>

          {/* Specs Badges with Warm Palette */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] font-semibold text-sand-800">
            <span className="px-2.5 py-1 bg-white/70 rounded-lg border border-sand-300 shadow-2xs">
              Version 1.0.0
            </span>
            <span className="px-2.5 py-1 bg-white/70 rounded-lg border border-sand-300 shadow-2xs">
              Size: ~12 MB
            </span>
            <span className="px-2.5 py-1 bg-white/70 rounded-lg border border-sand-300 shadow-2xs">
              Android 8.0+
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified Clean APK
            </span>
          </div>

          {/* Download CTA Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-4 px-6 bg-gradient-to-r from-sand-900 via-sand-800 to-sand-950 hover:from-sand-950 hover:to-sand-900 text-[#FDFBF7] rounded-2xl font-bold text-base shadow-xl shadow-sand-900/25 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group border border-sand-700/50"
            >
              <Download className={`w-5 h-5 text-[#EBE2CC] transition-transform ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5'}`} />
              <span>{downloading ? 'Starting Download...' : 'Download Android App (.apk)'}</span>
            </button>

            {downloadStarted && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center gap-2 animate-in fade-in font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Download started! Check your phone&apos;s notification bar or Downloads folder.</span>
              </div>
            )}

            <p className="text-[11px] text-sand-600">
              Direct download • No Google Play account required
            </p>

            {/* Quick Link to Web App */}
            <div className="pt-3 border-t border-sand-300/80 flex items-center justify-between gap-2 text-left">
              <div className="min-w-0">
                <p className="text-xs font-bold text-sand-950">Using PC or iPhone?</p>
                <p className="text-[11px] text-sand-600 truncate">Manage shifts & payouts in browser</p>
              </div>
              <button
                type="button"
                onClick={handleOpenWebApp}
                className="px-3.5 py-1.5 bg-sand-200/90 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>Open Web App</span>
                <ArrowRight className="w-3.5 h-3.5 text-sand-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-sand-300/70 space-y-1.5 text-left shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-sand-200 text-sand-900 flex items-center justify-center border border-sand-300">
              <Zap className="w-4 h-4 text-amber-700" />
            </div>
            <h3 className="text-xs font-bold text-sand-950">Instant & Offline</h3>
            <p className="text-[11px] text-sand-600 leading-normal">
              Works 100% offline with instant local storage and automatic cloud sync.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-sand-300/70 space-y-1.5 text-left shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-sand-200 text-sand-900 flex items-center justify-center border border-sand-300">
              <Clock className="w-4 h-4 text-brand-700" />
            </div>
            <h3 className="text-xs font-bold text-sand-950">Shift & Overtime</h3>
            <p className="text-[11px] text-sand-600 leading-normal">
              Flexible shift rates with 2-decimal overtime calculation (Shift Rate ÷ 8).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-sand-300/70 space-y-1.5 text-left shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-sand-200 text-sand-900 flex items-center justify-center border border-sand-300">
              <FileCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <h3 className="text-xs font-bold text-sand-950">Direct UPI Pay</h3>
            <p className="text-[11px] text-sand-600 leading-normal">
              1-click launchers for Google Pay, PhonePe, and Paytm with PDF receipts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-sand-300/70 space-y-1.5 text-left shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-sand-200 text-sand-900 flex items-center justify-center border border-sand-300">
              <HandCoins className="w-4 h-4 text-amber-800" />
            </div>
            <h3 className="text-xs font-bold text-sand-950">Lending / Khata</h3>
            <p className="text-[11px] text-sand-600 leading-normal">
              Lend money instantly and automatically deduct from worker shift payouts.
            </p>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="bg-white/60 backdrop-blur-md border border-sand-300/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sand-700 text-left">
            How to Install on Android
          </h3>

          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sand-900 text-[#EBE2CC] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-sand-950">Download the APK</p>
                <p className="text-[11px] text-sand-600">
                  Tap the download button above to save <span className="font-mono text-sand-900 font-semibold bg-sand-200/80 px-1 py-0.5 rounded">WorkPay.apk</span> to your device.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sand-900 text-[#EBE2CC] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-sand-950">Allow Installation</p>
                <p className="text-[11px] text-sand-600">
                  Open the downloaded file. If Android prompts &quot;Install unknown apps&quot; or &quot;File might be harmful&quot;, tap <span className="font-bold text-sand-900">Settings → Allow from this source</span> or <span className="font-bold text-sand-900">Download / Install Anyway</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sand-900 text-[#EBE2CC] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-sand-950">Open & Sign In</p>
                <p className="text-[11px] text-sand-600">
                  Launch WorkPay from your home screen and log in with Google or Email.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Option to Go to Real Web Portal */}
        <div className="liquid-glass border border-sand-300 rounded-3xl p-5 sm:p-6 space-y-3 text-center backdrop-blur-md shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-200/80 text-sand-900 text-[11px] font-bold uppercase tracking-wider border border-sand-300">
            <Globe className="w-3.5 h-3.5 text-sand-800" />
            <span>Official Web Application</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-sand-950">
              Need to access the Admin & Workforce Portal online?
            </h3>
            <p className="text-xs text-sand-700 max-w-sm mx-auto leading-relaxed">
              Manage shifts, view attendance records, approve overtime, and initiate UPI payouts directly in your browser.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleOpenWebApp}
              className="w-full sm:w-auto px-6 py-3 bg-sand-900 hover:bg-sand-950 text-[#FDFBF7] font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer border border-sand-800"
            >
              <span>Launch Web Portal & Login</span>
              <ArrowRight className="w-4 h-4 text-[#EBE2CC]" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-sand-600 py-4 border-t border-sand-300/60">
        <p className="text-[11px]">
          WorkPay • Standalone APK Distribution Portal
        </p>
        <p className="text-[10px] text-sand-500 mt-1">
          SHA-256 Verified Clean Release • Direct from WorkPay Engine
        </p>
      </footer>
    </div>
  );
};
