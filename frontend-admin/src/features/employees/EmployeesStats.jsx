import React from 'react';
import { Users, Truck, AlertTriangle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EmployeesStats = ({ users }) => {
  const { t } = useTranslation();

  const totalStaff = users.length;
  const activeDrivers = users.filter(u => u.role === 'WORKER_DRIVER' && u.status === 'ACTIVE').length;
  const blockedStaff = users.filter(u => u.status === 'BLOCKED').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-xs font-semibold">
      
      {/* Total Employees */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('employees_page.total')}</p>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{totalStaff} nafar</h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Active Drivers */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('employees_page.active')}</p>
          <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">{activeDrivers} faol</h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Truck className="w-5 h-5" />
        </div>
      </div>

      {/* Blocked Staff */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('employees_page.blocked')}</p>
          <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-['Outfit']">{blockedStaff} ta</h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Average Performance Rating */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('employees_page.average_rating')}</p>
          <h3 className="text-xl font-extrabold text-amber-500 font-['Outfit']">4.8 / 5.0</h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500">
          <Star className="w-5 h-5 fill-amber-500/10" />
        </div>
      </div>

    </div>
  );
};

export default EmployeesStats;
