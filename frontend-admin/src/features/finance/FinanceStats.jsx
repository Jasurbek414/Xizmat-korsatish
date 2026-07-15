import React from 'react';
import { DollarSign, ArrowDownRight, Clock, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const FinanceStats = ({ balance, dailyExpenses, expectedFunds, pendingHandoversSum = 0 }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Joriy Balans */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Joriy Balans (Kassa)</p>
          <h3 className={`text-xl font-extrabold font-['Outfit'] ${balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            {formatCurrency(balance, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Hozirgi kassadagi mavjud pul miqdori</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* Kunlik Xarajatlar */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Kunlik Xarajatlar (Bugun)</p>
          <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-['Outfit']">
            -{formatCurrency(dailyExpenses, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Bugungi kunda qilingan chiqimlar yig'indisi</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <ArrowDownRight className="w-5 h-5" />
        </div>
      </div>

      {/* Topshirilishi kutilayotgan */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Kuryerlarda (Topshirilmagan)</p>
          <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-['Outfit']">
            {formatCurrency(pendingHandoversSum, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Mijozlardan olinib, kuryerlar ushlab turgan pul</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      {/* Kutilayotgan Mablag'lar */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Kutilayotgan Mablag'lar</p>
          <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
            {formatCurrency(expectedFunds, i18n.language)}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Faol buyurtmalarning umumiy summasi</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Clock className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default FinanceStats;
