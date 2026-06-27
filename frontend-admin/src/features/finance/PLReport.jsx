import React from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, TrendingUp, Percent, Scale } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const PLReport = ({ transactions }) => {
  const { t, i18n } = useTranslation();

  // Filter out internal transfers from calculations
  const actualTx = transactions.filter(t => t.category !== 'TRANSFER');

  // Compute overall figures
  const revenue = actualTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const salaries = actualTx.filter(t => t.type === 'EXPENSE' && t.category === 'SALARY').reduce((sum, t) => sum + t.amount, 0);
  const officeExpenses = actualTx.filter(t => t.type === 'EXPENSE' && t.category === 'OFFICE_EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const taxesPaid = actualTx.filter(t => t.type === 'EXPENSE' && t.category === 'TAX').reduce((sum, t) => sum + t.amount, 0);
  
  // Dynamic 4% tax estimation for service business if no tax recorded, otherwise use recorded taxes
  const estimatedTax = taxesPaid > 0 ? taxesPaid : Math.round(revenue * 0.04);
  const totalExpenses = salaries + officeExpenses + estimatedTax;
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Group by Month for monthly breakdown
  const monthlyData = {};
  actualTx.forEach(tx => {
    const date = new Date(tx.created_at);
    const monthKey = date.toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'long', year: 'numeric' });
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, salaries: 0, opex: 0, tax: 0 };
    }
    if (tx.type === 'INCOME') {
      monthlyData[monthKey].revenue += tx.amount;
    } else {
      if (tx.category === 'SALARY') monthlyData[monthKey].salaries += tx.amount;
      else if (tx.category === 'TAX') monthlyData[monthKey].tax += tx.amount;
      else monthlyData[monthKey].opex += tx.amount;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      {/* High-level P&L Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Gross Revenue */}
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.revenue')}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">
            {formatCurrency(revenue, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Barcha daromad keltirgan tranzaksiyalar</p>
        </div>

        {/* Total OPEX & Direct Costs */}
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Jami Xarajatlar</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/5 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">
            {formatCurrency(totalExpenses, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Maoshlar + Ofis xarajatlari + Soliqlar</p>
        </div>

        {/* Net Profit */}
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.net_profit')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-lg font-extrabold font-['Outfit'] ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatCurrency(netProfit, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Soliqlar va xarajatlardan keyingi sof foyda</p>
        </div>

        {/* Margin % */}
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.profit_margin')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">
            {margin.toFixed(1)}%
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Biznesning umumiy foydalilik rentabelligi</p>
        </div>

      </div>

      {/* P&L Statement Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Detailed Statement Table */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
          <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent">
            <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">Foyda va Zarar Hisoboti (P&L Detailed Statement)</h4>
          </div>
          <div className="p-4 space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              
              {/* Revenue */}
              <div className="py-2.5 flex justify-between items-center text-slate-700 dark:text-gray-300">
                <span className="font-semibold text-slate-800 dark:text-white uppercase text-[10px] tracking-wide">{t('finance_page.revenue')}</span>
                <span className="text-slate-800 dark:text-white font-extrabold">{formatCurrency(revenue, i18n.language)}</span>
              </div>

              {/* Direct Expenses */}
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 dark:text-gray-400">{t('finance_page.direct_costs')} (Maoshlar)</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(salaries, i18n.language)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 dark:text-gray-400">{t('finance_page.operating_expenses')} (Ofis, ijara, h.k.)</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(officeExpenses, i18n.language)}</span>
              </div>

              {/* Estimated taxes */}
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 dark:text-gray-400">{t('finance_page.estimated_tax')} (Soliqlar)</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(estimatedTax, i18n.language)}</span>
              </div>

              {/* Summary expenses */}
              <div className="py-2.5 flex justify-between items-center bg-slate-50/50 dark:bg-white/2 px-1">
                <span className="font-bold text-slate-600 dark:text-gray-400 text-[10px] uppercase">Jami Chiqimlar</span>
                <span className="text-slate-700 dark:text-gray-200 font-extrabold">{formatCurrency(totalExpenses, i18n.language)}</span>
              </div>

              {/* Net profit row */}
              <div className="py-3 flex justify-between items-center bg-indigo-500/5 px-2 rounded-xl mt-1">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider">Sof Foyda (Net Profit)</span>
                <span className={`font-extrabold text-sm ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {formatCurrency(netProfit, i18n.language)}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Right: Monthly breakdown list */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
          <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent">
            <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">Oylar Kesimida (Monthly Overview)</h4>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[300px]">
            {Object.keys(monthlyData).length === 0 ? (
              <p className="text-[10px] text-slate-400 dark:text-gray-500 text-center py-8">Ma'lumotlar yetarli emas</p>
            ) : (
              Object.keys(monthlyData).map(month => {
                const data = monthlyData[month];
                const totalMExp = data.salaries + data.opex + (data.tax || Math.round(data.revenue * 0.04));
                const netMProfit = data.revenue - totalMExp;
                const mMargin = data.revenue > 0 ? (netMProfit / data.revenue) * 100 : 0;
                
                return (
                  <div key={month} className="border-b border-slate-100 dark:border-white/5 pb-3 last:border-0 last:pb-0 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 dark:text-white font-['Outfit']">{month}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${netMProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'}`}>
                        {mMargin.toFixed(0)}% Margin
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-bold uppercase text-[8px]">Daromad</p>
                        <p className="text-slate-700 dark:text-gray-300 font-extrabold">+{formatCurrency(data.revenue, i18n.language).split(' ')[0]}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-bold uppercase text-[8px]">Xarajat</p>
                        <p className="text-slate-700 dark:text-gray-300 font-extrabold">-{formatCurrency(totalMExp, i18n.language).split(' ')[0]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 dark:text-gray-500 font-bold uppercase text-[8px]">Foyda</p>
                        <p className={`font-extrabold ${netMProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {formatCurrency(netMProfit, i18n.language).split(' ')[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PLReport;
