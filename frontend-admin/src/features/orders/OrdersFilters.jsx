import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrdersFilters = ({ search, setSearch, selectedStatusId, setSelectedStatusId, statuses, orders }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="glass-card px-4 py-3 rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
        <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mijoz ismi, xodim nomi yoki xizmat turi bo'yicha qidirish..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>

      {/* Dynamic Status Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 w-fit">
        <button
          onClick={() => setSelectedStatusId('all')}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            selectedStatusId === 'all'
              ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
          }`}
        >
          {t('orders_page.all_orders')} ({orders.length})
        </button>
        {statuses.map(st => {
          const count = orders.filter(o => o.status_id === st.id).length;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStatusId(st.id)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusId === st.id
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm border-l-2'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
              }`}
              style={selectedStatusId === st.id ? { borderLeftColor: st.color_code } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color_code }}></span>
              {st.name_uz} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersFilters;
