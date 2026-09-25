import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

// So'nggi 6 oy bo'yicha daromad/xarajat tendensiyasi - kompaniya egasi
// bitta davr raqamini emas, VAQT DAVOMIDA qanday o'zgarib borayotganini
// ko'rishi kerak. Hisobotlar sahifasida avval hech qanday grafik yo'q
// edi - faqat statik raqamlar (PLReport.jsx'da ham xuddi shunday, faqat
// matnli oylik ro'yxat bor edi, vizual solishtirish qiyin edi).
//
// Tashqi kutubxonasiz, oddiy CSS ustunlar bilan chizilgan - loyihada
// allaqachon shunga o'xshash yondashuv bor edi (Finance.jsx'dagi qo'lda
// SVG chizilgan pul oqimi grafigi).
const MonthlyTrendChart = ({ transactions }) => {
  const months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('uz-UZ', { month: 'short' }),
        revenue: 0,
        expense: 0
      });
    }
    const byKey = Object.fromEntries(list.map(m => [m.key, m]));
    transactions.forEach(t => {
      if (!t.created_at || t.category === 'TRANSFER') return;
      const key = t.created_at.slice(0, 7);
      const bucket = byKey[key];
      if (!bucket) return;
      if (t.type === 'INCOME') bucket.revenue += t.amount;
      else bucket.expense += t.amount;
    });
    return list;
  }, [transactions]);

  const maxVal = Math.max(...months.map(m => Math.max(m.revenue, m.expense)), 1);

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> So'nggi 6 Oy Tendensiyasi
        </h4>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <span className="flex items-center gap-1 text-slate-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Daromad</span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Xarajat</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 h-40 px-1">
        {months.map(m => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
            <div className="flex items-end gap-1 h-full w-full justify-center">
              <div
                className="w-1/3 max-w-[18px] rounded-t-md bg-emerald-500/80 group-hover:bg-emerald-500 transition-all"
                style={{ height: `${(m.revenue / maxVal) * 100}%`, minHeight: m.revenue > 0 ? '3px' : '0' }}
                title={`Daromad: ${formatCurrency(m.revenue, 'uz')}`}
              />
              <div
                className="w-1/3 max-w-[18px] rounded-t-md bg-rose-500/80 group-hover:bg-rose-500 transition-all"
                style={{ height: `${(m.expense / maxVal) * 100}%`, minHeight: m.expense > 0 ? '3px' : '0' }}
                title={`Xarajat: ${formatCurrency(m.expense, 'uz')}`}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 capitalize">{m.label}</span>

            {/* Hover'da aniq summalar - ustunlar ustiga sichqoncha olib borilganda */}
            <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center bg-slate-800 dark:bg-black text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
              <span className="text-emerald-400">+{formatCurrency(m.revenue, 'uz')}</span>
              <span className="text-rose-400">-{formatCurrency(m.expense, 'uz')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyTrendChart;
