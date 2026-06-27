import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const FinanceStats = ({ totals, wallets, onOpenTransfer }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* Overall Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Jami Kirim */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.income')}</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
              +{formatCurrency(totals.income, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Jami Chiqim */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.expense')}</p>
            <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-['Outfit']">
              -{formatCurrency(totals.expense, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Joriy Balans */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.balance')}</p>
            <h3 className={`text-xl font-extrabold font-['Outfit'] ${totals.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
              {formatCurrency(totals.balance, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Wallets & Accounts Area */}
      <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm border border-slate-200 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">
              {t('finance_page.wallets')} (Company Wallets)
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-gray-500">Kassa va to'lov hisoblari kesimidagi balanslar</p>
          </div>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] font-bold"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {t('finance_page.transfer')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {wallets.map(w => (
            <div key={w.id} className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-indigo-500 dark:hover:border-white/10 transition">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase">
                  {i18n.language === 'uz' ? w.name_uz : i18n.language === 'ru' ? w.name_ru : w.name_en}
                </p>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white font-['Outfit']">
                  {formatCurrency(w.balance, i18n.language)}
                </h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-gray-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default FinanceStats;
