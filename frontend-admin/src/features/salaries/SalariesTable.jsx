import React from 'react';
import { CheckCircle, AlertCircle, CreditCard, FileText, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const SalariesTable = ({ 
  salaries, 
  onPaySalary, 
  onOpenAdvance, 
  onOpenPayslip 
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent border border-slate-200 dark:border-white/5 text-xs font-semibold">
      
      <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent flex justify-between items-center">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">
          {t('salaries_page.worker_list')}
        </h4>
        <span className="text-[10px] text-slate-400 font-bold">Jami: {salaries.length} ta xodim</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">Xodim</th>
              <th className="p-4">{t('salaries_page.base_salary')}</th>
              <th className="p-4">{t('salaries_page.bonus')}</th>
              <th className="p-4">{t('salaries_page.deductions')}</th>
              <th className="p-4">{t('salaries_page.net_salary')}</th>
              <th className="p-4">{t('salaries_page.period')}</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
            {salaries.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Maosh ma'lumotlari topilmadi
                </td>
              </tr>
            ) : (
              salaries.map((s) => {
                const netSalary = s.base_salary + s.bonus - s.deductions;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    
                    {/* Worker Info */}
                    <td className="p-4">
                      <span className="font-semibold text-slate-800 dark:text-white block">{s.full_name}</span>
                      <span className="text-[9px] text-slate-400 font-medium">ID: {s.user_id}</span>
                    </td>
                    
                    {/* Base Salary */}
                    <td className="p-4 font-semibold text-slate-700 dark:text-gray-200 font-['Outfit']">
                      {formatCurrency(s.base_salary, i18n.language)}
                    </td>
                    
                    {/* Bonus & KPI */}
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-extrabold font-['Outfit']">
                      +{formatCurrency(s.bonus, i18n.language)}
                    </td>
                    
                    {/* Deductions / Advances */}
                    <td className="p-4 text-rose-600 dark:text-rose-400 font-extrabold font-['Outfit']">
                      -{formatCurrency(s.deductions, i18n.language)}
                    </td>
                    
                    {/* Net Salary */}
                    <td className="p-4 font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">
                      {formatCurrency(netSalary, i18n.language)}
                    </td>
                    
                    {/* Period */}
                    <td className="p-4 text-slate-500 dark:text-gray-400 font-['Outfit']">
                      {s.pay_period}
                    </td>
                    
                    {/* Status */}
                    <td className="p-4 font-bold text-[9px] uppercase tracking-wider">
                      {s.status === 'PAID' ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
                          <CheckCircle className="w-3 h-3" /> {t('salaries_page.paid')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg w-fit">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> {t('salaries_page.pending')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 ml-auto w-fit">
                        
                        {/* Payslip */}
                        <button
                          onClick={() => onOpenPayslip(s)}
                          title={t('salaries_page.payslip')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Advance / Fine */}
                        {s.status === 'UNPAID' && (
                          <button
                            onClick={() => onOpenAdvance(s)}
                            title="Avans berish yoki jarima yozish"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Pay oylik */}
                        {s.status === 'UNPAID' ? (
                          <button 
                            onClick={() => onPaySalary(s.id)}
                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" /> {t('salaries_page.pay')}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium px-2">Kop hisoblandi</span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default SalariesTable;
