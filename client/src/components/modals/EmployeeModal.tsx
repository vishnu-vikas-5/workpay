import React, { useState, useEffect } from 'react';
import { X, UserPlus, Smartphone, Banknote, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { Employee } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { formatINR } from '../../utils/utils';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
  onSuccess?: (employee: Employee) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employeeToEdit,
  onSuccess,
}) => {
  const { addEmployee, updateEmployee, departments } = useAppData();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [shiftRate, setShiftRate] = useState<string | number>(800);
  const [department, setDepartment] = useState('Warehouse & Logistics');
  const [designation, setDesignation] = useState('Shift Worker');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Computed overtime rate: shift rate divided by 8 (with 2 decimal precision)
  const numericShiftRate = typeof shiftRate === 'string' ? parseFloat(shiftRate) || 0 : shiftRate;
  const overtimeHourlyRate = Math.round((numericShiftRate / 8) * 100) / 100;

  useEffect(() => {
    if (employeeToEdit) {
      setFullName(employeeToEdit.fullName);
      setPhone(employeeToEdit.phone);
      setUpiId(employeeToEdit.upiId || '');
      setShiftRate(employeeToEdit.shiftRate || employeeToEdit.hourlyWage * 8 || 800);
      setDepartment(employeeToEdit.department || 'Warehouse & Logistics');
      setDesignation(employeeToEdit.designation || 'Shift Worker');
      setEmail(employeeToEdit.email || '');
      setStatus(employeeToEdit.status);
    } else {
      setFullName('');
      setPhone('');
      setUpiId('');
      setShiftRate(800);
      setDepartment(departments[0]?.name || 'Warehouse & Logistics');
      setDesignation('Shift Worker');
      setEmail('');
      setStatus('active');
    }
  }, [employeeToEdit, departments, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (!fullName.trim()) throw new Error('Please enter the employee full name.');
      if (!phone.trim()) throw new Error('Please enter the employee phone number.');
      const numericRate = typeof shiftRate === 'string' ? parseFloat(shiftRate) : shiftRate;
      if (isNaN(numericRate) || numericRate <= 0) throw new Error('Shift rate must be greater than zero.');

      // Auto-generate clean valid email conforming to firestore.rules regex
      const safePrefix = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || `worker${Date.now().toString().slice(-4)}`;
      const cleanEmail =
        email.trim() && email.includes('@')
          ? email.trim()
          : `${safePrefix.length >= 2 ? safePrefix : 'worker'}@workpay.io`;

      const hourlyWage = Math.round((numericRate / 8) * 100) / 100;
      const cleanUpi = upiId.trim().length >= 3 ? upiId.trim() : undefined;

      if (employeeToEdit) {
        const updated: Employee = {
          ...employeeToEdit,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          upiId: cleanUpi,
          shiftRate: numericRate,
          hourlyWage,
          standardWorkingHours: 8,
          overtimeMultiplier: 1.0,
          department,
          designation,
          dateOfJoining: employeeToEdit.dateOfJoining || new Date().toISOString().split('T')[0],
          status,
        };
        await updateEmployee(updated);
        onSuccess?.(updated);
      } else {
        const created = await addEmployee({
          employeeCode: '', // auto-generated
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          upiId: cleanUpi,
          shiftRate: numericRate,
          hourlyWage,
          standardWorkingHours: 8,
          overtimeMultiplier: 1.0,
          department,
          designation,
          dateOfJoining: new Date().toISOString().split('T')[0],
          status,
        });
        onSuccess?.(created);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sand-950/40 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#FAF6EE] rounded-3xl shadow-2xl border border-sand-300 p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-sand-200 hover:bg-sand-300 text-sand-800 border border-sand-300 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sand-200 text-sand-900 border border-sand-300 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-sand-800" />
          </div>
          <div>
            <h3 className="text-base font-black text-sand-950">
              {employeeToEdit ? 'Edit Employee Details' : 'Add Employee & Shift Rate'}
            </h3>
            <p className="text-xs text-sand-600">
              Set name, phone, UPI ID, and 8-hour shift rate with automatic hourly overtime
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Employee Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-semibold text-sand-950 focus:ring-2 focus:ring-sand-400 focus:border-sand-500"
              required
            />
          </div>

          {/* Phone Number & UPI ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-900 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-semibold text-sand-950 focus:ring-2 focus:ring-sand-400 focus:border-sand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sand-900 mb-1">
                UPI ID (Optional, for instant UPI payments)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-sand-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-mono font-semibold text-sand-950 focus:ring-2 focus:ring-sand-400 focus:border-sand-500"
                />
              </div>
            </div>
          </div>

          {/* Shift Rate (8 Hours) and Overtime Calculation Banner */}
          <div className="bg-[#F5EFE3] p-4 rounded-2xl border border-sand-300 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-sand-950 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-sand-800" />
                <span>8-Hour Shift Rate (₹ INR)</span>
              </label>
              <span className="text-[11px] font-bold text-sand-900 bg-sand-200 px-2 py-0.5 rounded-md border border-sand-300">
                Standard Shift: 8 hrs
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sand-600 text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={shiftRate}
                placeholder="e.g. 800 or 815.50"
                onChange={(e) => setShiftRate(e.target.value)}
                onBlur={() => {
                  const num = parseFloat(String(shiftRate));
                  if (!isNaN(num) && num >= 0) {
                    setShiftRate(Math.round(num * 100) / 100);
                  }
                }}
                className="w-full pl-8 pr-4 py-2.5 bg-[#FAF6EE] border border-sand-300 rounded-xl text-sm font-black text-sand-950 focus:ring-2 focus:ring-sand-400 focus:border-sand-500 shadow-2xs"
                required
              />
            </div>

            {/* Live Calculation Display */}
            <div className="bg-[#FAF6EE] p-3 rounded-xl border border-sand-300 flex items-center justify-between text-xs">
              <span className="text-sand-700">
                Overtime Rate <span className="text-sand-500">(Shift Rate ÷ 8):</span>
              </span>
              <span className="font-black text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-300">
                {formatINR(overtimeHourlyRate)} / hour
              </span>
            </div>
          </div>

          {/* Optional Role & Department */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-sand-700 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-semibold text-sand-950"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-sand-700 mb-1">
                Designation / Note
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5EFE3] border border-sand-300 rounded-xl text-xs font-semibold text-sand-950"
                placeholder="e.g. Worker"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand-300/70">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-sand-700 hover:bg-sand-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sand-900 hover:bg-sand-800 text-[#FAF6EE] border border-sand-950 shadow-md shadow-sand-900/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EBE2CC]" />
              <span>{submitting ? 'Saving...' : employeeToEdit ? 'Update Employee' : 'Add Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
