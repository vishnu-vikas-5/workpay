import {
  Employee,
  Shift,
  Attendance,
  OvertimeRequest,
  PayrollRecord,
  PaymentTransaction,
  NotificationItem,
  AuditLog,
  Department,
  User,
  AdvanceRecord,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_ATTENDANCE,
  INITIAL_OVERTIME_REQUESTS,
  INITIAL_PAYROLL,
  INITIAL_TRANSACTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEPARTMENTS,
  INITIAL_USERS,
} from './seedData';
import { isFirebaseConfigured, db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

const KEYS = {
  EMPLOYEES: 'workpay_employees',
  SHIFTS: 'workpay_shifts',
  ATTENDANCE: 'workpay_attendance',
  OVERTIME: 'workpay_overtime',
  PAYROLL: 'workpay_payroll',
  TRANSACTIONS: 'workpay_transactions',
  NOTIFICATIONS: 'workpay_notifications',
  AUDIT_LOGS: 'workpay_audit_logs',
  DEPARTMENTS: 'workpay_departments',
  USERS: 'workpay_users',
  ADVANCES: 'workpay_advances',
};

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

export const storageService = {
  // Reset all data to initial realistic seed state
  resetToSeedData: async () => {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(INITIAL_SHIFTS));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
    localStorage.setItem(KEYS.OVERTIME, JSON.stringify(INITIAL_OVERTIME_REQUESTS));
    localStorage.setItem(KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLL));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));

    if (isFirebaseConfigured) {
      // Also optionally seed Firestore
      try {
        for (const emp of INITIAL_EMPLOYEES) {
          await setDoc(doc(db, 'employees', emp.id), emp);
        }
      } catch (err) {
        console.warn('Firestore seed skipped:', err);
      }
    }
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as User);
      } catch (e) {
        console.warn('Fallback to local users', e);
      }
    }
    return getLocal<User[]>(KEYS.USERS, INITIAL_USERS);
  },

  // EMPLOYEES
  getEmployees: async (): Promise<Employee[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'employees'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as Employee);
      } catch (e) {
        console.warn('Fallback to local employees', e);
      }
    }
    const local = getLocal<Employee[]>(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    if (!local.some((e) => e.fullName.toLowerCase() === 'vishnuvikas')) {
      const merged = [INITIAL_EMPLOYEES[0], ...local];
      setLocal(KEYS.EMPLOYEES, merged);
      return merged;
    }
    return local;
  },

  saveEmployee: async (employee: Employee): Promise<void> => {
    const list = await storageService.getEmployees();
    const index = list.findIndex((e) => e.id === employee.id);
    let updated: Employee[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...employee, updatedAt: new Date().toISOString() };
    } else {
      updated = [employee, ...list];
    }
    setLocal(KEYS.EMPLOYEES, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'employees', employee.id), employee);
      } catch (e) {
        console.error('Firestore saveEmployee error:', e);
      }
    }
  },

  deleteEmployee: async (id: string): Promise<void> => {
    const list = await storageService.getEmployees();
    const updated = list.filter((e) => e.id !== id);
    setLocal(KEYS.EMPLOYEES, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (e) {
        console.error('Firestore deleteEmployee error:', e);
      }
    }
  },

  // SHIFTS
  getShifts: async (): Promise<Shift[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'shifts'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as Shift);
      } catch (e) {
        console.warn('Fallback to local shifts', e);
      }
    }
    return getLocal<Shift[]>(KEYS.SHIFTS, INITIAL_SHIFTS);
  },

  saveShift: async (shift: Shift): Promise<void> => {
    const list = await storageService.getShifts();
    const index = list.findIndex((s) => s.id === shift.id);
    let updated: Shift[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...shift, updatedAt: new Date().toISOString() };
    } else {
      updated = [shift, ...list];
    }
    setLocal(KEYS.SHIFTS, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'shifts', shift.id), shift);
      } catch (e) {
        console.error('Firestore saveShift error:', e);
      }
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    const list = await storageService.getShifts();
    const updated = list.filter((s) => s.id !== id);
    setLocal(KEYS.SHIFTS, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'shifts', id));
      } catch (e) {
        console.error('Firestore deleteShift error:', e);
      }
    }
  },

  // ATTENDANCE
  getAttendance: async (): Promise<Attendance[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'attendance'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as Attendance);
      } catch (e) {
        console.warn('Fallback to local attendance', e);
      }
    }
    return getLocal<Attendance[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  },

  saveAttendance: async (attendance: Attendance): Promise<void> => {
    const list = await storageService.getAttendance();
    const index = list.findIndex((a) => a.id === attendance.id);
    let updated: Attendance[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = attendance;
    } else {
      updated = [attendance, ...list];
    }
    setLocal(KEYS.ATTENDANCE, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'attendance', attendance.id), attendance);
      } catch (e) {
        console.error('Firestore saveAttendance error:', e);
      }
    }
  },

  // OVERTIME REQUESTS
  getOvertimeRequests: async (): Promise<OvertimeRequest[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'overtime_requests'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as OvertimeRequest);
      } catch (e) {
        console.warn('Fallback to local overtime', e);
      }
    }
    return getLocal<OvertimeRequest[]>(KEYS.OVERTIME, INITIAL_OVERTIME_REQUESTS);
  },

  saveOvertimeRequest: async (ot: OvertimeRequest): Promise<void> => {
    const list = await storageService.getOvertimeRequests();
    const index = list.findIndex((o) => o.id === ot.id);
    let updated: OvertimeRequest[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...ot, updatedAt: new Date().toISOString() };
    } else {
      updated = [ot, ...list];
    }
    setLocal(KEYS.OVERTIME, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'overtime_requests', ot.id), ot);
      } catch (e) {
        console.error('Firestore saveOvertime error:', e);
      }
    }
  },

  // PAYROLL
  getPayrollRecords: async (): Promise<PayrollRecord[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'payroll'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as PayrollRecord);
      } catch (e) {
        console.warn('Fallback to local payroll', e);
      }
    }
    return getLocal<PayrollRecord[]>(KEYS.PAYROLL, INITIAL_PAYROLL);
  },

  savePayrollRecord: async (record: PayrollRecord): Promise<void> => {
    const list = await storageService.getPayrollRecords();
    const index = list.findIndex((p) => p.id === record.id);
    let updated: PayrollRecord[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      updated = [record, ...list];
    }
    setLocal(KEYS.PAYROLL, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'payroll', record.id), record);
      } catch (e) {
        console.error('Firestore savePayroll error:', e);
      }
    }
  },

  // TRANSACTIONS
  getTransactions: async (): Promise<PaymentTransaction[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'payments'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as PaymentTransaction);
      } catch (e) {
        console.warn('Fallback to local payments', e);
      }
    }
    const localTx = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    if (!localTx.some((t) => t.id === 'txn-wp-902')) {
      const mergedTx = [INITIAL_TRANSACTIONS[0], ...localTx];
      setLocal(KEYS.TRANSACTIONS, mergedTx);
      return mergedTx;
    }
    return localTx;
  },

  saveTransaction: async (tx: PaymentTransaction): Promise<void> => {
    const list = await storageService.getTransactions();
    const index = list.findIndex((t) => t.id === tx.id);
    let updated: PaymentTransaction[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = tx;
    } else {
      updated = [tx, ...list];
    }
    setLocal(KEYS.TRANSACTIONS, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'payments', tx.id), tx);
      } catch (e) {
        console.error('Firestore saveTransaction error:', e);
      }
    }
  },

  // NOTIFICATIONS
  getNotifications: async (): Promise<NotificationItem[]> => {
    return getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  saveNotification: async (notif: NotificationItem): Promise<void> => {
    const list = await storageService.getNotifications();
    const updated = [notif, ...list];
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const list = await storageService.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const list = await storageService.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  // AUDIT LOGS
  getAuditLogs: async (): Promise<AuditLog[]> => {
    return getLocal<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  logAction: async (
    action: string,
    entityType: 'shift' | 'overtime' | 'payroll' | 'payment' | 'employee' | 'auth',
    entityId: string,
    performedBy: string,
    performedByRole: string,
    details: Record<string, any>
  ): Promise<void> => {
    const logs = await storageService.getAuditLogs();
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      entityType,
      entityId,
      performedBy,
      performedByRole,
      details,
      timestamp: new Date().toISOString(),
    };
    setLocal(KEYS.AUDIT_LOGS, [newLog, ...logs]);
  },

  // DEPARTMENTS
  getDepartments: async (): Promise<Department[]> => {
    return getLocal<Department[]>(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  },

  // ADVANCES / LENDING
  getAdvances: async (): Promise<AdvanceRecord[]> => {
    return getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
  },

  saveAdvance: async (adv: AdvanceRecord): Promise<void> => {
    const list = await storageService.getAdvances();
    const updated = [adv, ...list];
    setLocal(KEYS.ADVANCES, updated);
  },

  deleteAdvance: async (id: string): Promise<void> => {
    const list = await storageService.getAdvances();
    const updated = list.filter((a) => a.id !== id);
    setLocal(KEYS.ADVANCES, updated);
  },
};

