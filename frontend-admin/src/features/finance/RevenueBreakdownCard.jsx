import React from 'react';
import { formatCurrency } from '../../utils/format';

// Umumiy "eng yaxshi N ta" ro'yxat kartasi - xizmat turi yoki xodim bo'yicha
// daromad taqsimotini bir xil ko'rinishda ko'rsatish uchun (DRY - avval bu
// ikkisi alohida-alohida yozilishi mumkin edi).
const RevenueBreakdownCard = ({ title, icon: Icon, items, emptyText, countLabel = 'ta buyurtma' }) => {
  const total = items.reduce((s, i) => s + i.sum, 0);

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-3">
      <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500" />} {title}
      </h4>

      {items.length === 0 ? (
        <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium py-4 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 8).map((item, idx) => {
            const pct = total > 0 ? (item.sum / total) * 100 : 0;
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300 font-bold truncate">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[8px] font-extrabold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="text-slate-800 dark:text-white font-extrabold shrink-0 ml-2">{formatCurrency(item.sum, 'uz')}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                {item.count != null && (
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{item.count} {countLabel} · {pct.toFixed(0)}%</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RevenueBreakdownCard;
