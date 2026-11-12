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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sand-950/40 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#FAF6EE] rounded-3xl shadow-2xl border border-sand-300 p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-sand-200 hover:bg-sand-300 text-sand-700 hover:text-sand-950 transition-colors z-10 border border-sand-300"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 bg-sand-200 text-sand-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs border border-sand-300">
          <Smartphone className="w-6 h-6 text-amber-700" />
        </div>

        <h3 className="text-base font-bold text-sand-950">UPI Payment & Redirection</h3>
        <p className="text-xs text-sand-600 mt-0.5">Pay via installed UPI App or scan QR code</p>

        {/* QR Code Container */}
        <div className="my-4 p-3 bg-[#F5EFE3] border border-sand-300 rounded-2xl inline-block shadow-inner">
          <QRCodeSVG
            value={upiUri}
            size={160}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23302C25'><rect width='24' height='24' rx='6'/><text x='50%' y='65%' font-size='11' font-weight='bold' fill='%23FAF6EE' text-anchor='middle'>UPI</text></svg>",
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Amount & Beneficiary info */}
        <div className="bg-[#F5EFE3] rounded-xl p-3 border border-sand-300 text-left space-y-1.5 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-sand-600">Payable Amount:</span>
            <span className="font-bold text-sand-950 text-sm">{formatINR(amount, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-600">Payee Name:</span>
            <span className="font-semibold text-sand-900">{payeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-600">UPI ID (VPA):</span>
            <span className="font-mono text-sand-950 font-bold">{payeeAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-600">Ref ID:</span>
            <span className="font-mono text-[11px] text-sand-500">{transactionRef}</span>
          </div>
        </div>

        {/* Open Direct UPI App Redirection */}
        <button
          onClick={handleOpenDefaultApp}
          className="w-full py-2.5 px-4 mb-2 bg-sand-900 hover:bg-sand-800 text-[#FAF6EE] rounded-xl text-xs font-bold transition-all shadow-md shadow-sand-900/20 flex items-center justify-center gap-2 border border-sand-950"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Installed UPI App on Device</span>
        </button>

        {/* Specific App Quick Deep Links with Brand Logos */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <a
            href={appLinks.gpay}
            className="p-2 text-center rounded-xl border border-sand-300 text-xs font-semibold text-sand-900 bg-[#FAF6EE] hover:bg-sand-200 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <GooglePayLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">Google Pay</span>
          </a>
          <a
            href={appLinks.phonepe}
            className="p-2 text-center rounded-xl border border-sand-300 text-xs font-semibold text-sand-900 bg-[#FAF6EE] hover:bg-sand-200 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <PhonePeLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">PhonePe</span>
          </a>
          <a
            href={appLinks.paytm}
            className="p-2 text-center rounded-xl border border-sand-300 text-xs font-semibold text-sand-900 bg-[#FAF6EE] hover:bg-sand-200 transition-all flex flex-col items-center gap-1 group shadow-2xs"
          >
            <PaytmLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
            <span className="truncate w-full text-[11px] font-bold">Paytm</span>
          </a>
        </div>

        {/* Copy UPI URI Button */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sand-200 hover:bg-sand-300 text-sand-900 rounded-xl text-xs font-bold transition-colors mb-3 border border-sand-300"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
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
            className="w-full py-2.5 px-4 bg-emerald-100/80 hover:bg-emerald-100 text-emerald-950 border border-emerald-300/80 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>I Have Completed Payment (Mark as Paid)</span>
          </button>
        )}
      </div>
    </div>
  );
};
