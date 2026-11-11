import axios from 'axios';
import crypto from 'crypto';

export interface PayoutRequestPayload {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  amount: number;
  paymentMethod: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual';
  destination: {
    type: 'vpa' | 'bank_account';
    upiId?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    beneficiaryName: string;
  };
  idempotencyKey: string;
  notes?: Record<string, string>;
}

export interface PayoutResponse {
  success: boolean;
  isDemoMode: boolean;
  transactionId: string;
  payoutId: string;
  status: 'Processing' | 'Successful' | 'Failed' | 'Reversed';
  providerReferenceId?: string;
  failureReason?: string;
  destination: any;
  amount: number;
  currency: string;
  createdAt: string;
  message: string;
}

// In-memory idempotency cache to prevent duplicate payouts
const idempotencyStore = new Map<string, PayoutResponse>();

export class RazorpayXService {
  private keyId: string;
  private keySecret: string;
  private accountNumber: string;
  private webhookSecret: string;
  public isLiveConfigured: boolean;

  constructor() {
    this.keyId = process.env.RAZORPAYX_KEY_ID || '';
    this.keySecret = process.env.RAZORPAYX_KEY_SECRET || '';
    this.accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER || '';
    this.webhookSecret = process.env.RAZORPAYX_WEBHOOK_SECRET || '';

    // Live mode requires both Key ID and Secret and Account Number
    this.isLiveConfigured = Boolean(
      this.keyId &&
      this.keySecret &&
      this.accountNumber &&
      !this.keyId.includes('demo') &&
      !this.keyId.includes('YOUR_')
    );
  }

  private getAuthHeader() {
    const creds = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Process a payout via RazorpayX or Sandbox Simulator
   */
  async processPayout(payload: PayoutRequestPayload): Promise<PayoutResponse> {
    // 1. Check idempotency: Never disburse twice for the same key!
    if (idempotencyStore.has(payload.idempotencyKey)) {
      console.log(`[Idempotency Hit] Returning cached payout for key: ${payload.idempotencyKey}`);
      return idempotencyStore.get(payload.idempotencyKey)!;
    }

    if (!payload.amount || payload.amount <= 0) {
      throw new Error('Payout amount must be greater than zero.');
    }

    if (this.isLiveConfigured) {
      return await this.executeLiveRazorpayXPayout(payload);
    } else {
      return await this.executeSandboxSimulatorPayout(payload);
    }
  }

  /**
   * Real RazorpayX API Execution
   */
  private async executeLiveRazorpayXPayout(payload: PayoutRequestPayload): Promise<PayoutResponse> {
    const baseUrl = 'https://api.razorpay.com/v1';
    try {
      // Step A: Create or fetch contact
      const contactRes = await axios.post(
        `${baseUrl}/contacts`,
        {
          name: payload.employeeName,
          email: `${payload.employeeCode.toLowerCase()}@workpay.io`,
          type: 'employee',
          reference_id: payload.employeeId,
        },
        { headers: this.getAuthHeader() }
      );
      const contactId = contactRes.data.id;

      // Step B: Create Fund Account (VPA or Bank Account)
      let fundAccountData: any;
      if (payload.destination.type === 'vpa') {
        fundAccountData = {
          contact_id: contactId,
          account_type: 'vpa',
          vpa: {
            address: payload.destination.upiId,
          },
        };
      } else {
        fundAccountData = {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: {
            name: payload.destination.beneficiaryName,
            ifsc: payload.destination.ifsc,
            account_number: payload.destination.accountNumber,
          },
        };
      }

      const fundAccRes = await axios.post(
        `${baseUrl}/fund_accounts`,
        fundAccountData,
        { headers: this.getAuthHeader() }
      );
      const fundAccountId = fundAccRes.data.id;

      // Step C: Create Payout
      // Amount in paise (1 INR = 100 paise)
      const amountPaise = Math.round(payload.amount * 100);
      const payoutRes = await axios.post(
        `${baseUrl}/payouts`,
        {
          account_number: this.accountNumber,
          fund_account_id: fundAccountId,
          amount: amountPaise,
          currency: 'INR',
          mode: payload.destination.type === 'vpa' ? 'UPI' : 'IMPS',
          purpose: 'salary',
          queue_if_low_balance: true,
          reference_id: payload.payrollId,
          narration: `WorkPay ${payload.payrollId}`,
        },
        {
          headers: {
            ...this.getAuthHeader(),
            'X-Payout-Idempotency': payload.idempotencyKey,
          },
        }
      );

      const data = payoutRes.data;
      const response: PayoutResponse = {
        success: true,
        isDemoMode: false,
        transactionId: `TXN-WP-${Date.now()}`,
        payoutId: data.id,
        status: data.status === 'processed' ? 'Successful' : 'Processing',
        providerReferenceId: data.utr || undefined,
        destination: payload.destination,
        amount: payload.amount,
        currency: 'INR',
        createdAt: new Date().toISOString(),
        message: 'Payout initiated successfully through RazorpayX.',
      };

      idempotencyStore.set(payload.idempotencyKey, response);
      return response;
    } catch (err: any) {
      console.error('RazorpayX API Error:', err.response?.data || err.message);
      throw new Error(
        err.response?.data?.error?.description || 'Failed to initiate payout with RazorpayX.'
      );
    }
  }

  /**
   * Sandbox & Demo Simulator
   * Provides realistic verification, mock UTR generation, and safe local testing
   */
  private async executeSandboxSimulatorPayout(payload: PayoutRequestPayload): Promise<PayoutResponse> {
    // Validate destination
    if (payload.destination.type === 'vpa') {
      if (!payload.destination.upiId || !payload.destination.upiId.includes('@')) {
        throw new Error('Invalid UPI ID format. Expected format: name@bank');
      }
    } else {
      if (!payload.destination.accountNumber || payload.destination.accountNumber.length < 9) {
        throw new Error('Invalid Bank Account Number. Must be at least 9 digits.');
      }
      if (!payload.destination.ifsc || payload.destination.ifsc.length !== 11) {
        throw new Error('Invalid IFSC Code. Must be an 11-character code.');
      }
    }

    // Generate realistic simulated RazorpayX IDs
    const mockPayoutId = `pout_sim_${crypto.randomBytes(6).toString('hex')}`;
    const mockUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const transactionId = `TXN-WP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const response: PayoutResponse = {
      success: true,
      isDemoMode: true,
      transactionId,
      payoutId: mockPayoutId,
      status: 'Successful', // Default to Successful for verified sandbox demo
      providerReferenceId: mockUtr,
      destination: payload.destination,
      amount: payload.amount,
      currency: 'INR',
      createdAt: new Date().toISOString(),
      message: 'Payout processed successfully in RazorpayX Sandbox Simulator.',
    };

    idempotencyStore.set(payload.idempotencyKey, response);
    return response;
  }

  /**
   * Verify RazorpayX Webhook Signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      // In demo mode or if no secret is set, log warning and allow simulation
      return true;
    }
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}

export const razorpayXService = new RazorpayXService();

