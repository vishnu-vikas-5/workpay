export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string; // Links to Employee if role === 'employee'
  avatarUrl?: string;
  departmentId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface BankAccountDetails {
  accountNumber: string;
  ifsc: string;
  bankName: string;
  accountHolderName: string;
}

export interface Employee {
  id: string;
  employeeCode: string; // e.g. "WP-EMP-1001"
  fullName: string;
  phone: string;
  email: string;
  department: string;
  designation: string;
  dateOfJoining: string; // YYYY-MM-DD
  shiftRate: number; // Rate for an 8-hour shift in INR ₹ (e.g. 800)
  hourlyWage: number; // in INR ₹ = shiftRate / 8
  standardWorkingHours: number; // default 8
  overtimeMultiplier: number; // default 1.0 (overtime rate = shiftRate / 8)
  upiId?: string; // e.g. "name@okhdfcbank" or "9876543210@paytm"
  bankAccount?: BankAccountDetails;
  advanceBalance?: number; // Total outstanding lent / advance money in ₹
  status: 'active' | 'inactive';
  avatar?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ShiftStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Absent' | 'Cancelled';

export interface Shift {
  id: string;
  shiftCode: string; // e.g. "SHF-1024"
  employeeId: string;
  employeeName: string;
  department: string;
  shiftDate: string; // YYYY-MM-DD
  scheduledStartTime: string; // HH:mm (24-hour)
  scheduledEndTime: string; // HH:mm (24-hour)
  actualClockIn?: string; // HH:mm or ISO
  actualClockOut?: string; // HH:mm or ISO
  breakDurationMinutes: number; // e.g. 30, 45, 60
  totalWorkingHours: number;
  regularHours: number;
  overtimeHours: number;
  shiftStatus: ShiftStatus;
  assignedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AttendanceVerification = 'manual' | 'qr_code' | 'biometric' | 'self_service';

export interface Attendance {
  id: string;
  shiftId?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm or ISO
  clockOutTime?: string; // HH:mm or ISO
  breakDurationMinutes: number;
  workingDurationHours: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'half-day' | 'on-leave';
  recordedBy: string;
  verificationMethod: AttendanceVerification;
  notes?: string;
  createdAt: string;
  shiftsCount?: number;
  shiftRate?: number;
  isPaid?: boolean;
  paidAt?: string;
  paidTransactionId?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface OvertimeRequest {
  id: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  hourlyWage: number;
  overtimeMultiplier: number;
  calculatedOvertimeWage: number; // overtimeHours * (hourlyWage * overtimeMultiplier)
  adjustedOvertimeHours?: number;
  adjustedOvertimeWage?: number;
  reason?: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: string;
  approvalNotes?: string;
  payrollIncluded: boolean;
  payrollId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PayrollPeriodType = 'daily' | 'weekly' | 'monthly';
export type PayrollApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type PayrollPaymentStatus = 'unpaid' | 'processing' | 'paid' | 'failed';

export interface PayrollRecord {
  id: string; // e.g. "PAY-2026-03-001"
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  periodType: PayrollPeriodType;
  periodStartDate: string;
  periodEndDate: string;
  totalShifts: number;
  regularHours: number;
  overtimeHours: number;
  regularWages: number;
  overtimeWages: number;
  bonuses: number;
  bonusDescription?: string;
  deductions: number;
  deductionDescription?: string;
  totalPayable: number;
  approvalStatus: PayrollApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  paymentStatus: PayrollPaymentStatus;
  paymentTransactionId?: string;
  paymentMethod?: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual';
  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 
  | 'Draft' 
  | 'Pending Approval' 
  | 'Processing' 
  | 'Successful' 
  | 'Failed' 
  | 'Reversed';

export interface PaymentDestination {
  type: 'vpa' | 'bank_account';
  upiId?: string;
  maskedAccount?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  beneficiaryName: string;
}

export interface PaymentTransaction {
  id: string; // e.g. "TXN-WP-20260311-001"
  payrollId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  amount: number;
  currency: 'INR';
  paymentMethod: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual';
  destination: PaymentDestination;
  razorpayPayoutId?: string;
  razorpayFundAccountId?: string;
  razorpayContactId?: string;
  providerReferenceId?: string; // UTR or RRN
  idempotencyKey: string;
  status: PaymentStatus;
  failureReason?: string;
  initiatedBy: string;
  initiatedAt: string;
  processedAt?: string;
  webhookLogs?: Array<{
    event: string;
    timestamp: string;
    status: string;
    notes?: string;
  }>;
  upiIntentUrl?: string;
  notes?: string;
  shiftsCount?: number;
  shiftRate?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  shiftPay?: number;
  overtimePay?: number;
  grossPay?: number;
  advanceDeducted?: number; // Advance / loan amount deducted from this wage payment
  remainingAdvanceBalance?: number; // Remaining advance balance after this deduction
  employeePhone?: string;
}

export interface AdvanceRecord {
  id: string; // e.g. "ADV-1715421234"
  employeeId: string;
  employeeName: string;
  amount: number; // in INR
  date: string; // YYYY-MM-DD
  type: 'give' | 'deduct' | 'repay'; // 'give' = lent, 'deduct' = deducted from wage, 'repay' = returned directly
  notes?: string;
  paymentMethod?: 'cash' | 'upi';
  referenceId?: string; // payment transaction ID if deducted
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or specific user ID or employee ID
  title: string;
  message: string;
  type: 
    | 'shift_assigned' 
    | 'shift_changed' 
    | 'attendance_confirmed' 
    | 'overtime_approved' 
    | 'overtime_submitted' 
    | 'payroll_ready' 
    | 'payment_success' 
    | 'payment_failed'
    | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'shift' | 'overtime' | 'payroll' | 'payment' | 'employee' | 'auth';
  entityId: string;
  performedBy: string;
  performedByRole: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  managerName?: string;
}

