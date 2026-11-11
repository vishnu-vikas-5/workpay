import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount as Indian Rupees (INR)
 * e.g. 125000 -> ₹1,25,000.00 or ₹1,25,000
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Mask bank account number, keeping only last 4 digits
 * e.g. 123456789012 -> •••• •••• 9012
 */
export function maskAccountNumber(accNumber?: string): string {
  if (!accNumber) return '•••• •••• ••••';
  const clean = accNumber.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Mask UPI ID partly for privacy while remaining identifiable
 * e.g. rajeshkumar@okhdfcbank -> raj***@okhdfcbank
 */
export function maskUpiId(upiId?: string): string {
  if (!upiId) return '';
  const parts = upiId.split('@');
  if (parts.length !== 2) return upiId;
  const user = parts[0];
  const handle = parts[1];
  if (user.length <= 3) return `${user}***@${handle}`;
  return `${user.substring(0, 3)}***@${handle}`;
}

/**
 * Formats decimal hours into "Xh Ym"
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoString;
  }
}

export function formatTimestamp(isoString?: string): string {
  return formatDateTime(isoString);
}

export function formatHours(hours: number): string {

  if (hours <= 0 || isNaN(hours)) return '0h 00m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Get styling badge for payment status
 */
export function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'Successful':
    case 'paid':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
        dot: 'bg-emerald-500',
        label: 'Successful',
      };
    case 'Processing':
    case 'processing':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
        dot: 'bg-blue-500 animate-ping',
        label: 'Processing',
      };
    case 'Pending Approval':
    case 'pending_approval':
    case 'Draft':
    case 'unpaid':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
        dot: 'bg-amber-500',
        label: status === 'Draft' ? 'Draft' : 'Pending',
      };
    case 'Failed':
    case 'failed':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20',
        dot: 'bg-rose-500',
        label: 'Failed',
      };
    case 'Reversed':
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20',
        dot: 'bg-purple-500',
        label: 'Reversed',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/20',
        dot: 'bg-slate-400',
        label: status,
      };
  }
}

/**
 * Get styling badge for shift status
 */
export function getShiftStatusBadge(status: string) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse-subtle';
    case 'Scheduled':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Absent':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

