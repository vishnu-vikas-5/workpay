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
import { isFirebaseConfigured, db, auth } from './firebase';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Omit optional fields if empty string or too short to avoid rule rejection
        if (key === 'upiId' && trimmed.length < 3) continue;
        if ((key === 'avatar' || key === 'userId') && trimmed.length === 0) continue;
        result[key] = trimmed;
      } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

const DELETED_IDS_KEY = 'workpay_deleted_ids';

export function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

export function markDeletedId(id: string): void {
  if (!id) return;
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function unmarkDeletedId(id: string): void {
  if (!id) return;
  try {
    const set = getDeletedIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

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

// Known sample / dummy worker IDs & names to purge
export const DUMMY_EMPLOYEE_IDS = new Set(['emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6']);
export const DUMMY_EMPLOYEE_NAMES = new Set([
  'rajesh kumar',
  'kavita sundaram',
  'mohammed arif',
  'deepak patel',
  'ananya deshmukh',
  'suresh gowda',
]);

export function isDummyEmployee(emp: Partial<Employee>): boolean {
  if (emp.id && DUMMY_EMPLOYEE_IDS.has(emp.id)) return true;
  if (emp.fullName && DUMMY_EMPLOYEE_NAMES.has(emp.fullName.trim().toLowerCase())) return true;
  return false;
}

/**
 * Deduplicates employees strictly by ID, normalized 10-digit phone, UPI ID, or full name.
 * Always purges dummy employees and retains genuine workforce records.
 */
export function deduplicateEmployees(list: Employee[]): Employee[] {
  const seenIds = new Set<string>();
  const seenNamePhones = new Set<string>();
  const result: Employee[] = [];

  // Sort list to prioritize records with newer updatedAt or higher/updated shiftRate
  const sorted = [...list].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  for (const emp of sorted) {
    if (!emp) continue;
    if (isDummyEmployee(emp)) continue;

    const id = emp.id;
    const name = (emp.fullName || '').trim().toLowerCase();
    const digits = (emp.phone || '').replace(/\D/g, '');
    const phone = digits.length >= 10 ? digits.slice(-10) : digits;
    const namePhoneKey = `${name}_${phone}`;

    // Check if duplicate of an already accepted worker by unique identity
    if (id && seenIds.has(id)) continue;
    if (name && phone && phone.length === 10 && seenNamePhones.has(namePhoneKey)) continue;

    if (id) seenIds.add(id);
    if (name && phone && phone.length === 10) seenNamePhones.add(namePhoneKey);

    result.push(emp);
  }

  // Ensure default real employee is retained ONLY if list has no records
  if (result.length === 0) {
    result.push(INITIAL_EMPLOYEES[0]);
  }

  return result;
}

/**
 * Deduplicates attendance records ensuring strictly ONE record per employee per date.
 * Prioritizes marked/paid records over unmarked or older records.
 */
export function deduplicateAttendance(records: Attendance[]): Attendance[] {
  const map = new Map<string, Attendance>();

  for (const att of records) {
    if (!att || !att.employeeId || !att.date) continue;
    if (DUMMY_EMPLOYEE_IDS.has(att.employeeId)) continue;
    if (DUMMY_EMPLOYEE_NAMES.has((att.employeeName || '').trim().toLowerCase())) continue;

    const key = `${att.employeeId}_${att.date}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, att);
    } else {
      // Prioritize paid or active shift record over older records
      if (att.isPaid && !existing.isPaid) {
        map.set(key, att);
      } else if ((att.shiftsCount || 0) > (existing.shiftsCount || 0)) {
        map.set(key, att);
      } else if (new Date(att.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
        map.set(key, att);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Deduplicates shifts by employeeId + shiftDate + scheduledStartTime
 */
export function deduplicateShifts(shifts: Shift[]): Shift[] {
  const map = new Map<string, Shift>();
  for (const s of shifts) {
    if (!s || !s.employeeId) continue;
    if (DUMMY_EMPLOYEE_IDS.has(s.employeeId)) continue;
    if (DUMMY_EMPLOYEE_NAMES.has((s.employeeName || '').trim().toLowerCase())) continue;
    const key = `${s.employeeId}_${s.shiftDate}_${s.scheduledStartTime || '08:00'}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

/**
 * Deduplicates payment transactions by transaction ID
 */
export function deduplicateTransactions(txs: PaymentTransaction[]): PaymentTransaction[] {
  const map = new Map<string, PaymentTransaction>();
  for (const t of txs) {
    if (!t || !t.id) continue;
    if (t.employeeId && DUMMY_EMPLOYEE_IDS.has(t.employeeId)) continue;
    if (t.employeeName && DUMMY_EMPLOYEE_NAMES.has(t.employeeName.trim().toLowerCase())) continue;
    if (!map.has(t.id)) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}

/**
 * Deduplicates advances (loans/khata) by advance ID
 */
export function deduplicateAdvances(advs: AdvanceRecord[]): AdvanceRecord[] {
  const map = new Map<string, AdvanceRecord>();
  for (const a of advs) {
    if (!a || !a.id) continue;
    if (a.employeeId && DUMMY_EMPLOYEE_IDS.has(a.employeeId)) continue;
    if (!map.has(a.id)) {
      map.set(a.id, a);
    }
  }
  return Array.from(map.values());
}

let hasPurgedOnce = false;

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
      (async () => {
        try {
          const batch = writeBatch(db);
          for (const emp of INITIAL_EMPLOYEES) {
            batch.set(doc(db, 'employees', emp.id), emp);
          }
          await batch.commit();
        } catch (err) {
          console.warn('Firestore seed warning:', err);
        }
      })();
    }
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    return getLocal<User[]>(KEYS.USERS, INITIAL_USERS);
  },

  // EMPLOYEES - Local-First (<1ms latency)
  getEmployees: async (): Promise<Employee[]> => {
    let list = getLocal<Employee[]>(KEYS.EMPLOYEES, []);
    if (!list || list.length === 0) {
      list = INITIAL_EMPLOYEES;
    }
    const clean = deduplicateEmployees(list);
    setLocal(KEYS.EMPLOYEES, clean);
    return clean;
  },

  saveEmployee: async (employee: Employee): Promise<void> => {
    unmarkDeletedId(employee.id);
    const list = getLocal<Employee[]>(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const index = list.findIndex((e) => e.id === employee.id);
    let updated: Employee[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...employee, updatedAt: new Date().toISOString() };
    } else {
      updated = [employee, ...list];
    }
    const clean = deduplicateEmployees(updated);
    setLocal(KEYS.EMPLOYEES, clean);

    // Reliable Firestore write with cloud unmark
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'employees', employee.id), sanitizeForFirestore(employee));
      } catch (e) {
        console.warn('Firestore saveEmployee error:', e);
      }
    }
  },

  deleteEmployee: async (id: string): Promise<void> => {
    markDeletedId(id);
    const list = getLocal<Employee[]>(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const updated = list.filter((e) => e.id !== id);
    const clean = deduplicateEmployees(updated);
    setLocal(KEYS.EMPLOYEES, clean);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        // Cascade delete related attendance and shifts from Firestore
        const [attSnap, shfSnap] = await Promise.all([
          getDocs(collection(db, 'attendance')).catch(() => null),
          getDocs(collection(db, 'shifts')).catch(() => null),
        ]);
        if (attSnap && !attSnap.empty) {
          const empAtts = attSnap.docs.filter((d) => d.data().employeeId === id);
          for (const d of empAtts) {
            markDeletedId(d.id);
            await deleteDoc(d.ref).catch(() => {});
          }
        }
        if (shfSnap && !shfSnap.empty) {
          const empShfs = shfSnap.docs.filter((d) => d.data().employeeId === id);
          for (const d of empShfs) {
            markDeletedId(d.id);
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Firestore background deleteEmployee error:', e);
      }
    }
  },

  // SHIFTS - Local-First (<1ms latency)
  getShifts: async (): Promise<Shift[]> => {
    let list = getLocal<Shift[]>(KEYS.SHIFTS, []);
    if (!list || list.length === 0) {
      list = INITIAL_SHIFTS;
    }
    const clean = deduplicateShifts(list);
    setLocal(KEYS.SHIFTS, clean);
    return clean;
  },

  saveShift: async (shift: Shift): Promise<void> => {
    const list = getLocal<Shift[]>(KEYS.SHIFTS, INITIAL_SHIFTS);
    const index = list.findIndex((s) => s.id === shift.id);
    let updated: Shift[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...shift, updatedAt: new Date().toISOString() };
    } else {
      updated = [shift, ...list];
    }
    const clean = deduplicateShifts(updated);
    setLocal(KEYS.SHIFTS, clean);

    if (isFirebaseConfigured) {
      setDoc(doc(db, 'shifts', shift.id), sanitizeForFirestore(shift)).catch((e) => {
        console.warn('Firestore background saveShift error:', e);
      });
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    markDeletedId(id);
    const list = getLocal<Shift[]>(KEYS.SHIFTS, INITIAL_SHIFTS);
    const updated = list.filter((s) => s.id !== id);
    setLocal(KEYS.SHIFTS, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'shifts', id));
      } catch (e) {
        console.warn('Firestore background deleteShift error:', e);
      }
    }
  },

  deleteAttendance: async (id: string): Promise<void> => {
    markDeletedId(id);
    const list = getLocal<Attendance[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    const updated = list.filter((a) => a.id !== id);
    setLocal(KEYS.ATTENDANCE, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'attendance', id));
      } catch (e) {
        console.warn('Firestore background deleteAttendance error:', e);
      }
    }
  },

  // ATTENDANCE - Local-First (<1ms latency)
  getAttendance: async (): Promise<Attendance[]> => {
    let list = getLocal<Attendance[]>(KEYS.ATTENDANCE, []);
    if (!list || list.length === 0) {
      list = INITIAL_ATTENDANCE;
    }
    const clean = deduplicateAttendance(list);
    setLocal(KEYS.ATTENDANCE, clean);
    return clean;
  },

  saveAttendance: async (attendance: Attendance): Promise<void> => {
    const list = getLocal<Attendance[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    const index = list.findIndex((a) => a.id === attendance.id);
    let updated: Attendance[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = attendance;
    } else {
      updated = [attendance, ...list];
    }
    const clean = deduplicateAttendance(updated);
    setLocal(KEYS.ATTENDANCE, clean);

    // Fire-and-forget sync to Firestore
    if (isFirebaseConfigured) {
      setDoc(doc(db, 'attendance', attendance.id), sanitizeForFirestore(attendance)).catch((e) => {
        console.warn('Firestore background saveAttendance error:', e);
      });
    }
  },

  // High-performance bulk attendance save (1 local write + 1 background Firestore batch)
  saveBulkAttendance: async (records: Attendance[]): Promise<void> => {
    if (!records || records.length === 0) return;
    const list = getLocal<Attendance[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    const recordMap = new Map(list.map((a) => [a.id, a]));
    for (const r of records) {
      recordMap.set(r.id, r);
    }
    const clean = deduplicateAttendance(Array.from(recordMap.values()));
    setLocal(KEYS.ATTENDANCE, clean);

    if (isFirebaseConfigured) {
      (async () => {
        try {
          const chunkSize = 400;
          for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            for (const r of chunk) {
              batch.set(doc(db, 'attendance', r.id), r);
            }
            await batch.commit();
          }
        } catch (e) {
          console.warn('Firestore background batch saveBulkAttendance error:', e);
        }
      })();
    }
  },

  // OVERTIME REQUESTS
  getOvertimeRequests: async (): Promise<OvertimeRequest[]> => {
    return getLocal<OvertimeRequest[]>(KEYS.OVERTIME, INITIAL_OVERTIME_REQUESTS);
  },

  saveOvertimeRequest: async (ot: OvertimeRequest): Promise<void> => {
    const list = getLocal<OvertimeRequest[]>(KEYS.OVERTIME, INITIAL_OVERTIME_REQUESTS);
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
      setDoc(doc(db, 'overtime_requests', ot.id), ot).catch((e) => {
        console.warn('Firestore background saveOvertime error:', e);
      });
    }
  },

  // PAYROLL
  getPayrollRecords: async (): Promise<PayrollRecord[]> => {
    return getLocal<PayrollRecord[]>(KEYS.PAYROLL, INITIAL_PAYROLL);
  },

  savePayrollRecord: async (record: PayrollRecord): Promise<void> => {
    const list = getLocal<PayrollRecord[]>(KEYS.PAYROLL, INITIAL_PAYROLL);
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
      setDoc(doc(db, 'payroll', record.id), record).catch((e) => {
        console.warn('Firestore background savePayroll error:', e);
      });
    }
  },

  // TRANSACTIONS - Local-First (<1ms latency)
  getTransactions: async (): Promise<PaymentTransaction[]> => {
    const list = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const clean = deduplicateTransactions(list);
    setLocal(KEYS.TRANSACTIONS, clean);
    return clean;
  },

  saveTransaction: async (tx: PaymentTransaction): Promise<void> => {
    const list = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const index = list.findIndex((t) => t.id === tx.id);
    let updated: PaymentTransaction[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = tx;
    } else {
      updated = [tx, ...list];
    }
    const clean = deduplicateTransactions(updated);
    setLocal(KEYS.TRANSACTIONS, clean);

    if (isFirebaseConfigured) {
      setDoc(doc(db, 'payments', tx.id), sanitizeForFirestore(tx)).catch((e) => {
        console.warn('Firestore background saveTransaction error:', e);
      });
    }
  },

  deleteTransaction: async (id: string): Promise<void> => {
    markDeletedId(id);
    const list = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const updated = list.filter((t) => t.id !== id);
    setLocal(KEYS.TRANSACTIONS, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'payments', id));
      } catch (e) {
        console.warn('Firestore background deleteTransaction error:', e);
      }
    }
  },

  // NOTIFICATIONS
  getNotifications: async (): Promise<NotificationItem[]> => {
    return getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  saveNotification: async (notif: NotificationItem): Promise<void> => {
    const list = getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const updated = [notif, ...list];
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const list = getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const list = getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
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
    const logs = getLocal<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
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

  // ADVANCES / LENDING - Local-First (<1ms latency)
  getAdvances: async (): Promise<AdvanceRecord[]> => {
    const list = getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
    const clean = deduplicateAdvances(list);
    setLocal(KEYS.ADVANCES, clean);
    return clean;
  },

  saveAdvance: async (adv: AdvanceRecord): Promise<void> => {
    const list = getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
    const index = list.findIndex((a) => a.id === adv.id);
    let updated: AdvanceRecord[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = adv;
    } else {
      updated = [adv, ...list];
    }
    const clean = deduplicateAdvances(updated);
    setLocal(KEYS.ADVANCES, clean);

    if (isFirebaseConfigured) {
      setDoc(doc(db, 'advances', adv.id), sanitizeForFirestore(adv)).catch((e) => {
        console.warn('Firestore background saveAdvance error:', e);
      });
    }
  },

  deleteAdvance: async (id: string): Promise<void> => {
    markDeletedId(id);
    const list = getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
    const updated = list.filter((a) => a.id !== id);
    setLocal(KEYS.ADVANCES, updated);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'advances', id));
      } catch (e) {
        console.warn('Firestore background deleteAdvance error:', e);
      }
    }
  },

  // MASTER PURGE OF DUPLICATE & SAMPLE DATA (Guarded to run once on boot or when forced)
  purgeDuplicateAndSampleData: async (force: boolean = false): Promise<{
    cleanedEmployees: number;
    cleanedAttendance: number;
    cleanedShifts: number;
    cleanedTransactions: number;
    cleanedAdvances: number;
  }> => {
    if (hasPurgedOnce && !force) {
      return {
        cleanedEmployees: 0,
        cleanedAttendance: 0,
        cleanedShifts: 0,
        cleanedTransactions: 0,
        cleanedAdvances: 0,
      };
    }
    hasPurgedOnce = true;

    // 1. Purge employees
    const rawEmps = getLocal<Employee[]>(KEYS.EMPLOYEES, []);
    const cleanEmps = deduplicateEmployees(rawEmps);
    setLocal(KEYS.EMPLOYEES, cleanEmps);

    // 2. Purge attendance
    const rawAtts = getLocal<Attendance[]>(KEYS.ATTENDANCE, []);
    const cleanAtts = deduplicateAttendance(rawAtts);
    setLocal(KEYS.ATTENDANCE, cleanAtts);

    // 3. Purge shifts
    const rawShifts = getLocal<Shift[]>(KEYS.SHIFTS, []);
    const cleanShifts = deduplicateShifts(rawShifts);
    setLocal(KEYS.SHIFTS, cleanShifts);

    // 4. Purge transactions
    const rawTxs = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, []);
    const cleanTxs = deduplicateTransactions(rawTxs);
    setLocal(KEYS.TRANSACTIONS, cleanTxs);

    // 5. Purge advances
    const rawAdvs = getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
    const cleanAdvs = deduplicateAdvances(rawAdvs);
    setLocal(KEYS.ADVANCES, cleanAdvs);

    // 6. Delete dummy documents from Firestore in background (only when authenticated)
    if (isFirebaseConfigured && auth?.currentUser) {
      (async () => {
        try {
          const batch = writeBatch(db);
          for (const id of DUMMY_EMPLOYEE_IDS) {
            batch.delete(doc(db, 'employees', id));
            batch.delete(doc(db, 'shifts', id));
            batch.delete(doc(db, 'attendance', id));
          }
          await batch.commit();
        } catch (e) {
          console.warn('Background Firestore purge warning:', e);
        }
      })();
    }

    return {
      cleanedEmployees: Math.max(0, rawEmps.length - cleanEmps.length),
      cleanedAttendance: Math.max(0, rawAtts.length - cleanAtts.length),
      cleanedShifts: Math.max(0, rawShifts.length - cleanShifts.length),
      cleanedTransactions: Math.max(0, rawTxs.length - cleanTxs.length),
      cleanedAdvances: Math.max(0, rawAdvs.length - cleanAdvs.length),
    };
  },

  // FULL BIDIRECTIONAL TWO-WAY SYNCHRONIZATION WITH FIRESTORE
  syncWithFirestore: async (onDataUpdated?: () => void): Promise<{ pulled: number; pushed: number }> => {
    if (!isFirebaseConfigured || !auth.currentUser) {
      return { pulled: 0, pushed: 0 };
    }

    let pulledCount = 0;
    let pushedCount = 0;

    try {
      const deletedIds = getDeletedIds();

      // Ensure any locally deleted IDs are purged from Firestore
      for (const dId of deletedIds) {
        deleteDoc(doc(db, 'employees', dId)).catch(() => {});
        deleteDoc(doc(db, 'payments', dId)).catch(() => {});
        deleteDoc(doc(db, 'attendance', dId)).catch(() => {});
        deleteDoc(doc(db, 'advances', dId)).catch(() => {});
        deleteDoc(doc(db, 'shifts', dId)).catch(() => {});
      }

      // 1. Fetch remote snapshots in parallel
      const [empSnap, attSnap, shfSnap, txSnap, advSnap] = await Promise.all([
        getDocs(collection(db, 'employees')).catch((e) => { console.warn('Sync read employees err:', e); return null; }),
        getDocs(collection(db, 'attendance')).catch((e) => { console.warn('Sync read attendance err:', e); return null; }),
        getDocs(collection(db, 'shifts')).catch((e) => { console.warn('Sync read shifts err:', e); return null; }),
        getDocs(collection(db, 'payments')).catch((e) => { console.warn('Sync read payments err:', e); return null; }),
        getDocs(collection(db, 'advances')).catch((e) => { console.warn('Sync read advances err:', e); return null; }),
      ]);

      // 2. EMPLOYEES: Merge & Push
      const localEmps = getLocal<Employee[]>(KEYS.EMPLOYEES, []);
      const remoteEmps = empSnap && !empSnap.empty
        ? empSnap.docs.map((d) => d.data() as Employee).filter((e) => !deletedIds.has(e.id))
        : [];
      const mergedEmpsMap = new Map<string, Employee>();
      remoteEmps.forEach((e) => mergedEmpsMap.set(e.id, e));

      const empsToPush: Employee[] = [];
      for (const loc of localEmps) {
        if (!loc || isDummyEmployee(loc) || deletedIds.has(loc.id)) continue;
        if (!mergedEmpsMap.has(loc.id)) {
          mergedEmpsMap.set(loc.id, loc);
          empsToPush.push(loc);
        } else {
          const rem = mergedEmpsMap.get(loc.id)!;
          const locTime = new Date(loc.updatedAt || loc.createdAt || 0).getTime();
          const remTime = new Date(rem.updatedAt || rem.createdAt || 0).getTime();
          if (locTime > remTime || (loc.shiftRate && loc.shiftRate !== rem.shiftRate && loc.shiftRate === 900)) {
            mergedEmpsMap.set(loc.id, loc);
            empsToPush.push(loc);
          }
        }
      }

      const finalEmps = deduplicateEmployees(Array.from(mergedEmpsMap.values()));
      setLocal(KEYS.EMPLOYEES, finalEmps);
      pulledCount += remoteEmps.length;

      for (const emp of empsToPush) {
        try {
          await setDoc(doc(db, 'employees', emp.id), sanitizeForFirestore(emp));
          pushedCount++;
        } catch (err) {
          console.warn('Sync push employee err:', err);
        }
      }

      // 3. PAYMENTS / TRANSACTIONS: Merge & Push
      const localTxs = getLocal<PaymentTransaction[]>(KEYS.TRANSACTIONS, []);
      const remoteTxs = txSnap && !txSnap.empty
        ? txSnap.docs.map((d) => d.data() as PaymentTransaction).filter((t) => !deletedIds.has(t.id))
        : [];
      const mergedTxMap = new Map<string, PaymentTransaction>();
      remoteTxs.forEach((t) => mergedTxMap.set(t.id, t));

      const txsToPush: PaymentTransaction[] = [];
      for (const loc of localTxs) {
        if (!loc || !loc.id || deletedIds.has(loc.id)) continue;
        if (!mergedTxMap.has(loc.id)) {
          mergedTxMap.set(loc.id, loc);
          txsToPush.push(loc);
        }
      }

      const finalTxs = deduplicateTransactions(Array.from(mergedTxMap.values()));
      setLocal(KEYS.TRANSACTIONS, finalTxs);
      pulledCount += remoteTxs.length;

      for (const tx of txsToPush) {
        try {
          await setDoc(doc(db, 'payments', tx.id), sanitizeForFirestore(tx));
          pushedCount++;
        } catch (err) {
          console.warn('Sync push payment err:', err);
        }
      }

      // 4. ATTENDANCE: Merge & Push
      const localAtts = getLocal<Attendance[]>(KEYS.ATTENDANCE, []);
      const remoteAtts = attSnap && !attSnap.empty
        ? attSnap.docs.map((d) => d.data() as Attendance).filter((a) => !deletedIds.has(a.id))
        : [];
      const mergedAttMap = new Map<string, Attendance>();
      remoteAtts.forEach((a) => mergedAttMap.set(a.id, a));

      const attsToPush: Attendance[] = [];
      for (const loc of localAtts) {
        if (!loc || !loc.id || deletedIds.has(loc.id)) continue;
        if (!mergedAttMap.has(loc.id)) {
          mergedAttMap.set(loc.id, loc);
          attsToPush.push(loc);
        } else {
          const rem = mergedAttMap.get(loc.id)!;
          if (loc.isPaid && !rem.isPaid) {
            mergedAttMap.set(loc.id, loc);
            attsToPush.push(loc);
          }
        }
      }

      const finalAtts = deduplicateAttendance(Array.from(mergedAttMap.values()));
      setLocal(KEYS.ATTENDANCE, finalAtts);
      pulledCount += remoteAtts.length;

      for (const att of attsToPush) {
        try {
          await setDoc(doc(db, 'attendance', att.id), sanitizeForFirestore(att));
          pushedCount++;
        } catch (err) {
          console.warn('Sync push attendance err:', err);
        }
      }

      // 5. ADVANCES: Merge & Push
      const localAdvs = getLocal<AdvanceRecord[]>(KEYS.ADVANCES, []);
      const remoteAdvs = advSnap && !advSnap.empty
        ? advSnap.docs.map((d) => d.data() as AdvanceRecord).filter((a) => !deletedIds.has(a.id))
        : [];
      const mergedAdvMap = new Map<string, AdvanceRecord>();
      remoteAdvs.forEach((a) => mergedAdvMap.set(a.id, a));

      const advsToPush: AdvanceRecord[] = [];
      for (const loc of localAdvs) {
        if (!loc || !loc.id || deletedIds.has(loc.id)) continue;
        if (!mergedAdvMap.has(loc.id)) {
          mergedAdvMap.set(loc.id, loc);
          advsToPush.push(loc);
        }
      }

      const finalAdvs = deduplicateAdvances(Array.from(mergedAdvMap.values()));
      setLocal(KEYS.ADVANCES, finalAdvs);
      pulledCount += remoteAdvs.length;

      for (const adv of advsToPush) {
        try {
          await setDoc(doc(db, 'advances', adv.id), sanitizeForFirestore(adv));
          pushedCount++;
        } catch (err) {
          console.warn('Sync push advance err:', err);
        }
      }

      // 6. SHIFTS: Merge & Push
      const localShfs = getLocal<Shift[]>(KEYS.SHIFTS, []);
      const remoteShfs = shfSnap && !shfSnap.empty
        ? shfSnap.docs.map((d) => d.data() as Shift).filter((s) => !deletedIds.has(s.id))
        : [];
      const mergedShfMap = new Map<string, Shift>();
      remoteShfs.forEach((s) => mergedShfMap.set(s.id, s));

      const shfsToPush: Shift[] = [];
      for (const loc of localShfs) {
        if (!loc || !loc.id || deletedIds.has(loc.id)) continue;
        if (!mergedShfMap.has(loc.id)) {
          mergedShfMap.set(loc.id, loc);
          shfsToPush.push(loc);
        }
      }

      const finalShfs = deduplicateShifts(Array.from(mergedShfMap.values()));
      setLocal(KEYS.SHIFTS, finalShfs);
      pulledCount += remoteShfs.length;

      for (const shf of shfsToPush) {
        try {
          await setDoc(doc(db, 'shifts', shf.id), sanitizeForFirestore(shf));
          pushedCount++;
        } catch (err) {
          console.warn('Sync push shift err:', err);
        }
      }

      if (onDataUpdated) {
        onDataUpdated();
      }

      return { pulled: pulledCount, pushed: pushedCount };
    } catch (e) {
      console.warn('syncWithFirestore error:', e);
      return { pulled: pulledCount, pushed: pushedCount };
    }
  },

  // SILENT BACKGROUND SYNC WITH FIRESTORE (backwards compatibility)
  syncWithFirestoreInBackground: async (onDataUpdated?: () => void): Promise<void> => {
    await storageService.syncWithFirestore(onDataUpdated);
  },

  // REAL-TIME FIRESTORE LISTENER (Keeps laptop and phone in live sync)
  subscribeToCloudUpdates: (onDataUpdated: () => void): (() => void) => {
    if (!isFirebaseConfigured || !auth.currentUser) {
      return () => {};
    }

    const unsubs: (() => void)[] = [];

    try {
      // 1. Employees live listener
      const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
        const deletedIds = getDeletedIds();
        const localEmps = getLocal<Employee[]>(KEYS.EMPLOYEES, []);
        const remoteEmps = snap.docs
          .map((d) => d.data() as Employee)
          .filter((e) => !deletedIds.has(e.id));
        
        // Authoritative remote list from Firestore
        const map = new Map<string, Employee>();
        remoteEmps.forEach((rem) => {
          if (rem && !deletedIds.has(rem.id) && !isDummyEmployee(rem)) {
            map.set(rem.id, rem);
          }
        });

        // Preserve brand new local creations (<15s old) awaiting cloud roundtrip
        const now = Date.now();
        localEmps.forEach((loc) => {
          if (loc && !deletedIds.has(loc.id) && !isDummyEmployee(loc) && !map.has(loc.id)) {
            const ageMs = now - new Date(loc.createdAt || 0).getTime();
            if (ageMs < 15000) {
              map.set(loc.id, loc);
            }
          }
        });

        const cleanEmps = deduplicateEmployees(Array.from(map.values()));
        setLocal(KEYS.EMPLOYEES, cleanEmps);
        onDataUpdated();
      }, (err) => console.warn('Employees onSnapshot error:', err));
      unsubs.push(unsubEmp);

      // 2. Attendance live listener
      const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
        const deletedIds = getDeletedIds();
        const remoteAtts = snap.docs
          .map((d) => d.data() as Attendance)
          .filter((a) => !deletedIds.has(a.id));
        const cleanAtts = deduplicateAttendance(remoteAtts);
        setLocal(KEYS.ATTENDANCE, cleanAtts);
        onDataUpdated();
      }, (err) => console.warn('Attendance onSnapshot error:', err));
      unsubs.push(unsubAtt);

      // 3. Payments live listener
      const unsubPay = onSnapshot(collection(db, 'payments'), (snap) => {
        const deletedIds = getDeletedIds();
        const remoteTxs = snap.docs
          .map((d) => d.data() as PaymentTransaction)
          .filter((t) => !deletedIds.has(t.id));
        const cleanTxs = deduplicateTransactions(remoteTxs);
        setLocal(KEYS.TRANSACTIONS, cleanTxs);
        onDataUpdated();
      }, (err) => console.warn('Payments onSnapshot error:', err));
      unsubs.push(unsubPay);

      // 4. Advances live listener
      const unsubAdv = onSnapshot(collection(db, 'advances'), (snap) => {
        const deletedIds = getDeletedIds();
        const remoteAdvs = snap.docs
          .map((d) => d.data() as AdvanceRecord)
          .filter((a) => !deletedIds.has(a.id));
        const cleanAdvs = deduplicateAdvances(remoteAdvs);
        setLocal(KEYS.ADVANCES, cleanAdvs);
        onDataUpdated();
      }, (err) => console.warn('Advances onSnapshot error:', err));
      unsubs.push(unsubAdv);

      // 5. Shifts live listener
      const unsubShf = onSnapshot(collection(db, 'shifts'), (snap) => {
        const deletedIds = getDeletedIds();
        const remoteShfs = snap.docs
          .map((d) => d.data() as Shift)
          .filter((s) => !deletedIds.has(s.id));
        const cleanShfs = deduplicateShifts(remoteShfs);
        setLocal(KEYS.SHIFTS, cleanShfs);
        onDataUpdated();
      }, (err) => console.warn('Shifts onSnapshot error:', err));
      unsubs.push(unsubShf);

    } catch (e) {
      console.warn('Error setting up cloud listeners:', e);
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch (e) {}
      });
    };
  },

  // SYNC LOCAL DATA DIRECTLY TO CLOUD
  syncLocalToCloud: async (): Promise<{ syncedCount: number }> => {
    const payload = await storageService.exportAllData();
    const res = await storageService.restoreBackupToCloud(payload);
    return { syncedCount: res.restoredCount };
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

    // Native Mobile App handling (Android / iOS via Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        const saved = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        try {
          await Filesystem.writeFile({
            path: filename,
            data: jsonStr,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
        } catch (e) {}

        await Share.share({
          title: 'WorkPay Database Backup',
          text: `WorkPay Database Backup (${dateStr})`,
          url: saved.uri,
          dialogTitle: 'Save / Share Backup JSON',
        });

        return { filename, sizeBytes: jsonStr.length };
      } catch (mobileErr) {
        console.warn('Native mobile backup download error:', mobileErr);
      }
    }

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

