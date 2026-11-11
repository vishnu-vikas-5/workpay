import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Smartphone,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { EmployeeModal } from '../components/modals/EmployeeModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { formatINR, maskAccountNumber, maskUpiId } from '../utils/utils';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

export const Employees: React.FC = () => {
  const { role } = useAuth();
  const { employees, departments, deactivateEmployee } = useAppData();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);

  const isAdmin = role === 'admin';

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.phone.includes(search);

      const matchDept = selectedDept === 'all' || emp.department === selectedDept;
      const matchStatus = selectedStatus === 'all' || emp.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, selectedDept, selectedStatus]);

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredEmployees.map((e) => ({
      'Employee Code': e.employeeCode,
      'Full Name': e.fullName,
      'Department': e.department,
      'Designation': e.designation,
      'Email': e.email,
      'Phone': e.phone,
      'Date of Joining': e.dateOfJoining,
      'Hourly Wage (INR)': e.hourlyWage,
      'Standard Daily Hours': e.standardWorkingHours,
      'Overtime Multiplier': e.overtimeMultiplier,
      'UPI ID': e.upiId || 'N/A',
      'Bank Account (Masked)': maskAccountNumber(e.bankAccount?.accountNumber),
      'IFSC': e.bankAccount?.ifsc || 'N/A',
      'Status': e.status,
    }));

    if (type === 'xlsx') {
      exportToExcel(data, `WorkPay_Employees_${new Date().toISOString().split('T')[0]}`);
    } else {
      exportToCSV(data, `WorkPay_Employees_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Workforce Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage worker profiles, hourly pay rates, overtime rules, and RazorpayX payment details
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <span className="text-slate-200">|</span>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              CSV
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Shift & OT Rate</th>
                <th className="py-3 px-4">UPI / Payout Info</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No employees matching the criteria found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {emp.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{emp.fullName}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono text-brand-600 font-medium">
                              {emp.employeeCode}
                            </span>
                            <span>•</span>
                            <span>{emp.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{emp.designation}</p>
                      <p className="text-[11px] text-slate-400">{emp.department}</p>
                    </td>

                    {/* Shift Rate & OT Rate */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">
                        {formatINR(emp.shiftRate || emp.hourlyWage * 8)}
                        <span className="text-[11px] font-normal text-slate-500"> / 8hr shift</span>
                      </p>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                        OT: {formatINR((emp.shiftRate || emp.hourlyWage * 8) / 8)}/hr (Rate ÷ 8)
                      </span>
                    </td>

                    {/* Payment Beneficiary */}
                    <td className="py-3 px-4">
                      {emp.upiId ? (
                        <div className="flex items-center gap-1.5 text-xs text-brand-700 font-mono">
                          <Smartphone className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <span>{maskUpiId(emp.upiId)}</span>
                        </div>
                      ) : emp.bankAccount?.accountNumber ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{maskAccountNumber(emp.bankAccount.accountNumber)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-rose-500 font-medium">
                          No payout info set
                        </span>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {emp.bankAccount?.ifsc || 'UPI Direct Route'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedProfile(emp)}
                          title="View Full Profile"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsModalOpen(true);
                              }}
                              title="Edit Worker"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {emp.status === 'active' && (
                              <button
                                onClick={() => setDeactivatingEmployee(emp)}
                                title="Deactivate Worker"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Details Profile Drawer */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Worker Profile</h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
                {selectedProfile.fullName.slice(0, 2).toUpperCase()}
              </div>
              <h4 className="text-lg font-bold text-slate-900 mt-3">
                {selectedProfile.fullName}
              </h4>
              <p className="text-xs font-mono text-brand-600 font-semibold">
                {selectedProfile.employeeCode}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedProfile.designation} • {selectedProfile.department}
              </p>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Contact & Employment
                </p>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{selectedProfile.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-800">{selectedProfile.phone}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Joined:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedProfile.dateOfJoining).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Shift Rate & Overtime Formula
                </p>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">8-Hour Shift Rate:</span>
                  <span className="font-bold text-slate-900">
                    {formatINR(selectedProfile.shiftRate || selectedProfile.hourlyWage * 8)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Standard Shift:</span>
                  <span className="font-medium text-slate-800">
                    8 Hours per shift
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Overtime Formula:</span>
                  <span className="font-mono text-indigo-700 font-semibold">
                    Shift Rate ÷ 8
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Hourly Overtime Rate:</span>
                  <span className="font-bold text-emerald-600">
                    {formatINR((selectedProfile.shiftRate || selectedProfile.hourlyWage * 8) / 8)} / hr
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Disbursement Account Details
                </p>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">UPI VPA:</span>
                  <span className="font-mono text-brand-700 font-semibold">
                    {selectedProfile.upiId || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Bank Account:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {maskAccountNumber(selectedProfile.bankAccount?.accountNumber)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Bank & IFSC:</span>
                  <span className="font-medium text-slate-800">
                    {selectedProfile.bankAccount?.bankName} ({selectedProfile.bankAccount?.ifsc || 'N/A'})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedProfile(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-xs hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        employeeToEdit={editingEmployee}
      />

      {/* Deactivation Confirmation */}
      <ConfirmationModal
        isOpen={!!deactivatingEmployee}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={async () => {
          if (deactivatingEmployee) {
            await deactivateEmployee(deactivatingEmployee.id);
            setDeactivatingEmployee(null);
          }
        }}
        title="Deactivate Worker Account"
        description={`Are you sure you want to deactivate ${deactivatingEmployee?.fullName}? They will not be scheduled for future shifts.`}
        confirmLabel="Deactivate Worker"
        variant="danger"
      />
    </div>
  );
};

