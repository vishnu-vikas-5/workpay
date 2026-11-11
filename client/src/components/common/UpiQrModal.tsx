import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, Smartphone, CheckCircle2 } from 'lucide-react';
import { generateUpiIntentUri, getAppSpecificUpiLinks } from '../../utils/upiUtils';
import { formatINR } from '../../utils/utils';
import { GooglePayLogo, PhonePeLogo, PaytmLogo } from './PaymentBrandIcons';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  payeeAddress: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef: string;
  onMarkPaid?: () => void;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  isOpen,
  onClose,
  payeeAddress,
  payeeName,
  amount,
  transactionNote,
  transactionRef,
  onMarkPaid,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const upiUri = generateUpiIntentUri({
    payeeAddress,
    payeeName,
    amount,
    transactionNote,
    transactionRef,
  });

  const appLinks = getAppSpecificUpiLinks(upiUri);

  const handleCopy = () => {
    navigator.clipboard.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDefaultApp = () => {
    // Triggers native UPI handler on Android / iOS
    window.location.href = upiUri;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900">UPI Payment & Redirection</h3>
        <p className="text-xs text-slate-500 mt-0.5">Pay via installed UPI App or scan QR code</p>

        {/* QR Code Container */}
        <div className="my-4 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl inline-block shadow-inner">
          <QRCodeSVG
            value={upiUri}
            size={160}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><rect width='24' height='24' rx='6'/><text x='50%' y='65%' font-size='11' font-weight='bold' fill='white' text-anchor='middle'>UPI</text></svg>",
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Amount & Beneficiary info */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left space-y-1.5 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Payable Amount:</span>
            <span className="font-bold text-slate-900 text-sm">{formatINR(amount, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payee Name:</span>
            <span className="font-medium text-slate-800">{payeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">UPI ID (VPA):</span>
            <span className="font-mono text-brand-700 font-bold">{payeeAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ref ID:</span>
            <span className="font-mono text-[11px] text-slate-500">{transactionRef}</span>
          </div>
        </div>

        {/* Open Direct UPI App Redirection */}
        <button
          onClick={handleOpenDefaultApp}
          className="w-full py-2.5 px-4 mb-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Installed UPI App on Device</span>
        </button>

        {/* Specific App Quick Deep Links with Brand Logos */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <a
            href={appLinks.gpay}
            className="p-2 text-center rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <GooglePayLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">Google Pay</span>
          </a>
          <a
            href={appLinks.phonepe}
            className="p-2 text-center rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <PhonePeLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">PhonePe</span>
          </a>
          <a
            href={appLinks.paytm}
            className="p-2 text-center rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <PaytmLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">Paytm</span>
          </a>
        </div>

        {/* Copy UPI URI Button */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors mb-3"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>UPI Intent Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Raw UPI URI</span>
            </>
          )}
        </button>

        {/* Mark as Paid Action if callback provided */}
        {onMarkPaid && (
          <button
            onClick={() => {
              onMarkPaid();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Have Completed Payment (Mark as Paid)</span>
          </button>
        )}
      </div>
    </div>
  );
};
