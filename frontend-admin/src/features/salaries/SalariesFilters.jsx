import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalariesFilters = ({ search, setSearch, period, setPeriod, periods }) => {
  const { t } = useTranslation();

  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
      
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5 sm:col-span-2">
        <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Xodim ismi bo'yicha qidirish..."
          className="w-full bg-transparent text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>

      {/* Period Dropdown */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
        <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full bg-transparent text-slate-800 dark:text-gray-100 focus:outline-none cursor-pointer"
        >
          <option value="ALL">Barcha davrlar</option>
          {periods.map(p => (
            <option key={p} value={p} className="bg-white dark:bg-[#111827]">
              {p}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
};

export default SalariesFilters;
