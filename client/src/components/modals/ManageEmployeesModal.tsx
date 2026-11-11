import React, { useState } from 'react';
import { X, Users, Pencil, Trash2, UserPlus, Search, Smartphone, Banknote } from 'lucide-react';
import { Employee } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { formatINR } from '../../utils/utils';

interface ManageEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (emp: Employee) => void;
  onAddNew: () => void;
}

export const ManageEmployeesModal: React.FC<ManageEmployeesModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  onAddNew,
}) => {
  const { employees, deleteEmployee } = useAppData();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      (e.upiId && e.upiId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (emp: Employee) => {
    if (window.confirm(`Are you sure you want to remove "${emp.fullName}" from the employee roster?`)) {
      await deleteEmployee(emp.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Employees</h3>
              <p className="text-xs text-slate-500">Edit employee details, rates, or remove workers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onAddNew();
              }}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Worker</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search workers by name, phone, or UPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {/* Worker List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No employees found matching &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((emp) => {
              const shiftRate = emp.shiftRate || emp.hourlyWage * 8;
              const otRate = Math.round((shiftRate / 8) * 100) / 100;

              return (
                <div
                  key={emp.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span>{emp.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">{emp.phone}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-mono text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded font-semibold border border-brand-100">
                          {emp.upiId}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-700 font-semibold">
                          {formatINR(shiftRate)}/shift
                        </span>
                        <span className="text-slate-400">
                          (OT: <span className="text-emerald-700 font-semibold">{formatINR(otRate)}/hr</span>)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        onClose();
                        onEdit(emp);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-slate-600" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(emp)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

