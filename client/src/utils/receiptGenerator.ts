import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PaymentTransaction, PayrollRecord, Employee } from '../types';
import { formatINR, maskAccountNumber } from './utils';

export function generatePaymentReceiptPDF(
  transaction: PaymentTransaction,
  payroll?: PayrollRecord,
  employee?: Employee
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primaryColor = [79, 70, 229]; // Indigo #4f46e5
  const slateColor = [51, 65, 85];

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 36, 'F');

  // Title & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('WorkPay', 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Manage Shifts. Track Overtime. Pay Smarter.', 15, 25);
  doc.text('OFFICIAL PAYMENT RECEIPT & SALARY VOUCHER', 15, 30);

  // Status Badge on top right
  const isSuccess = transaction.status === 'Successful';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (isSuccess) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
  }
  doc.roundedRect(145, 12, 50, 12, 2, 2, 'F');
  doc.text(transaction.status.toUpperCase(), 170, 20, { align: 'center' });

  // Receipt Meta Grid
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', 15, 48);
  doc.text('Date & Time:', 15, 54);
  doc.text('Payment Mode:', 15, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(transaction.id, 45, 48);
  doc.text(new Date(transaction.initiatedAt).toLocaleString('en-IN'), 45, 54);
  doc.text(
    transaction.paymentMethod === 'razorpayx_upi'
      ? 'RazorpayX UPI Payout'
      : transaction.paymentMethod === 'razorpayx_bank_transfer'
      ? 'RazorpayX Direct Bank IMPS/NEFT'
      : 'UPI Intent Manual Verification',
    45,
    60
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Provider Ref / UTR:', 115, 48);
  doc.text('Payroll Cycle:', 115, 54);
  doc.text('Payment Status:', 115, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(transaction.providerReferenceId || 'WP-UTR-' + transaction.id.slice(-6), 155, 48);
  doc.text(payroll ? `${payroll.periodStartDate} to ${payroll.periodEndDate}` : 'N/A', 155, 54);
  doc.text(transaction.status, 155, 60);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 66, 195, 66);

  // Beneficiary & Employer Box
  autoTable(doc, {
    startY: 72,
    head: [['EMPLOYER DETAILS', 'EMPLOYEE / BENEFICIARY DETAILS']],
    body: [
      [
        'WorkPay Technologies Pvt Ltd\nOperations & Logistics Division\nTax ID: GSTIN27AABCT3421K1ZM\nSupport: accounts@workpay.io',
        `Name: ${transaction.employeeName}\nEmployee Code: ${transaction.employeeCode}\nDepartment: ${payroll?.department || employee?.department || 'Operations'}\nBeneficiary Account: ${
          transaction.destination.type === 'vpa'
            ? `UPI ID: ${transaction.destination.upiId}`
            : `A/C: ${maskAccountNumber(transaction.destination.accountNumber || transaction.destination.maskedAccount)} (${transaction.destination.ifsc || 'HDFC'})`
        }`,
      ],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  // Earnings Breakdown Table
  const lastTableY = (doc as any).lastAutoTable.finalY + 6;

  const isQuickPay = !!transaction.shiftsCount || !payroll;
  const shiftRate = transaction.shiftRate || (employee?.shiftRate) || 800;
  const otRate = transaction.overtimeRate || Math.round((shiftRate / 8) * 100) / 100;
  const shiftsCount = transaction.shiftsCount ?? 1;
  const otHours = transaction.overtimeHours ?? 0;
  const regularWages = transaction.shiftPay ?? Math.round(shiftsCount * shiftRate * 100) / 100;
  const otWages = transaction.overtimePay ?? Math.round(otHours * otRate * 100) / 100;

  const tableBody = isQuickPay
    ? [
        [
          'Standard 8-Hour Shift Wages',
          `${shiftsCount} shift${shiftsCount > 1 ? 's' : ''} (8 hrs each)`,
          `${formatINR(shiftRate)} / 8h shift`,
          formatINR(regularWages),
        ],
        [
          'Overtime Wages (Shift Rate ÷ 8)',
          `${otHours} hrs`,
          `${formatINR(otRate)} / hr`,
          formatINR(otWages),
        ],
        ...(transaction.advanceDeducted && transaction.advanceDeducted > 0
          ? [
              [
                'Less: Loan / Advance Deduction',
                `Remaining Loan: ${formatINR(transaction.remainingAdvanceBalance || 0)}`,
                'Deducted from Salary',
                '- ' + formatINR(transaction.advanceDeducted),
              ],
            ]
          : []),
      ]
    : [
        [
          'Regular Shift Wages',
          `${payroll?.regularHours || 0} hrs`,
          formatINR(employee?.hourlyWage || 100) + ' / hr',
          formatINR(payroll?.regularWages || 0),
        ],
        [
          'Approved Overtime Wages',
          `${payroll?.overtimeHours || 0} hrs`,
          `${(employee?.overtimeMultiplier || 1.5)}x (${formatINR((employee?.hourlyWage || 100) * (employee?.overtimeMultiplier || 1.5))}/hr)`,
          formatINR(payroll?.overtimeWages || 0),
        ],
        [
          'Performance Bonus / Allowances',
          payroll?.bonusDescription || 'Regular attendance incentive',
          '-',
          formatINR(payroll?.bonuses || 0),
        ],
        [
          'Statutory Deductions / Advances',
          payroll?.deductionDescription || 'TDS / Security deposit',
          '-',
          '- ' + formatINR(payroll?.deductions || 0),
        ],
      ];

  autoTable(doc, {
    startY: lastTableY,
    head: [['Item Description', 'Hours / Units', 'Rate / Formula', 'Amount (INR)']],
    body: tableBody,
    foot: [
      ['', '', 'TOTAL NET DISBURSED', formatINR(transaction.amount)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor as any,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
    },
  });

  // Signatures & Legal Disclaimer
  const signY = (doc as any).lastAutoTable.finalY + 16;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This is a system-generated electronic payment receipt powered by RazorpayX Automated Payouts.',
    15,
    signY
  );
  doc.text(
    'Funds are settled directly to the beneficiary\'s verified bank or UPI VPA under RBI guidelines.',
    15,
    signY + 4
  );

  doc.setDrawColor(203, 213, 225);
  doc.line(140, signY + 16, 195, signY + 16);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Finance Signatory', 140, signY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text('WorkPay Payroll Disbursements', 140, signY + 25);

  // Save PDF
  doc.save(`WorkPay_Receipt_${transaction.id}.pdf`);
}

