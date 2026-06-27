import React from 'react';
import { Search, Calendar, Filter } from 'lucide-react';

const FinanceFilters = ({ 
  search, 
  setSearch, 
  filterType, 
  setFilterType, 
  filterCategory, 
  setFilterCategory, 
  filterWallet, 
  setFilterWallet,
  dateRange,
  setDateRange,
  customDates,
  setCustomDates,
  categories, 
  wallets 
}) => {
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 bg-white dark:bg-transparent shadow-sm text-xs font-semibold">
      
      {/* Top Filter Group: Search and Date Range Select */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5 md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tranzaksiya tavsifi bo'yicha qidirish..."
            className="w-full bg-transparent text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
          />
        </div>

        {/* Date Presets Dropdown */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-transparent text-slate-800 dark:text-gray-100 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-[#111827]">Barcha davr</option>
            <option value="TODAY" className="bg-white dark:bg-[#111827]">Bugun</option>
            <option value="YESTERDAY" className="bg-white dark:bg-[#111827]">Kecha</option>
            <option value="WEEK" className="bg-white dark:bg-[#111827]">Oxirgi 7 kun</option>
            <option value="MONTH" className="bg-white dark:bg-[#111827]">Joriy oy</option>
            <option value="CUSTOM" className="bg-white dark:bg-[#111827]">Maxsus oraliq</option>
          </select>
        </div>
      </div>

      {/* Custom Date Picker Inputs */}
      {dateRange === 'CUSTOM' && (
        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/2 p-3 rounded-xl border border-slate-100 dark:border-white/5 animate-scale-in">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Boshlanish sanasi</label>
            <input 
              type="date"
              value={customDates.start}
              onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Tugash sanasi</label>
            <input 
              type="date"
              value={customDates.end}
              onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      )}
      
      {/* Bottom Filter Group: Type, Category, Wallet pills */}
      <div className="flex flex-wrap gap-4 items-center">
        
        {/* Type Filter */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Tur</span>
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            {['ALL', 'INCOME', 'EXPENSE'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                  filterType === type 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
                }`}
              >
                {type === 'ALL' ? 'Barchasi' : type === 'INCOME' ? 'Kirim' : 'Chiqim'}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Filter */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Hisob</span>
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            <button
              onClick={() => setFilterWallet('ALL')}
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                filterWallet === 'ALL' 
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
              }`}
            >
              Barcha hisoblar
            </button>
            {wallets.map(w => (
              <button
                key={w.id}
                onClick={() => setFilterWallet(w.id)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                  filterWallet === w.id 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
                }`}
              >
                {w.name_uz.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selector */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Kategoriya</span>
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                  filterCategory === cat 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Barchasi' : cat}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceFilters;
