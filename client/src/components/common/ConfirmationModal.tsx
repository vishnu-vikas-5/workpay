import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) => {
  if (!isOpen) return null;

  const btnColor =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] border border-[#1B1915]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#DED6C1] rounded-2xl shadow-xl border border-[#CFC6B1] p-6 animate-in fade-in zoom-in-95 duration-150 text-[#302C25]">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#635B4E] hover:text-[#302C25] hover:bg-[#CFC6B1]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-700'
                : variant === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-[#EBE2CC] text-[#302C25] border border-[#CFC6B1]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#302C25]">{title}</h3>
            <p className="text-xs text-[#635B4E] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#CFC6B1]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#635B4E] hover:bg-[#CFC6B1] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${btnColor}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

