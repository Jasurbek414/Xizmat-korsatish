import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EmployeesFilters = ({ 
  search, 
  setSearch, 
  filterRole, 
  setFilterRole, 
  filterStatus, 
  setFilterStatus 
}) => {
  const { t } = useTranslation();

  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3 bg-white dark:bg-transparent shadow-sm text-xs font-semibold">
      
      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
        <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Xodim ismi yoki telefoni bo'yicha qidirish..."
          className="w-full bg-transparent text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-4 items-center">
        
        {/* Role Filter */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Lavozimi (Role)</span>
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            {[
              { id: 'ALL', label: 'Barchasi' },
              { id: 'WORKER_DRIVER', label: t('employees_page.worker_driver') },
              { id: 'OFFICE_STAFF', label: t('employees_page.office_staff') }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFilterRole(r.id)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${
                  filterRole === r.id 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Holati (Status)</span>
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            {[
              { id: 'ALL', label: 'Barchasi' },
              { id: 'ACTIVE', label: t('employees_page.active_status') },
              { id: 'BLOCKED', label: t('employees_page.blocked_status') }
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilterStatus(s.id)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${
                  filterStatus === s.id 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
                }`}
              >
                {r => r.label}
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default EmployeesFilters;
