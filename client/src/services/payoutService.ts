import { PaymentTransaction, PayrollRecord, Employee } from '../types';
import { storageService } from './storageService';

export interface InitiatePayoutParams {
  payroll: PayrollRecord;
  employee: Employee;
  paymentMethod: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual';
  adminName: string;
}

export const payoutService = {
  /**
   * Initiate a payout request to the backend server
   */
  initiatePayout: async ({
    payroll,
    employee,
    paymentMethod,
    adminName,
  }: InitiatePayoutParams): Promise<{ success: boolean; transaction: PaymentTransaction; error?: string }> => {
    // Check if payroll is already paid or processing to prevent double payment
    if (payroll.paymentStatus === 'paid' || payroll.paymentStatus === 'processing') {
      return {
        success: false,
        error: 'This payroll cycle has already been processed or marked paid.',
        transaction: null as any,
      };
    }

    // Determine destination
    const destination =
      paymentMethod === 'razorpayx_upi' || (paymentMethod === 'upi_intent_manual' && employee.upiId)
        ? {
            type: 'vpa' as const,
            upiId: employee.upiId,
            beneficiaryName: employee.fullName,
          }
        : {
            type: 'bank_account' as const,
            accountNumber: employee.bankAccount?.accountNumber,
            ifsc: employee.bankAccount?.ifsc,
            bankName: employee.bankAccount?.bankName,
            beneficiaryName: employee.bankAccount?.accountHolderName || employee.fullName,
          };

    // Idempotency key per payroll payout
    const idempotencyKey = `idemp_wp_${payroll.id}_${Date.now()}`;

    try {
      // Call backend API
      const res = await fetch('/api/payouts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollId: payroll.id,
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeCode: employee.employeeCode,
          amount: payroll.totalPayable,
          paymentMethod,
          destination,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backend payout failed');
      }

      // Create new transaction record
      const transaction: PaymentTransaction = {
        id: data.transactionId || `TXN-WP-${Date.now()}`,
        payrollId: payroll.id,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeCode: employee.employeeCode,
        amount: payroll.totalPayable,
        currency: 'INR',
        paymentMethod,
        destination,
        razorpayPayoutId: data.payoutId,
        providerReferenceId: data.providerReferenceId,
        idempotencyKey,
        status: data.status || 'Successful',
        initiatedBy: adminName,
        initiatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        webhookLogs: [
          {
            event: 'payout.processed',
            timestamp: new Date().toISOString(),
            status: data.status || 'Successful',
            notes: data.message || 'Settlement completed via RazorpayX gateway',
          },
        ],
        notes: `Salary payout for period ${payroll.periodStartDate} to ${payroll.periodEndDate}`,
      };

      // Persist transaction
      await storageService.saveTransaction(transaction);

      // Update Payroll Record
      const updatedPayroll: PayrollRecord = {
        ...payroll,
        paymentStatus: 'paid',
        paymentTransactionId: transaction.id,
        paymentMethod,
        updatedAt: new Date().toISOString(),
      };
      await storageService.savePayrollRecord(updatedPayroll);

      // Audit Log
      await storageService.logAction(
        'PAYOUT_DISBURSED',
        'payment',
        transaction.id,
        adminName,
        'admin',
        {
          amount: payroll.totalPayable,
          employee: employee.fullName,
          method: paymentMethod,
          refId: transaction.providerReferenceId,
        }
      );

      // Push Notification
      await storageService.saveNotification({
        id: `notif-${Date.now()}`,
        userId: 'all',
        title: 'Salary Disbursed Successfully',
        message: `₹${payroll.totalPayable.toLocaleString('en-IN')} has been paid to ${employee.fullName} (${employee.employeeCode}).`,
        type: 'payment_success',
        link: '/payments',
        read: false,
        createdAt: new Date().toISOString(),
      });

      return { success: true, transaction };
    } catch (err: any) {
      console.error('Payout service error:', err);
      return {
        success: false,
        error: err.message || 'Failed to disburse payout',
        transaction: null as any,
      };
    }
  },
};

