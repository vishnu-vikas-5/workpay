import { 
  User, 
  Employee, 
  Shift, 
  Attendance, 
  OvertimeRequest, 
  PayrollRecord, 
  PaymentTransaction, 
  NotificationItem, 
  AuditLog,
  Department
} from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Warehouse & Logistics', code: 'WHL', color: 'indigo', managerName: 'Shift Lead' },
  { id: 'dept-2', name: 'Assembly & Production', code: 'PRD', color: 'emerald', managerName: 'Shift Lead' },
  { id: 'dept-3', name: 'Quality Control', code: 'QC', color: 'sky', managerName: 'Shift Lead' },
  { id: 'dept-4', name: 'Operations', code: 'OPS', color: 'amber', managerName: 'Shift Lead' },
];

export const INITIAL_USERS: User[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-vishnu',
    employeeCode: 'WP-EMP-1000',
    fullName: 'vishnuvikas',
    phone: '6383605262',
    email: 'vishnuvikas2@workpay.io',
    department: 'Operations',
    designation: 'Shift Specialist',
    dateOfJoining: '2026-01-01',
    shiftRate: 801, // ₹801 per 8hr shift per user's live settings
    hourlyWage: 100.13, // 801 / 8 = ₹100.13/hr
    standardWorkingHours: 8,
    overtimeMultiplier: 1.0,
    upiId: 'vishnuvikas2@oksbi',
    status: 'active',
    advanceBalance: 0,
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SHIFTS: Shift[] = [];
export const INITIAL_ATTENDANCE: Attendance[] = [];
export const INITIAL_OVERTIME_REQUESTS: OvertimeRequest[] = [];
export const INITIAL_PAYROLL: PayrollRecord[] = [];
export const INITIAL_TRANSACTIONS: PaymentTransaction[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
