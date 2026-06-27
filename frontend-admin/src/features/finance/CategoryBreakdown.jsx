import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const CategoryBreakdown = ({ transactions }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('INCOME'); // INCOME or EXPENSE

  // Calculate stats dynamically
  const incomeTx = transactions.filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER');
  const expenseTx = transactions.filter(t => t.type === 'EXPENSE' && t.category !== 'TRANSFER');

  const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

  const categoryStats = {};
  const currentList = activeTab === 'INCOME' ? incomeTx : expenseTx;
  const currentTotal = activeTab === 'INCOME' ? totalIncome : totalExpense;

  currentList.forEach(tx => {
    categoryStats[tx.category] = (categoryStats[tx.category] || 0) + tx.amount;
  });

  return (
    <div className="glass-card p-6 rounded-2xl h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4 text-xs font-semibold">
      
      {/* Header and Tab Selector */}
      <div className="flex flex-col gap-3">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">
          Kategoriyalar Tahlili (Category Analysis)
        </h4>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-full border border-slate-200/50 dark:border-white/5 text-[9px] font-bold">
          <button
            onClick={() => setActiveTab('INCOME')}
            className={`flex-1 py-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 ${
              activeTab === 'INCOME' 
                ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-600" /> Kirim
          </button>
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex-1 py-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 ${
              activeTab === 'EXPENSE' 
                ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="w-3 h-3 text-rose-600" /> Chiqim
          </button>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4 pt-2">
        {Object.keys(categoryStats).length === 0 ? (
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium py-6 text-center">
            Ushbu turdagi tranzaksiyalar mavjud emas
          </p>
        ) : (
          Object.keys(categoryStats).map(cat => {
            const amount = categoryStats[cat];
            const percentage = currentTotal > 0 ? (amount / currentTotal) * 100 : 0;
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-gray-400 uppercase text-[9px] tracking-wide font-bold">{cat}</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{formatCurrency(amount, i18n.language)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${activeTab === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[9px] text-right text-slate-400 dark:text-gray-500 font-bold">{percentage.toFixed(1)}%</p>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default CategoryBreakdown;
