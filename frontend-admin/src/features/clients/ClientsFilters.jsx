import React from 'react';
import { Search } from 'lucide-react';

const ClientsFilters = ({ search, setSearch, filterActivity, setFilterActivity, filterSpending, setFilterSpending }) => {
  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-3">
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
        <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mijoz ismi, telefoni yoki manzili bo'yicha qidirish..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>
      
      {/* Filters pills */}
      <div className="flex flex-wrap gap-4 text-[10px] font-bold">
        {/* Activity State */}
        <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
          {[
            { id: 'ALL', label: 'Barcha Mijozlar' },
            { id: 'ACTIVE', label: 'Faollar' },
            { id: 'INACTIVE', label: 'Noaktivlar' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterActivity(f.id)}
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                filterActivity === f.id 
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Spending range state */}
        <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
          {[
            { id: 'ALL', label: 'Barcha Tranzaksiya Guruhlari' },
            { id: 'VIP', label: 'VIP (>=200k UZS)' },
            { id: 'REGULAR', label: 'O\'rtacha (<200k UZS)' },
            { id: 'NEW', label: 'Sarfsiz (0 UZS)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterSpending(f.id)}
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                filterSpending === f.id 
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientsFilters;
