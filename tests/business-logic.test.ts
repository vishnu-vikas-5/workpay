import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateDurationHours,
  calculateWages,
  calculateWagesFromShiftRate,
  checkShiftOverlap,
} from '../client/src/utils/overtimeCalculator';
import { maskAccountNumber, maskUpiId, formatHours } from '../client/src/utils/utils';
import { generateUpiIntentUri } from '../client/src/utils/upiUtils';

describe('WorkPay Business Logic & Overtime Engine', () => {
  it('correctly calculates wages based on 8-Hour Shift Rate and (Shift Rate ÷ 8) Overtime', () => {
    // Worker Shift Rate: ₹800 for 8 hours (Overtime Rate = 800 / 8 = ₹100/hr)
    // Scenario 1: Standard 8-hour shift worked -> ₹800
    const standardShift = calculateWagesFromShiftRate(8, 800, true);
    assert.strictEqual(standardShift.regularHours, 8);
    assert.strictEqual(standardShift.overtimeHours, 0);
    assert.strictEqual(standardShift.regularWages, 800);
    assert.strictEqual(standardShift.overtimeWages, 0);
    assert.strictEqual(standardShift.totalPayable, 800);

    // Scenario 2: 10 hours worked (8h standard + 2h OT @ ₹100/hr) -> 800 + 200 = ₹1,000
    const overtimeShift = calculateWagesFromShiftRate(10, 800, true);
    assert.strictEqual(overtimeShift.regularHours, 8);
    assert.strictEqual(overtimeShift.overtimeHours, 2);
    assert.strictEqual(overtimeShift.regularWages, 800);
    assert.strictEqual(overtimeShift.overtimeRate, 100);
    assert.strictEqual(overtimeShift.overtimeWages, 200);
    assert.strictEqual(overtimeShift.totalPayable, 1000);

    // Scenario 3: Higher shift rate ₹1,200 (Overtime Rate = 1200 / 8 = ₹150/hr)
    // 11 hours worked (8h regular + 3h OT @ ₹150/hr) -> 1200 + 450 = ₹1,650
    const higherRateShift = calculateWagesFromShiftRate(11, 1200, true);
    assert.strictEqual(higherRateShift.regularHours, 8);
    assert.strictEqual(higherRateShift.overtimeHours, 3);
    assert.strictEqual(higherRateShift.regularWages, 1200);
    assert.strictEqual(higherRateShift.overtimeRate, 150);
    assert.strictEqual(higherRateShift.overtimeWages, 450);
    assert.strictEqual(higherRateShift.totalPayable, 1650);
  });
  it('correctly calculates shift duration for standard daytime shift', () => {
    // 09:00 to 17:00 with 30 min break -> 8h gross - 0.5h = 7.5 hours
    const duration = calculateDurationHours('09:00', '17:00', 30);
    assert.strictEqual(duration, 7.5);
  });

  it('correctly calculates shifts crossing midnight', () => {
    // 22:00 to 06:00 next day with 30m break -> 8h gross - 0.5h = 7.5 hours
    const duration = calculateDurationHours('22:00', '06:00', 30);
    assert.strictEqual(duration, 7.5);

    // 20:00 to 06:00 (10h gross, 0m break) -> 10 hours
    const nightShift = calculateDurationHours('20:00', '06:00', 0);
    assert.strictEqual(nightShift, 10);
  });

  it('calculates regular wages and approved overtime according to Section 8 spec', () => {
    // Spec Example:
    // Standard shift: 8 hours
    // Actual worked: 10 hours
    // Hourly wage: ₹100
    // Multiplier: 1.5x
    // Expected: Regular = 8 * 100 = 800, Overtime = 2 * (100 * 1.5 = 150) = 300, Total = 1100
    const resultApproved = calculateWages(10, 8, 100, 1.5, true);
    assert.strictEqual(resultApproved.regularHours, 8);
    assert.strictEqual(resultApproved.overtimeHours, 2);
    assert.strictEqual(resultApproved.regularWages, 800);
    assert.strictEqual(resultApproved.overtimeRate, 150);
    assert.strictEqual(resultApproved.overtimeWages, 300);
    assert.strictEqual(resultApproved.totalPayable, 1100);

    // If overtime is NOT approved yet, overtime wage must be 0!
    const resultUnapproved = calculateWages(10, 8, 100, 1.5, false);
    assert.strictEqual(resultUnapproved.regularHours, 8);
    assert.strictEqual(resultUnapproved.overtimeHours, 2);
    assert.strictEqual(resultUnapproved.overtimeWages, 0);
    assert.strictEqual(resultUnapproved.totalPayable, 800);
  });

  it('detects shift overlap on the same date', () => {
    const shiftA = { date: '2026-11-11', startTime: '09:00', endTime: '17:00' };
    const shiftB = { date: '2026-11-11', startTime: '14:00', endTime: '22:00' };
    const shiftC = { date: '2026-11-11', startTime: '17:00', endTime: '23:00' }; // Non-overlapping adjacent
    const shiftD = { date: '2026-11-12', startTime: '09:00', endTime: '17:00' }; // Different date

    assert.strictEqual(checkShiftOverlap(shiftA, shiftB), true, 'Shift A and B overlap');
    assert.strictEqual(checkShiftOverlap(shiftA, shiftC), false, 'Shift A and C do not overlap');
    assert.strictEqual(checkShiftOverlap(shiftA, shiftD), false, 'Different dates do not overlap');
  });

  it('masks sensitive bank account and UPI info safely', () => {
    assert.strictEqual(maskAccountNumber('50100458921142'), '•••• •••• 1142');
    assert.strictEqual(maskAccountNumber('1234'), '1234');
    assert.strictEqual(maskUpiId('rajesh.kumar@okhdfcbank'), 'raj***@okhdfcbank');
  });

  it('generates standard NPCI UPI Intent URI', () => {
    const uri = generateUpiIntentUri({
      payeeAddress: 'rajesh.kumar@okhdfcbank',
      payeeName: 'Rajesh Kumar',
      amount: 10560,
      transactionNote: 'WorkPay Salary',
      transactionRef: 'WP-PAY-001',
    });

    assert.ok(uri.startsWith('upi://pay?'));
    assert.ok(uri.includes('pa=rajesh.kumar%40okhdfcbank') || uri.includes('pa=rajesh.kumar@okhdfcbank'));
    assert.ok(uri.includes('am=10560.00'));
    assert.ok(uri.includes('cu=INR'));
  });

  it('formats hours correctly into readable strings', () => {
    assert.strictEqual(formatHours(8), '8h 00m');
    assert.strictEqual(formatHours(10.5), '10h 30m');
    assert.strictEqual(formatHours(2.25), '2h 15m');
    assert.strictEqual(formatHours(0), '0h 00m');
  });
});
