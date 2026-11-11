import React, { useState } from 'react';
import { X, Users, Pencil, Trash2, UserPlus, Search, Download, Upload, Database, HandCoins, Sparkles } from 'lucide-react';
import { Employee } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { formatINR } from '../../utils/utils';
import { LendMoneyModal } from './LendMoneyModal';
import { storageService } from '../../services/storageService';

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
  const { employees, deleteEmployee, refreshAll, cleanDuplicateData } = useAppData();
  const [search, setSearch] = useState('');
  const [lendEmpId, setLendEmpId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  if (!isOpen) return null;

  const handleCleanDuplicates = async () => {
    setCleaning(true);
    try {
      const stats = await cleanDuplicateData();
      alert(`Cleaned duplicate and sample data successfully! (Cleaned ${stats.cleanedEmployees} workers, ${stats.cleanedAttendance} attendance records).`);
    } catch (e: any) {
      alert('Error cleaning duplicate data: ' + e.message);
    } finally {
      setCleaning(false);
    }
  };

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

  const handleExportBackup = async () => {
    try {
      await storageService.downloadDeviceBackup();
    } catch (err: any) {
      alert('Error exporting database backup: ' + err.message);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const res = await storageService.restoreBackupToCloud(parsed);
        await refreshAll();
        alert(`Database restored successfully (${res.restoredCount} records synced)!`);
      } catch (err: any) {
        alert('Failed to restore backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Dedicated Prominent Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors z-20 shadow-xs"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header */}
        <div className="pb-3 border-b border-slate-100 pr-10 sm:pr-12">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-tight">Manage Employees</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Edit employee details, rates, or remove workers
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              type="button"
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
              type="button"
              onClick={handleCleanDuplicates}
              disabled={cleaning}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Clean duplicate and sample data"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{cleaning ? 'Cleaning...' : 'Clean Duplicates'}</span>
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
                        <span className="text-slate-400">•</span>
                        <span className={`font-semibold ${emp.advanceBalance && emp.advanceBalance > 0 ? 'text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'text-slate-400'}`}>
                          Loan: {formatINR(emp.advanceBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    <button
                      onClick={() => setLendEmpId(emp.id)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-amber-200/80"
                      title="Lend money or view advance ledger"
                    >
                      <HandCoins className="w-3 h-3 text-amber-600" />
                      <span>Lend / Khata</span>
                    </button>

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

        {/* Database Backup & Restore Bar */}
        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Download database backup JSON"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Backup</span>
            </button>

            <label className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
              <Upload className="w-3 h-3 text-slate-500" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors ml-auto shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lend Money / Khata Ledger Modal */}
      {lendEmpId && (
        <LendMoneyModal
          isOpen={!!lendEmpId}
          onClose={() => setLendEmpId(null)}
          defaultEmployeeId={lendEmpId}
        />
      )}
    </div>
  );
};

