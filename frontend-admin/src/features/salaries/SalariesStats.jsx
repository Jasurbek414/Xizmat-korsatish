import React from 'react';
import { DollarSign, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const SalariesStats = ({ summary, onPayAll }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* Title + Batch Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('salaries_page.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('salaries_page.desc')}</p>
        </div>
        
        {summary.pending > 0 && (
          <button 
            onClick={onPayAll}
            className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer w-fit shadow-sm"
          >
            <CreditCard className="w-4 h-4" /> {t('salaries_page.pay_all')}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Payroll */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('salaries_page.total_payroll')}</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">
              {formatCurrency(summary.total, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Paid */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('salaries_page.paid_payroll')}</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
              {formatCurrency(summary.paid, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('salaries_page.pending_payroll')}</p>
            <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-['Outfit']">
              {formatCurrency(summary.pending, i18n.language)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

    </div>
  );
};

export default SalariesStats;
