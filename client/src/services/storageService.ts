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
  writeBatch,
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
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'advances'));
        if (!snap.empty) return snap.docs.map((d) => d.data() as AdvanceRecord);
      } catch (e) {
        console.warn('Fallback to local advances', e);
      }
    }
    return getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
  },

  saveAdvance: async (adv: AdvanceRecord): Promise<void> => {
    const list = await storageService.getAdvances();
    const index = list.findIndex((a) => a.id === adv.id);
    let updated: AdvanceRecord[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = adv;
    } else {
      updated = [adv, ...list];
    }
    setLocal(KEYS.ADVANCES, updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'advances', adv.id), adv);
      } catch (e) {
        console.error('Firestore saveAdvance error:', e);
      }
    }
  },

  deleteAdvance: async (id: string): Promise<void> => {
    const list = await storageService.getAdvances();
    const updated = list.filter((a) => a.id !== id);
    setLocal(KEYS.ADVANCES, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'advances', id));
      } catch (e) {
        console.error('Firestore deleteAdvance error:', e);
      }
    }
  },

  // CLOUD STATS & QUOTA MANAGEMENT
  getCloudStats: async () => {
    if (!isFirebaseConfigured) {
      return {
        online: false,
        employees: 0,
        attendance: 0,
        shifts: 0,
        payments: 0,
        advances: 0,
        payroll: 0,
        totalDocs: 0,
      };
    }
    try {
      const [empSnap, attSnap, shfSnap, paySnap, advSnap, pyrSnap] = await Promise.all([
        getDocs(collection(db, 'employees')).catch(() => ({ size: 0, empty: true })),
        getDocs(collection(db, 'attendance')).catch(() => ({ size: 0, empty: true })),
        getDocs(collection(db, 'shifts')).catch(() => ({ size: 0, empty: true })),
        getDocs(collection(db, 'payments')).catch(() => ({ size: 0, empty: true })),
        getDocs(collection(db, 'advances')).catch(() => ({ size: 0, empty: true })),
        getDocs(collection(db, 'payroll')).catch(() => ({ size: 0, empty: true })),
      ]);

      const employees = empSnap.size || 0;
      const attendance = attSnap.size || 0;
      const shifts = shfSnap.size || 0;
      const payments = paySnap.size || 0;
      const advances = advSnap.size || 0;
      const payroll = pyrSnap.size || 0;

      return {
        online: true,
        employees,
        attendance,
        shifts,
        payments,
        advances,
        payroll,
        totalDocs: employees + attendance + shifts + payments + advances + payroll,
      };
    } catch (e) {
      console.warn('Could not fetch cloud stats', e);
      return {
        online: false,
        employees: 0,
        attendance: 0,
        shifts: 0,
        payments: 0,
        advances: 0,
        payroll: 0,
        totalDocs: 0,
      };
    }
  },

  // EXPORT ALL DATA TO JSON
  exportAllData: async () => {
    const employees = await storageService.getEmployees();
    const shifts = await storageService.getShifts();
    const attendance = await storageService.getAttendance();
    const overtime = await storageService.getOvertimeRequests();
    const payroll = await storageService.getPayrollRecords();
    const payments = await storageService.getTransactions();
    const advances = await storageService.getAdvances();
    const departments = await storageService.getDepartments();

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'WorkPay',
      metadata: {
        totalEmployees: employees.length,
        totalAttendance: attendance.length,
        totalPayments: payments.length,
        totalAdvances: advances.length,
      },
      data: {
        employees,
        shifts,
        attendance,
        overtime,
        payroll,
        payments,
        advances,
        departments,
      },
    };

    return backupPayload;
  },

  // DOWNLOAD FULL BACKUP AS JSON FILE TO DEVICE
  downloadDeviceBackup: async (): Promise<{ filename: string; sizeBytes: number }> => {
    const payload = await storageService.exportAllData();
    const jsonStr = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `workpay-backup-${dateStr}-${Date.now().toString().slice(-4)}.json`;

    // Cache in local storage for safety
    localStorage.setItem('workpay_last_local_backup', jsonStr);
    localStorage.setItem('workpay_last_backup_date', new Date().toISOString());

    // Native browser/device file download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { filename, sizeBytes: blob.size };
  },

  // CLEAR CLOUD DATA TO RESET QUOTA (PRESERVES LOCAL DATA)
  clearCloudData: async (options?: { keepEmployees?: boolean }): Promise<{ deletedCount: number }> => {
    if (!isFirebaseConfigured) {
      return { deletedCount: 0 };
    }

    let deletedCount = 0;
    const collectionsToClear = ['attendance', 'shifts', 'payments', 'advances', 'payroll', 'overtime_requests'];
    if (!options?.keepEmployees) {
      collectionsToClear.push('employees');
    }

    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            deletedCount++;
          });
          await batch.commit();
        }
      } catch (err) {
        console.error(`Error clearing cloud collection ${colName}:`, err);
      }
    }

    return { deletedCount };
  },

  // RESTORE BACKUP DIRECTLY INTO CLOUD
  restoreBackupToCloud: async (backupJson: any): Promise<{ restoredCount: number }> => {
    if (!backupJson) {
      throw new Error('Invalid backup file format.');
    }

    const payload = backupJson.data || backupJson;
    const { employees, shifts, attendance, overtime, payroll, payments, transactions, advances } = payload;
    const paymentRecords = payments || transactions;
    let restoredCount = 0;

    // Keep local cache completely updated
    if (employees) setLocal(KEYS.EMPLOYEES, employees);
    if (shifts) setLocal(KEYS.SHIFTS, shifts);
    if (attendance) setLocal(KEYS.ATTENDANCE, attendance);
    if (overtime) setLocal(KEYS.OVERTIME, overtime);
    if (payroll) setLocal(KEYS.PAYROLL, payroll);
    if (paymentRecords) setLocal(KEYS.TRANSACTIONS, paymentRecords);
    if (advances) setLocal(KEYS.ADVANCES, advances);

    if (isFirebaseConfigured) {
      const writeCollectionBatch = async (colName: string, items: any[]) => {
        if (!items || !items.length) return;
        const chunkSize = 400;
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const item of chunk) {
            if (item && item.id) {
              batch.set(doc(db, colName, item.id), item);
              restoredCount++;
            }
          }
          await batch.commit();
        }
      };

      if (employees) await writeCollectionBatch('employees', employees);
      if (shifts) await writeCollectionBatch('shifts', shifts);
      if (attendance) await writeCollectionBatch('attendance', attendance);
      if (overtime) await writeCollectionBatch('overtime_requests', overtime);
      if (payroll) await writeCollectionBatch('payroll', payroll);
      if (paymentRecords) await writeCollectionBatch('payments', paymentRecords);
      if (advances) await writeCollectionBatch('advances', advances);
    }

    return { restoredCount };
  },
};

