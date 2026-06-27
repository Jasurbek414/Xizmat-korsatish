import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck, Check, Edit2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const BudgetManager = ({ budgets, transactions, onUpdateBudget }) => {
  const { t, i18n } = useTranslation();
  const [editingCategory, setEditingCategory] = useState(null);
  const [editLimit, setEditLimit] = useState('');

  // Calculate current expenses per category
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
  
  const getSpentAmount = (category) => {
    return expenseTransactions
      .filter(tx => tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const handleEdit = (category, currentLimit) => {
    setEditingCategory(category);
    setEditLimit(currentLimit.toString());
  };

  const handleSave = (category) => {
    const val = parseFloat(editLimit);
    if (!isNaN(val) && val >= 0) {
      onUpdateBudget(category, val);
    }
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Overview Block */}
      <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">
            Budjetlarni Rejalashtirish (Monthly Expense Budgets)
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
            Xarajatlar kategoriyalari uchun oylik limitlar belgilang va ortiqcha xarajatlarning oldini oling.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/10">
          <ShieldCheck className="w-4 h-4" />
          <span>Faol byudjet nazorati yoqilgan</span>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {budgets.map((b) => {
          const spent = getSpentAmount(b.category);
          const limit = b.limit || 1;
          const percentage = Math.min((spent / limit) * 100, 100);
          const isExceeded = spent > limit;
          const isWarning = spent > 0.8 * limit && spent <= limit;

          // Determine visual colors
          let progressColor = 'bg-indigo-500';
          let textColor = 'text-indigo-600 dark:text-indigo-400';
          let badgeBg = 'bg-indigo-500/10 text-indigo-600';
          
          if (isExceeded) {
            progressColor = 'bg-rose-500';
            textColor = 'text-rose-600 dark:text-rose-400';
            badgeBg = 'bg-rose-500/10 text-rose-600';
          } else if (isWarning) {
            progressColor = 'bg-amber-500';
            textColor = 'text-amber-600 dark:text-amber-400';
            badgeBg = 'bg-amber-500/10 text-amber-600';
          } else {
            progressColor = 'bg-emerald-500';
            textColor = 'text-emerald-600 dark:text-emerald-400';
            badgeBg = 'bg-emerald-500/10 text-emerald-600';
          }

          return (
            <div key={b.category} className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm space-y-4 border border-slate-200 dark:border-white/5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    {b.category}
                  </span>
                  <h5 className="font-extrabold text-slate-800 dark:text-white mt-2 font-['Outfit']">
                    {formatCurrency(spent, i18n.language)}
                  </h5>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">Joriy oyda sarflangan mablag'</p>
                </div>
                
                {/* Exceeded/Warning Alert Badges */}
                <div className="flex flex-col items-end gap-1.5">
                  {isExceeded ? (
                    <span className="flex items-center gap-1 text-[8px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-md uppercase animate-pulse border border-rose-500/10">
                      <AlertTriangle className="w-3 h-3" /> {t('finance_page.exceeded')}
                    </span>
                  ) : isWarning ? (
                    <span className="flex items-center gap-1 text-[8px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md uppercase border border-amber-500/10">
                      <AlertTriangle className="w-3 h-3" /> Limitga yaqin
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md uppercase border border-emerald-500/10">
                      {t('finance_page.within_limit')}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div 
                    className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 dark:text-gray-500">
                  <span>{percentage.toFixed(1)}%</span>
                  <span>Limit: {formatCurrency(b.limit, i18n.language)}</span>
                </div>
              </div>

              {/* Budget Limit Setter */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                {editingCategory === b.category ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input 
                      type="number"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      placeholder="Limit"
                      className="w-full glass-input rounded-lg px-2 py-1 focus:outline-none"
                    />
                    <button 
                      onClick={() => handleSave(b.category)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">Limitni tahrirlash:</span>
                    <button 
                      onClick={() => handleEdit(b.category, b.limit)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Tahrirlash
                    </button>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default BudgetManager;
