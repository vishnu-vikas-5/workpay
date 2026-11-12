import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  PayrollPeriodType,
  AdvanceRecord,
} from '../types';
import { storageService } from '../services/storageService';
import { calculateDurationHours, calculateWages, checkShiftOverlap } from '../utils/overtimeCalculator';
import { payoutService } from '../services/payoutService';
import { useAuth } from './AuthContext';

interface AppDataContextType {
  employees: Employee[];
  shifts: Shift[];
  attendance: Attendance[];
  overtimeRequests: OvertimeRequest[];
  payrollRecords: PayrollRecord[];
  transactions: PaymentTransaction[];
  advances: AdvanceRecord[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  departments: Department[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  
  // Employee Actions
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Employee>;
  updateEmployee: (emp: Employee) => Promise<void>;
  deactivateEmployee: (id: string) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Lending / Advance (Khata) Actions
  lendMoney: (params: {
    employeeId: string;
    amount: number;
    date?: string;
    notes?: string;
    paymentMethod?: 'cash' | 'upi';
  }) => Promise<AdvanceRecord>;
  repayAdvance: (params: {
    employeeId: string;
    amount: number;
    date?: string;
    notes?: string;
  }) => Promise<AdvanceRecord>;
  deleteAdvance: (id: string) => Promise<void>;

  // Shift Actions
  assignShift: (shiftData: Omit<Shift, 'id' | 'createdAt'>) => Promise<{ success: boolean; shift?: Shift; error?: string }>;
  assignBulkShifts: (employeeIds: string[], baseShift: Omit<Shift, 'id' | 'employeeId' | 'employeeName' | 'department' | 'createdAt'>) => Promise<{ success: boolean; count: number; error?: string }>;
  updateShift: (shift: Shift) => Promise<void>;
  cancelShift: (id: string) => Promise<void>;

  // Attendance Actions
  clockInEmployee: (employeeId: string, shiftId?: string, time?: string) => Promise<void>;
  clockOutEmployee: (attendanceId: string, clockOutTime?: string, breakMinutes?: number) => Promise<void>;
  markAttendanceAbsent: (employeeId: string, date: string, shiftId?: string, reason?: string) => Promise<void>;
  markDailyAttendance: (params: {
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'half-day';
    overtimeHours?: number;
  }) => Promise<Attendance>;
  markAllAttendance: (date: string, status: 'present' | 'absent') => Promise<void>;
  settleWeeklyAttendance: (params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    transactionId: string;
    advanceDeducted?: number;
  }) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  // Overtime Actions
  submitOvertimeRequest: (otData: Omit<OvertimeRequest, 'id' | 'createdAt'>) => Promise<void>;
  approveOvertime: (id: string, notes?: string, adjustedHours?: number) => Promise<void>;
  rejectOvertime: (id: string, reason?: string) => Promise<void>;

  // Payroll Actions
  generatePayroll: (periodType: PayrollPeriodType, startDate: string, endDate: string) => Promise<PayrollRecord[]>;
  approvePayrollRecord: (id: string) => Promise<void>;

  // Payment Actions
  disbursePayout: (payrollId: string, paymentMethod?: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual') => Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }>;
  recordQuickPayment: (data: {
    employee: Employee;
    shiftsCount: number;
    shiftRate: number;
    overtimeHours: number;
    overtimeRate: number;
    shiftPay: number;
    overtimePay: number;
    totalPayable: number;
    advanceDeducted?: number;
    paymentMethod?: 'upi_intent_manual' | 'razorpayx_upi';
    providerReferenceId?: string;
  }) => Promise<PaymentTransaction>;
  deleteTransaction: (id: string) => Promise<void>;

  // Notification Actions
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // System
  resetToSeedData: () => Promise<void>;
  cleanDuplicateData: () => Promise<{
    cleanedEmployees: number;
    cleanedAttendance: number;
    cleanedShifts: number;
    cleanedTransactions: number;
  }>;
  syncWithCloud: () => Promise<{ pulled: number; pushed: number }>;
  isSyncing: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, firebaseUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Initial fast local read (<1ms)
      await storageService.purgeDuplicateAndSampleData(false);

      const [
        emps,
        shfs,
        atts,
        ots,
        payrolls,
        txs,
        notifs,
        audits,
        depts,
        advs,
      ] = await Promise.all([
        storageService.getEmployees(),
        storageService.getShifts(),
        storageService.getAttendance(),
        storageService.getOvertimeRequests(),
        storageService.getPayrollRecords(),
        storageService.getTransactions(),
        storageService.getNotifications(),
        storageService.getAuditLogs(),
        storageService.getDepartments(),
        storageService.getAdvances(),
      ]);

      setEmployees(emps);
      setShifts(shfs);
      setAttendance(atts);
      setOvertimeRequests(ots);
      setPayrollRecords(payrolls);
      setTransactions(txs);
      setAdvances(advs);
      setNotifications(notifs);
      setAuditLogs(audits);
      setDepartments(depts);
    } catch (e) {
      console.error('Failed to load application data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Instant 0ms local data load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Reactive cloud synchronization and real-time listeners when user/auth is active
  useEffect(() => {
    if (!firebaseUser) return;

    let isSubscribed = true;

    const performSync = async () => {
      try {
        await storageService.syncWithFirestore();
        if (isSubscribed) {
          await loadData();
        }
      } catch (err) {
        console.warn('Reactive cloud sync notice:', err);
      }
    };

    // Immediate initial sync
    performSync();

    // Live real-time Firestore listeners for instant updates across devices
    const unsubscribe = storageService.subscribeToCloudUpdates(() => {
      if (isSubscribed) {
        loadData();
      }
    });

    // Auto-sync whenever device/tab regains focus or becomes visible
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        performSync();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Heartbeat sync every 15 seconds to ensure cross-device consistency
    const syncInterval = setInterval(() => {
      if (isSubscribed && document.visibilityState === 'visible') {
        performSync();
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(syncInterval);
    };
  }, [firebaseUser, loadData]);

  const syncWithCloud = async (): Promise<{ pulled: number; pushed: number }> => {
    setIsSyncing(true);
    try {
      const res = await storageService.syncWithFirestore();
      await loadData();
      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  // EMPLOYEES
  const addEmployee = async (empData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> => {
    const newId = `emp-${Date.now()}`;
    const nextCodeNumber = 1000 + employees.length + 1;
    const numericRate = typeof empData.shiftRate === 'number'
      ? empData.shiftRate
      : parseFloat(String(empData.shiftRate)) || 800;
    const hourlyWage = Math.round((numericRate / 8) * 100) / 100;

    // Guaranteed valid email matching firestore.rules regex
    const namePrefix = empData.fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || `worker${nextCodeNumber}`;
    const cleanEmail = empData.email && empData.email.includes('@')
      ? empData.email.trim()
      : `${namePrefix}@workpay.io`;

    const newEmployee: Employee = {
      ...empData,
      id: newId,
      employeeCode: empData.employeeCode?.trim() || `WP-EMP-${nextCodeNumber}`,
      fullName: empData.fullName.trim(),
      phone: empData.phone.trim(),
      email: cleanEmail,
      department: empData.department?.trim() || 'Warehouse & Logistics',
      designation: empData.designation?.trim() || 'Shift Worker',
      dateOfJoining: empData.dateOfJoining || new Date().toISOString().split('T')[0],
      shiftRate: numericRate,
      hourlyWage,
      standardWorkingHours: 8,
      overtimeMultiplier: 1.0,
      upiId: empData.upiId?.trim() || undefined,
      advanceBalance: typeof empData.advanceBalance === 'number' ? empData.advanceBalance : 0,
      status: empData.status || 'active',
      userId: firebaseUser?.uid || user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic UI update (<1ms)
    setEmployees((prev) => [newEmployee, ...prev]);

    await storageService.saveEmployee(newEmployee);
    await storageService.logAction(
      'EMPLOYEE_CREATED',
      'employee',
      newEmployee.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { name: newEmployee.fullName, department: newEmployee.department }
    );
    return newEmployee;
  };

  const updateEmployee = async (emp: Employee) => {
    const numericRate = typeof emp.shiftRate === 'number'
      ? emp.shiftRate
      : parseFloat(String(emp.shiftRate)) || 800;
    const hourlyWage = Math.round((numericRate / 8) * 100) / 100;
    const namePrefix = emp.fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'worker';
    const cleanEmail = emp.email && emp.email.includes('@')
      ? emp.email.trim()
      : `${namePrefix}@workpay.io`;

    const sanitized: Employee = {
      ...emp,
      fullName: emp.fullName.trim(),
      phone: emp.phone.trim(),
      email: cleanEmail,
      department: emp.department?.trim() || 'Warehouse & Logistics',
      designation: emp.designation?.trim() || 'Shift Worker',
      dateOfJoining: emp.dateOfJoining || new Date().toISOString().split('T')[0],
      shiftRate: numericRate,
      hourlyWage,
      standardWorkingHours: 8,
      overtimeMultiplier: 1.0,
      upiId: emp.upiId?.trim() || undefined,
      advanceBalance: typeof emp.advanceBalance === 'number' ? emp.advanceBalance : 0,
      status: emp.status || 'active',
      updatedAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setEmployees((prev) => prev.map((e) => (e.id === sanitized.id ? sanitized : e)));

    await storageService.saveEmployee(sanitized);
    await storageService.logAction(
      'EMPLOYEE_UPDATED',
      'employee',
      sanitized.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { name: sanitized.fullName, status: sanitized.status }
    );
  };

  const deactivateEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    const updated = { ...emp, status: 'inactive' as const, updatedAt: new Date().toISOString() };

    // Optimistic UI update
    setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));

    await storageService.saveEmployee(updated);
    await storageService.logAction(
      'EMPLOYEE_DEACTIVATED',
      'employee',
      id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { name: emp.fullName }
    );
  };

  const deleteEmployee = async (id: string) => {
    // Optimistic UI update across all related collections
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setAttendance((prev) => prev.filter((a) => a.employeeId !== id));
    setShifts((prev) => prev.filter((s) => s.employeeId !== id));

    await storageService.deleteEmployee(id);
    await storageService.logAction(
      'EMPLOYEE_DELETED',
      'employee',
      id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { id }
    );
  };

  const deleteAttendance = async (id: string) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    await storageService.deleteAttendance(id);
  };

  // LENDING / ADVANCE ACTIONS
  const lendMoney = async (params: {
    employeeId: string;
    amount: number;
    date?: string;
    notes?: string;
    paymentMethod?: 'cash' | 'upi';
  }): Promise<AdvanceRecord> => {
    const targetEmp = employees.find((e) => e.id === params.employeeId);
    if (!targetEmp) throw new Error('Employee not found');

    const cleanAmount = Math.round(Number(params.amount) * 100) / 100;
    if (isNaN(cleanAmount) || cleanAmount <= 0) throw new Error('Loan amount must be greater than zero');

    const advRecord: AdvanceRecord = {
      id: `ADV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      amount: cleanAmount,
      date: params.date || new Date().toISOString().split('T')[0],
      type: 'give',
      notes: params.notes?.trim() || 'Lent Money / Cash Advance',
      paymentMethod: params.paymentMethod || 'cash',
      createdAt: new Date().toISOString(),
    };

    const currentBal = targetEmp.advanceBalance || 0;
    const newBal = Math.round((currentBal + cleanAmount) * 100) / 100;
    const updatedEmp: Employee = {
      ...targetEmp,
      advanceBalance: newBal,
    };

    // Optimistic UI update
    setAdvances((prev) => [advRecord, ...prev]);
    setEmployees((prev) => prev.map((e) => (e.id === targetEmp.id ? updatedEmp : e)));

    await storageService.saveAdvance(advRecord);
    await storageService.saveEmployee(updatedEmp);
    await storageService.logAction(
      'LEND_MONEY',
      'employee',
      targetEmp.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      {
        employee: targetEmp.fullName,
        amount: cleanAmount,
        notes: advRecord.notes,
        newBalance: newBal,
      }
    );

    return advRecord;
  };

  const repayAdvance = async (params: {
    employeeId: string;
    amount: number;
    date?: string;
    notes?: string;
  }): Promise<AdvanceRecord> => {
    const targetEmp = employees.find((e) => e.id === params.employeeId);
    if (!targetEmp) throw new Error('Employee not found');

    const cleanAmount = Math.round(Number(params.amount) * 100) / 100;
    if (isNaN(cleanAmount) || cleanAmount <= 0) throw new Error('Repayment amount must be greater than zero');

    const currentBal = targetEmp.advanceBalance || 0;
    const actualRepaid = Math.min(currentBal, cleanAmount);
    const newBal = Math.max(0, Math.round((currentBal - actualRepaid) * 100) / 100);

    const advRecord: AdvanceRecord = {
      id: `ADV-REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      amount: actualRepaid,
      date: params.date || new Date().toISOString().split('T')[0],
      type: 'repay',
      notes: params.notes?.trim() || 'Cash Repayment by Worker',
      paymentMethod: 'cash',
      createdAt: new Date().toISOString(),
    };

    const updatedEmp: Employee = {
      ...targetEmp,
      advanceBalance: newBal,
    };

    // Optimistic UI update
    setAdvances((prev) => [advRecord, ...prev]);
    setEmployees((prev) => prev.map((e) => (e.id === targetEmp.id ? updatedEmp : e)));

    await storageService.saveAdvance(advRecord);
    await storageService.saveEmployee(updatedEmp);
    await storageService.logAction(
      'REPAY_ADVANCE',
      'employee',
      targetEmp.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      {
        employee: targetEmp.fullName,
        amount: actualRepaid,
        notes: advRecord.notes,
        newBalance: newBal,
      }
    );

    return advRecord;
  };

  const deleteAdvance = async (id: string) => {
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    await storageService.deleteAdvance(id);
  };

  // SHIFTS
  const assignShift = async (
    shiftData: Omit<Shift, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; shift?: Shift; error?: string }> => {
    // 1. Overlap validation
    const employeeShifts = shifts.filter(
      (s) => s.employeeId === shiftData.employeeId && s.shiftDate === shiftData.shiftDate && s.shiftStatus !== 'Cancelled'
    );

    for (const existing of employeeShifts) {
      if (
        checkShiftOverlap(
          { date: existing.shiftDate, startTime: existing.scheduledStartTime, endTime: existing.scheduledEndTime },
          { date: shiftData.shiftDate, startTime: shiftData.scheduledStartTime, endTime: shiftData.scheduledEndTime }
        )
      ) {
        return {
          success: false,
          error: `Shift overlaps with existing shift (${existing.scheduledStartTime} - ${existing.scheduledEndTime}) on ${existing.shiftDate}`,
        };
      }
    }

    const newId = `shf-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    const newShift: Shift = {
      ...shiftData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    await storageService.saveShift(newShift);

    // Create Notification
    await storageService.saveNotification({
      id: `notif-${Date.now()}`,
      userId: shiftData.employeeId,
      title: 'New Shift Scheduled',
      message: `You have been assigned a shift on ${shiftData.shiftDate} from ${shiftData.scheduledStartTime} to ${shiftData.scheduledEndTime}.`,
      type: 'shift_assigned',
      link: '/employee-dashboard',
      read: false,
      createdAt: new Date().toISOString(),
    });

    await storageService.logAction(
      'SHIFT_ASSIGNED',
      'shift',
      newId,
      user?.name || 'Manager',
      user?.role || 'manager',
      {
        employee: shiftData.employeeName,
        date: shiftData.shiftDate,
        start: shiftData.scheduledStartTime,
        end: shiftData.scheduledEndTime,
      }
    );

    await loadData();
    return { success: true, shift: newShift };
  };

  const assignBulkShifts = async (
    employeeIds: string[],
    baseShift: Omit<Shift, 'id' | 'employeeId' | 'employeeName' | 'department' | 'createdAt'>
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    let successCount = 0;
    const errors: string[] = [];

    for (const empId of employeeIds) {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) continue;

      const res = await assignShift({
        ...baseShift,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        shiftCode: `SHF-${Math.floor(1000 + Math.random() * 9000)}`,
      });

      if (res.success) {
        successCount++;
      } else if (res.error) {
        errors.push(`${emp.fullName}: ${res.error}`);
      }
    }

    await loadData();
    if (successCount === 0 && errors.length > 0) {
      return { success: false, count: 0, error: errors[0] };
    }
    return { success: true, count: successCount };
  };

  const updateShift = async (shift: Shift) => {
    await storageService.saveShift(shift);
    await storageService.logAction(
      'SHIFT_UPDATED',
      'shift',
      shift.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { status: shift.shiftStatus, employee: shift.employeeName }
    );
    await loadData();
  };

  const cancelShift = async (id: string) => {
    const shift = shifts.find((s) => s.id === id);
    if (!shift) return;
    const updated: Shift = {
      ...shift,
      shiftStatus: 'Cancelled',
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveShift(updated);
    await storageService.saveNotification({
      id: `notif-${Date.now()}`,
      userId: shift.employeeId,
      title: 'Shift Cancelled',
      message: `Your scheduled shift on ${shift.shiftDate} has been cancelled by administration.`,
      type: 'shift_changed',
      link: '/employee-dashboard',
      read: false,
      createdAt: new Date().toISOString(),
    });
    await loadData();
  };

  // ATTENDANCE
  const clockInEmployee = async (employeeId: string, shiftId?: string, timeStr?: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const now = new Date();
    const clockIn = timeStr || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    const newAttendance: Attendance = {
      id: `att-${Date.now()}`,
      shiftId,
      employeeId,
      employeeName: emp.fullName,
      department: emp.department,
      date: today,
      clockInTime: clockIn,
      breakDurationMinutes: 0,
      workingDurationHours: 0,
      overtimeHours: 0,
      status: 'present',
      recordedBy: `${user?.name || 'Manager'} (${user?.role || 'manager'})`,
      verificationMethod: 'manual',
      createdAt: new Date().toISOString(),
    };

    await storageService.saveAttendance(newAttendance);

    // Update shift status if shift exists
    if (shiftId) {
      const shift = shifts.find((s) => s.id === shiftId);
      if (shift) {
        await storageService.saveShift({
          ...shift,
          shiftStatus: 'In Progress',
          actualClockIn: clockIn,
        });
      }
    }

    await loadData();
  };

  const clockOutEmployee = async (attendanceId: string, clockOutTime?: string, breakMinutes: number = 30) => {
    const att = attendance.find((a) => a.id === attendanceId);
    if (!att) return;

    const now = new Date();
    const clockOut = clockOutTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Calculate total duration
    const totalWorkingHours = calculateDurationHours(att.clockInTime, clockOut, breakMinutes);
    const emp = employees.find((e) => e.id === att.employeeId);
    const standardHours = emp?.standardWorkingHours || 8;
    const hourlyWage = emp?.hourlyWage || 150;
    const overtimeMultiplier = emp?.overtimeMultiplier || 1.5;

    const rawOvertimeHours = Math.max(0, totalWorkingHours - standardHours);

    const updatedAtt: Attendance = {
      ...att,
      clockOutTime: clockOut,
      breakDurationMinutes: breakMinutes,
      workingDurationHours: totalWorkingHours,
      overtimeHours: rawOvertimeHours,
    };

    await storageService.saveAttendance(updatedAtt);

    // If shift linked, complete it
    if (att.shiftId) {
      const shift = shifts.find((s) => s.id === att.shiftId);
      if (shift) {
        await storageService.saveShift({
          ...shift,
          actualClockOut: clockOut,
          breakDurationMinutes: breakMinutes,
          totalWorkingHours,
          regularHours: Math.min(totalWorkingHours, standardHours),
          overtimeHours: rawOvertimeHours,
          shiftStatus: 'Completed',
        });
      }
    }

    // If overtime was worked, automatically generate an Overtime Request for review!
    if (rawOvertimeHours > 0 && emp) {
      const shiftRate = emp.shiftRate || (emp.hourlyWage ? emp.hourlyWage * 8 : 800);
      const hourlyOvertimeRate = Math.round((shiftRate / 8) * 100) / 100; // Shift Rate / 8

      const otRequest: OvertimeRequest = {
        id: `ot-${Date.now()}`,
        shiftId: att.shiftId || 'ad-hoc',
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        date: att.date,
        scheduledHours: standardHours,
        actualHours: totalWorkingHours,
        overtimeHours: rawOvertimeHours,
        hourlyWage: hourlyOvertimeRate,
        overtimeMultiplier: 1.0,
        calculatedOvertimeWage: Math.round(rawOvertimeHours * hourlyOvertimeRate),
        reason: 'Shift overtime recorded during clock-out',
        status: 'pending',
        payrollIncluded: false,
        createdAt: new Date().toISOString(),
      };
      await storageService.saveOvertimeRequest(otRequest);

      // Notify admin
      await storageService.saveNotification({
        id: `notif-${Date.now()}`,
        userId: 'admin',
        title: 'Overtime Request Pending',
        message: `${emp.fullName} worked ${rawOvertimeHours}h overtime on ${att.date}. Approval needed.`,
        type: 'overtime_submitted',
        link: '/overtime',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    await loadData();
  };

  const markAttendanceAbsent = async (employeeId: string, date: string, shiftId?: string, reason?: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const absAttendance: Attendance = {
      id: `att-${Date.now()}`,
      shiftId,
      employeeId,
      employeeName: emp.fullName,
      department: emp.department,
      date,
      clockInTime: '00:00',
      clockOutTime: '00:00',
      breakDurationMinutes: 0,
      workingDurationHours: 0,
      overtimeHours: 0,
      status: 'absent',
      recordedBy: `${user?.name || 'Manager'} (${user?.role || 'manager'})`,
      verificationMethod: 'manual',
      notes: reason || 'Marked absent',
      createdAt: new Date().toISOString(),
    };

    await storageService.saveAttendance(absAttendance);

    if (shiftId) {
      const shift = shifts.find((s) => s.id === shiftId);
      if (shift) {
        await storageService.saveShift({
          ...shift,
          shiftStatus: 'Absent',
          notes: reason || 'Worker absent for shift',
        });
      }
    }

    await loadData();
  };

  const markDailyAttendance = async (params: {
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'half-day';
    overtimeHours?: number;
  }): Promise<Attendance> => {
    const emp = employees.find((e) => e.id === params.employeeId);
    if (!emp) throw new Error('Employee not found');

    const shiftRate = emp.shiftRate || emp.hourlyWage * 8 || 800;
    const shiftsCount = params.status === 'present' ? 1 : params.status === 'half-day' ? 0.5 : 0;
    const overtimeHours = Math.max(0, params.overtimeHours ?? 0);

    const existing = attendance.find(
      (a) => a.employeeId === params.employeeId && a.date === params.date
    );

    const record: Attendance = {
      id: existing?.id || `att-${params.date}-${params.employeeId}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department || 'Operations',
      date: params.date,
      clockInTime: '09:00',
      clockOutTime: '17:00',
      breakDurationMinutes: 0,
      workingDurationHours: shiftsCount * 8,
      overtimeHours,
      shiftsCount,
      shiftRate,
      status: params.status,
      recordedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
      verificationMethod: 'manual',
      isPaid: existing?.isPaid || false,
      paidAt: existing?.paidAt,
      paidTransactionId: existing?.paidTransactionId,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Optimistic UI update: React re-renders in 0ms!
    setAttendance((prev) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });

    // Save to local cache (<1ms) and fire-and-forget sync to Firestore
    await storageService.saveAttendance(record);
    return record;
  };

  const markAllAttendance = async (date: string, status: 'present' | 'absent') => {
    const shiftsCount = status === 'present' ? 1 : 0;
    const newRecords: Attendance[] = [];

    for (const emp of employees) {
      const shiftRate = emp.shiftRate || emp.hourlyWage * 8 || 800;
      const existing = attendance.find((a) => a.employeeId === emp.id && a.date === date);

      const record: Attendance = {
        id: existing?.id || `att-${date}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department || 'Operations',
        date,
        clockInTime: '09:00',
        clockOutTime: '17:00',
        breakDurationMinutes: 0,
        workingDurationHours: shiftsCount * 8,
        overtimeHours: existing?.overtimeHours || 0,
        shiftsCount,
        shiftRate,
        status,
        recordedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
        verificationMethod: 'manual',
        isPaid: existing?.isPaid || false,
        paidAt: existing?.paidAt,
        paidTransactionId: existing?.paidTransactionId,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      newRecords.push(record);
    }

    // Optimistic UI update for all employees instantly
    setAttendance((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const r of newRecords) {
        map.set(r.id, r);
      }
      return Array.from(map.values());
    });

    // Bulk save in 1 local step + 1 background Firestore batch
    await storageService.saveBulkAttendance(newRecords);
  };

  const settleWeeklyAttendance = async (params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    transactionId: string;
    advanceDeducted?: number;
  }) => {
    // Optimistic UI update
    setAttendance((prev) =>
      prev.map((a) => {
        if (
          a.employeeId === params.employeeId &&
          a.date >= params.startDate &&
          a.date <= params.endDate
        ) {
          return {
            ...a,
            isPaid: true,
            paidAt: new Date().toISOString(),
            paidTransactionId: params.transactionId,
          };
        }
        return a;
      })
    );

    const records = attendance.filter(
      (a) =>
        a.employeeId === params.employeeId &&
        a.date >= params.startDate &&
        a.date <= params.endDate
    );
    const updatedAtts: Attendance[] = records.map((a) => ({
      ...a,
      isPaid: true,
      paidAt: new Date().toISOString(),
      paidTransactionId: params.transactionId,
    }));
    await storageService.saveBulkAttendance(updatedAtts);

    if (params.advanceDeducted && params.advanceDeducted > 0) {
      const targetEmp = employees.find((e) => e.id === params.employeeId);
      if (targetEmp) {
        const cleanDeducted = Math.round(Number(params.advanceDeducted) * 100) / 100;
        const currentBal = targetEmp.advanceBalance || 0;
        const newBal = Math.max(0, Math.round((currentBal - cleanDeducted) * 100) / 100);

        const updatedTargetEmp: Employee = {
          ...targetEmp,
          advanceBalance: newBal,
        };

        const advRecord: AdvanceRecord = {
          id: `ADV-DED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          employeeId: targetEmp.id,
          employeeName: targetEmp.fullName,
          amount: cleanDeducted,
          date: new Date().toISOString().split('T')[0],
          type: 'deduct',
          notes: `Deducted from Weekly Payout (${params.transactionId})`,
          paymentMethod: 'upi',
          referenceId: params.transactionId,
          createdAt: new Date().toISOString(),
        };

        // Optimistic UI updates
        setEmployees((prev) => prev.map((e) => (e.id === targetEmp.id ? updatedTargetEmp : e)));
        setAdvances((prev) => [advRecord, ...prev]);

        await storageService.saveEmployee(updatedTargetEmp);
        await storageService.saveAdvance(advRecord);
      }
    }
  };

  // OVERTIME
  const submitOvertimeRequest = async (otData: Omit<OvertimeRequest, 'id' | 'createdAt'>) => {
    const newId = `ot-${Date.now()}`;
    const newOt: OvertimeRequest = {
      ...otData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveOvertimeRequest(newOt);
    await loadData();
  };

  const approveOvertime = async (id: string, notes?: string, adjustedHours?: number) => {
    const ot = overtimeRequests.find((o) => o.id === id);
    if (!ot) return;

    const emp = employees.find((e) => e.id === ot.employeeId);
    const shiftRate = emp?.shiftRate || (ot.hourlyWage ? ot.hourlyWage * 8 : 800);
    const hourlyOvertimeRate = Math.round((shiftRate / 8) * 100) / 100;

    const approvedHours = adjustedHours !== undefined ? adjustedHours : ot.overtimeHours;
    const approvedWage = Math.round(approvedHours * hourlyOvertimeRate);

    const updated: OvertimeRequest = {
      ...ot,
      status: 'approved',
      adjustedOvertimeHours: approvedHours,
      adjustedOvertimeWage: approvedWage,
      approvedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
      approvalDate: new Date().toISOString(),
      approvalNotes: notes || 'Approved by administrator',
      updatedAt: new Date().toISOString(),
    };

    await storageService.saveOvertimeRequest(updated);

    await storageService.saveNotification({
      id: `notif-${Date.now()}`,
      userId: ot.employeeId,
      title: 'Overtime Approved',
      message: `Your ${approvedHours}h overtime for ${ot.date} (₹${approvedWage}) was approved.`,
      type: 'overtime_approved',
      link: '/employee-dashboard',
      read: false,
      createdAt: new Date().toISOString(),
    });

    await storageService.logAction(
      'OVERTIME_APPROVED',
      'overtime',
      id,
      user?.name || 'Admin',
      user?.role || 'admin',
      { employee: ot.employeeName, hours: approvedHours, wage: approvedWage }
    );

    await loadData();
  };

  const rejectOvertime = async (id: string, reason?: string) => {
    const ot = overtimeRequests.find((o) => o.id === id);
    if (!ot) return;

    const updated: OvertimeRequest = {
      ...ot,
      status: 'rejected',
      approvalNotes: reason || 'Overtime rejected after review',
      updatedAt: new Date().toISOString(),
    };

    await storageService.saveOvertimeRequest(updated);
    await loadData();
  };

  // PAYROLL GENERATION
  const generatePayroll = async (
    periodType: PayrollPeriodType,
    startDate: string,
    endDate: string
  ): Promise<PayrollRecord[]> => {
    const newRecords: PayrollRecord[] = [];

    for (const emp of employees.filter((e) => e.status === 'active')) {
      // Find completed shifts in the period
      const empShifts = shifts.filter(
        (s) =>
          s.employeeId === emp.id &&
          s.shiftDate >= startDate &&
          s.shiftDate <= endDate &&
          s.shiftStatus === 'Completed'
      );

      // Find approved overtime requests that haven't been paid yet
      const empApprovedOT = overtimeRequests.filter(
        (o) =>
          o.employeeId === emp.id &&
          o.date >= startDate &&
          o.date <= endDate &&
          o.status === 'approved' &&
          !o.payrollIncluded
      );

      const shiftRate = emp.shiftRate || (emp.hourlyWage ? emp.hourlyWage * 8 : 800);
      const hourlyOvertimeRate = Math.round((shiftRate / 8) * 100) / 100;

      const totalRegularHours = empShifts.reduce((sum, s) => sum + (s.regularHours || 0), 0);
      const totalOvertimeHours = empApprovedOT.reduce(
        (sum, o) => sum + (o.adjustedOvertimeHours ?? o.overtimeHours ?? 0),
        0
      );

      // Regular wages: each full 8-hour shift earns shiftRate; partial shifts proportional
      const regularWages = Math.round((totalRegularHours / 8) * shiftRate);
      const overtimeWages = Math.round(
        empApprovedOT.reduce(
          (sum, o) => sum + (o.adjustedOvertimeWage ?? o.calculatedOvertimeWage ?? (o.overtimeHours * hourlyOvertimeRate)),
          0
        )
      );

      const bonuses = 0;
      const deductions = 0;
      const totalPayable = regularWages + overtimeWages + bonuses - deductions;

      if (totalPayable > 0 || empShifts.length > 0) {
        const payrollId = `pay-${startDate.replace(/-/g, '')}-${emp.id}`;
        const record: PayrollRecord = {
          id: payrollId,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          department: emp.department,
          periodType,
          periodStartDate: startDate,
          periodEndDate: endDate,
          totalShifts: empShifts.length,
          regularHours: totalRegularHours,
          overtimeHours: totalOvertimeHours,
          regularWages,
          overtimeWages,
          bonuses,
          deductions,
          totalPayable,
          approvalStatus: 'approved', // auto-ready for payout upon generation
          approvedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
          approvedAt: new Date().toISOString(),
          paymentStatus: 'unpaid',
          createdAt: new Date().toISOString(),
        };

        await storageService.savePayrollRecord(record);
        newRecords.push(record);

        // Mark overtime requests as included
        for (const ot of empApprovedOT) {
          await storageService.saveOvertimeRequest({
            ...ot,
            payrollIncluded: true,
            payrollId: record.id,
          });
        }
      }
    }

    await loadData();
    return newRecords;
  };

  const approvePayrollRecord = async (id: string) => {
    const record = payrollRecords.find((p) => p.id === id);
    if (!record) return;

    const updated: PayrollRecord = {
      ...record,
      approvalStatus: 'approved',
      approvedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storageService.savePayrollRecord(updated);
    await loadData();
  };

  // PAYMENT DISBURSEMENT
  const disbursePayout = async (
    payrollId: string,
    paymentMethod: 'razorpayx_upi' | 'razorpayx_bank_transfer' | 'upi_intent_manual' = 'razorpayx_upi'
  ): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> => {
    const payroll = payrollRecords.find((p) => p.id === payrollId);
    if (!payroll) return { success: false, error: 'Payroll record not found.' };

    const employee = employees.find((e) => e.id === payroll.employeeId);
    if (!employee) return { success: false, error: 'Employee not found.' };

    const result = await payoutService.initiatePayout({
      payroll,
      employee,
      paymentMethod,
      adminName: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
    });

    await loadData();
    return result;
  };

  const recordQuickPayment = async (data: {
    employee: Employee;
    shiftsCount: number;
    shiftRate: number;
    overtimeHours: number;
    overtimeRate: number;
    shiftPay: number;
    overtimePay: number;
    totalPayable: number;
    advanceDeducted?: number;
    paymentMethod?: 'upi_intent_manual' | 'razorpayx_upi';
    providerReferenceId?: string;
  }): Promise<PaymentTransaction> => {
    const txId = `TXN-WP-${Date.now().toString().slice(-8)}`;
    const utr = data.providerReferenceId || `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const advanceDeducted = Math.max(0, Math.round((data.advanceDeducted || 0) * 100) / 100);
    const grossPay = Math.round(((data.shiftPay || 0) + (data.overtimePay || 0)) * 100) / 100;
    const currentBal = data.employee.advanceBalance || 0;
    const remainingAdvanceBalance = Math.max(0, Math.round((currentBal - advanceDeducted) * 100) / 100);

    const transaction: PaymentTransaction = {
      id: txId,
      payrollId: `pay-quick-${Date.now()}`,
      employeeId: data.employee.id,
      employeeName: data.employee.fullName,
      employeeCode: data.employee.employeeCode || `EMP-${data.employee.id.slice(-4)}`,
      employeePhone: data.employee.phone,
      amount: data.totalPayable,
      currency: 'INR',
      paymentMethod: data.paymentMethod || 'upi_intent_manual',
      destination: {
        type: 'vpa',
        upiId: data.employee.upiId || `${data.employee.phone}@upi`,
        beneficiaryName: data.employee.fullName,
      },
      providerReferenceId: utr,
      idempotencyKey: `quick-${Date.now()}-${data.employee.id}`,
      status: 'Successful',
      initiatedBy: `${user?.name || 'Admin'} (${user?.role || 'admin'})`,
      initiatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      shiftsCount: data.shiftsCount,
      shiftRate: data.shiftRate,
      overtimeHours: data.overtimeHours,
      overtimeRate: data.overtimeRate,
      shiftPay: data.shiftPay,
      overtimePay: data.overtimePay,
      grossPay,
      advanceDeducted,
      remainingAdvanceBalance,
      userId: firebaseUser?.uid || user?.id || '',
      notes: advanceDeducted > 0
        ? `${data.shiftsCount} shift (${data.shiftRate}) + ${data.overtimeHours}h OT — Less: ₹${advanceDeducted} Advance (Bal: ₹${remainingAdvanceBalance})`
        : `${data.shiftsCount} shift${data.shiftsCount > 1 ? 's' : ''} (₹${data.shiftRate}) + ${data.overtimeHours}h OT (₹${data.overtimeRate}/hr)`,
    };

    // Optimistic UI update: Instant UI addition
    setTransactions((prev) => [transaction, ...prev]);

    await storageService.saveTransaction(transaction);

    // If advance was deducted, record ledger entry and update employee's remaining advance
    if (advanceDeducted > 0) {
      const advRecord: AdvanceRecord = {
        id: `ADV-DED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        employeeId: data.employee.id,
        employeeName: data.employee.fullName,
        amount: advanceDeducted,
        date: new Date().toISOString().split('T')[0],
        type: 'deduct',
        notes: `Deducted from Shift Salary (${txId})`,
        paymentMethod: 'upi',
        referenceId: txId,
        createdAt: new Date().toISOString(),
      };

      const updatedEmp: Employee = {
        ...data.employee,
        advanceBalance: remainingAdvanceBalance,
      };

      // Optimistic updates
      setAdvances((prev) => [advRecord, ...prev]);
      setEmployees((prev) => prev.map((e) => (e.id === data.employee.id ? updatedEmp : e)));

      await storageService.saveAdvance(advRecord);
      await storageService.saveEmployee(updatedEmp);
    }

    await storageService.logAction(
      'QUICK_UPI_PAYOUT',
      'payment',
      transaction.id,
      user?.name || 'Admin',
      user?.role || 'admin',
      {
        employee: data.employee.fullName,
        upiId: data.employee.upiId,
        grossPay,
        advanceDeducted,
        amount: data.totalPayable,
        utr,
      }
    );

    // Trigger background sync to ensure immediate cloud propagation
    storageService.syncWithFirestoreInBackground().catch(() => {});

    return transaction;
  };

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await storageService.deleteTransaction(id);
  };

  // NOTIFICATIONS
  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await storageService.markNotificationRead(id);
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await storageService.markAllNotificationsRead();
  };

  const resetToSeedData = async () => {
    await storageService.resetToSeedData();
    await loadData();
  };

  const cleanDuplicateData = async () => {
    const stats = await storageService.purgeDuplicateAndSampleData(true);
    await loadData();
    return stats;
  };

  return (
    <AppDataContext.Provider
      value={{
        employees,
        shifts,
        attendance,
        overtimeRequests,
        payrollRecords,
        transactions,
        advances,
        notifications,
        auditLogs,
        departments,
        loading,
        refreshAll: loadData,
        addEmployee,
        updateEmployee,
        deactivateEmployee,
        deleteEmployee,
        lendMoney,
        repayAdvance,
        deleteAdvance,
        assignShift,
        assignBulkShifts,
        updateShift,
        cancelShift,
        clockInEmployee,
        clockOutEmployee,
        markAttendanceAbsent,
        markDailyAttendance,
        markAllAttendance,
        settleWeeklyAttendance,
        deleteAttendance,
        submitOvertimeRequest,
        approveOvertime,
        rejectOvertime,
        generatePayroll,
        approvePayrollRecord,
        disbursePayout,
        recordQuickPayment,
        deleteTransaction,
        markNotificationRead,
        markAllNotificationsRead,
        resetToSeedData,
        cleanDuplicateData,
        syncWithCloud,
        isSyncing,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

