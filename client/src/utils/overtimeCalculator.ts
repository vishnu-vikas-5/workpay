/**
 * Overtime & Working Hours Calculation Engine for WorkPay
 * Handles shift durations, midnight crossovers, breaks, and wage calculations.
 */

export interface TimeDurationResult {
  totalMinutes: number;
  netMinutes: number;
  decimalHours: number;
}

/**
 * Calculates duration between two HH:mm timestamps, accommodating overnight shifts
 */
export function calculateDurationHours(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startTotalMins = startH * 60 + startM;
  let endTotalMins = endH * 60 + endM;

  // Handle shift crossing midnight (e.g., 22:00 to 06:00)
  if (endTotalMins < startTotalMins) {
    endTotalMins += 24 * 60;
  }

  const grossMinutes = endTotalMins - startTotalMins;
  const netMinutes = Math.max(0, grossMinutes - breakMinutes);

  // Return decimal hours with 2 decimal precision
  return Math.round((netMinutes / 60) * 100) / 100;
}

export interface WageCalculationResult {
  regularHours: number;
  overtimeHours: number;
  regularWages: number;
  overtimeRate: number;
  overtimeWages: number;
  totalPayable: number;
}

/**
 * Calculates regular and overtime breakdown according to WorkPay business rules:
 * - Standard shift is 8 hours
 * - Worker has a fixed Shift Rate for 8 hours (e.g. ₹800)
 * - Overtime is calculated strictly per hour as: Shift Rate / 8 (e.g. ₹800 / 8 = ₹100/hr)
 * Example:
 * 8 standard hours, 10 actual hours worked
 * Shift Rate: ₹800 (-> Overtime rate = ₹100/hr)
 * -> Regular: ₹800
 * -> Overtime: 2 hrs * ₹100/hr = ₹200
 * -> Total: ₹1,000
 */
export function calculateWagesFromShiftRate(
  actualHours: number,
  shiftRate: number,
  isOvertimeApproved: boolean = true
): WageCalculationResult {
  const standardHours = 8;
  const safeShiftRate = Math.max(0, shiftRate);
  const hourlyOvertimeRate = Math.round((safeShiftRate / standardHours) * 100) / 100; // Shift Rate / 8

  const safeActual = Math.max(0, actualHours);
  const regularHours = Math.min(safeActual, standardHours);
  const rawOvertimeHours = Math.max(0, Math.round((safeActual - standardHours) * 100) / 100);
  const payableOvertimeHours = isOvertimeApproved ? rawOvertimeHours : 0;

  // Regular wages: proportional if partial shift (<8h), full shiftRate if >=8h
  const regularWages = Math.round(((regularHours / standardHours) * safeShiftRate) * 100) / 100;
  const overtimeWages = Math.round((payableOvertimeHours * hourlyOvertimeRate) * 100) / 100;
  const totalPayable = Math.round((regularWages + overtimeWages) * 100) / 100;

  return {
    regularHours,
    overtimeHours: rawOvertimeHours,
    regularWages,
    overtimeRate: hourlyOvertimeRate,
    overtimeWages,
    totalPayable,
  };
}

export function calculateWages(
  actualHours: number,
  standardDailyHours: number = 8,
  hourlyWage: number,
  overtimeMultiplier: number = 1.0,
  isOvertimeApproved: boolean = false
): WageCalculationResult {
  const safeActual = Math.max(0, actualHours);
  const safeStandard = Math.max(1, standardDailyHours);
  const safeWage = Math.max(0, hourlyWage);
  const safeMultiplier = Math.max(1, overtimeMultiplier);

  const regularHours = Math.min(safeActual, safeStandard);
  const rawOvertimeHours = Math.max(0, safeActual - safeStandard);

  const payableOvertimeHours = isOvertimeApproved ? rawOvertimeHours : 0;

  const regularWages = Math.round(regularHours * safeWage);
  const overtimeRate = Math.round(safeWage * safeMultiplier * 100) / 100;
  const overtimeWages = Math.round(payableOvertimeHours * overtimeRate);
  const totalPayable = regularWages + overtimeWages;

  return {
    regularHours,
    overtimeHours: rawOvertimeHours,
    regularWages,
    overtimeRate,
    overtimeWages,
    totalPayable,
  };
}

/**
 * Checks if two shifts overlap for the same employee
 */
export function checkShiftOverlap(
  shift1: { date: string; startTime: string; endTime: string },
  shift2: { date: string; startTime: string; endTime: string }
): boolean {
  if (shift1.date !== shift2.date) return false;

  const [s1H, s1M] = shift1.startTime.split(':').map(Number);
  const [e1H, e1M] = shift1.endTime.split(':').map(Number);
  const [s2H, s2M] = shift2.startTime.split(':').map(Number);
  const [e2H, e2M] = shift2.endTime.split(':').map(Number);

  let start1 = s1H * 60 + s1M;
  let end1 = e1H * 60 + e1M;
  if (end1 <= start1) end1 += 24 * 60; // Crosses midnight

  let start2 = s2H * 60 + s2M;
  let end2 = e2H * 60 + e2M;
  if (end2 <= start2) end2 += 24 * 60;

  return start1 < end2 && start2 < end1;
}

