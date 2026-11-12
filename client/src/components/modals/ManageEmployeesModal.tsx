import React, { useState } from 'react';
import { X, Users, Pencil, Trash2, UserPlus, Search, Download, Upload, Database, HandCoins, Sparkles, RefreshCw } from 'lucide-react';
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
  const { employees, deleteEmployee, refreshAll, cleanDuplicateData, syncWithCloud, isSyncing } = useAppData();
  const [search, setSearch] = useState('');
  const [lendEmpId, setLendEmpId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  if (!isOpen) return null;

  const handleSyncCloud = async () => {
    try {
      const res = await syncWithCloud();
      alert(`Cloud sync complete! Synced ${res.pulled} incoming and ${res.pushed} outgoing records across phone and laptop.`);
    } catch (e: any) {
      alert('Error syncing with cloud: ' + e.message);
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sand-950/40 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#DED6C1] rounded-3xl shadow-2xl border border-[#CFC6B1] p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col text-[#302C25]"
      >
        {/* Dedicated Prominent Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-[#EBE2CC] hover:bg-[#CFC6B1] text-[#302C25] border border-[#CFC6B1] transition-colors z-20 shadow-xs"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header */}
        <div className="pb-3 border-b border-[#CFC6B1] pr-10 sm:pr-12">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EBE2CC] text-[#302C25] border border-[#CFC6B1] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#302C25]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#302C25] leading-tight">Manage Employees</h3>
              <p className="text-[11px] sm:text-xs text-[#635B4E] truncate">
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
              className="px-3 py-1.5 bg-[#302C25] hover:bg-[#1B1915] text-[#FAF6EE] border border-[#1B1915] rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#EBE2CC]" />
              <span>+ Add Worker</span>
            </button>

            <button
              type="button"
              onClick={handleCleanDuplicates}
              disabled={cleaning}
              className="px-2.5 py-1.5 bg-[#EBE2CC] hover:bg-[#CFC6B1] text-[#302C25] border border-[#CFC6B1] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Clean duplicate and sample data"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#302C25]" />
              <span>{cleaning ? 'Cleaning...' : 'Clean Duplicates'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-[#736B5C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search workers by name, phone, or UPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#EBE2CC] border border-[#CFC6B1] rounded-xl text-xs font-semibold text-[#302C25] placeholder-[#736B5C] focus:ring-2 focus:ring-[#B7B09E] focus:border-[#B7B09E]"
          />
        </div>

        {/* Worker List */}
        <div className="overflow-y-auto flex-1 divide-y divide-[#CFC6B1]/70 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[#736B5C] text-xs">
              No employees found matching &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((emp) => {
              const shiftRate = emp.shiftRate || emp.hourlyWage * 8;
              const otRate = Math.round((shiftRate / 8) * 100) / 100;

              return (
                <div
                  key={emp.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#EBE2CC] p-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#302C25] text-[#FAF6EE] font-bold flex items-center justify-center text-xs shrink-0">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#302C25] text-xs flex items-center gap-2">
                        <span>{emp.fullName}</span>
                        <span className="text-[10px] font-mono text-[#736B5C] font-normal">{emp.phone}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-mono text-[#302C25] bg-[#EBE2CC] px-1.5 py-0.2 rounded font-semibold border border-[#CFC6B1]">
                          {emp.upiId}
                        </span>
                        <span className="text-sand-400">•</span>
                        <span className="text-sand-800 font-semibold">
                          {formatINR(shiftRate)}/shift
                        </span>
                        <span className="text-sand-500">
                          (OT: <span className="text-emerald-800 font-semibold">{formatINR(otRate)}/hr</span>)
                        </span>
                        <span className="text-sand-400">•</span>
                        <span className={`font-semibold ${emp.advanceBalance && emp.advanceBalance > 0 ? 'text-amber-800 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300' : 'text-sand-400'}`}>
                          Loan: {formatINR(emp.advanceBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    <button
                      onClick={() => setLendEmpId(emp.id)}
                      className="px-2.5 py-1.5 bg-amber-100/70 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-amber-300"
                      title="Lend money or view advance ledger"
                    >
                      <HandCoins className="w-3 h-3 text-amber-700" />
                      <span>Lend / Khata</span>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onEdit(emp);
                      }}
                      className="px-2.5 py-1.5 bg-sand-200 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-sand-700" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(emp)}
                      className="px-2.5 py-1.5 bg-rose-100/70 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-rose-300"
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
        <div className="pt-3 mt-2 border-t border-sand-300/70 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="px-2.5 py-1.5 text-sand-900 hover:text-sand-950 bg-sand-200 hover:bg-sand-300 border border-sand-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Download database backup JSON"
            >
              <Download className="w-3 h-3 text-sand-700" />
              <span>Backup</span>
            </button>

            <label className="px-2.5 py-1.5 text-sand-900 hover:text-sand-950 bg-sand-200 hover:bg-sand-300 border border-sand-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
              <Upload className="w-3 h-3 text-sand-700" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={handleSyncCloud}
              disabled={isSyncing}
              className="px-2.5 py-1.5 text-sand-900 hover:text-sand-950 bg-sand-200 hover:bg-sand-300 border border-sand-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Sync phone and laptop with cloud database"
            >
              <RefreshCw className={`w-3 h-3 text-sand-700 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-sand-200 hover:bg-sand-300 text-sand-900 border border-sand-300 rounded-xl text-xs font-bold transition-colors ml-auto shadow-2xs"
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

