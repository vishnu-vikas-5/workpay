/**
 * UPI URI & Intent Generator for Indian Payments (NPCI standard)
 */
export interface UpiIntentParams {
  payeeAddress: string; // VPA e.g. name@okhdfcbank
  payeeName: string; // e.g. Rajesh Kumar
  amount: number; // e.g. 1500.00
  transactionNote: string; // e.g. WorkPay Shift Salary 2026-03
  transactionRef: string; // e.g. TXN-WP-10294
}

export function generateUpiIntentUri(params: UpiIntentParams): string {
  const url = new URL('upi://pay');
  url.searchParams.set('pa', params.payeeAddress);
  url.searchParams.set('pn', params.payeeName);
  url.searchParams.set('am', params.amount.toFixed(2));
  url.searchParams.set('cu', 'INR');
  url.searchParams.set('tn', params.transactionNote);
  url.searchParams.set('tr', params.transactionRef);
  return url.toString();
}

export function getAppSpecificUpiLinks(upiUri: string) {
  const cleanUri = upiUri.replace('upi://pay?', '');
  return {
    generic: upiUri,
    gpay: `gpay://upi/pay?${cleanUri}`,
    phonepe: `phonepe://pay?${cleanUri}`,
    paytm: `paytmmp://pay?${cleanUri}`,
  };
}

