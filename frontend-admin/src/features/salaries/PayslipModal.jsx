import React from 'react';
import { X, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const PayslipModal = ({ isOpen, onClose, salary, orders = [] }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen || !salary) return null;

  // Filter completed orders for this worker in the current pay period
  const workerOrders = orders.filter(o => {
    const isWorker = o.worker_name.toLowerCase() === salary.full_name.toLowerCase();
    const isCompleted = o.status_id === '4';
    
    // Period matching (e.g. order's created_at year-month matches pay_period)
    const orderPeriod = o.created_at ? o.created_at.slice(0, 7) : ''; // "2026-06"
    return isWorker && isCompleted && orderPeriod === salary.pay_period;
  });

  // Calculate dynamic commissions
  const totalOrdersAmount = workerOrders.reduce((sum, o) => sum + o.price, 0);
  const commission = Math.round(totalOrdersAmount * 0.1); // 10%
  const baseBonus = Math.max(salary.bonus - commission, 0);

  const netSalary = salary.base_salary + salary.bonus - salary.deductions;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 flex flex-col max-h-[90vh] overflow-hidden text-xs font-semibold">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="font-extrabold text-sm font-['Outfit']">Hisob-kitob varaqasi (Payslip)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition cursor-pointer"
              title={t('salaries_page.print')}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slip Body (Print Area) */}
        <div id="payslip-print-area" className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Logo & Company info */}
          <div className="flex justify-between items-start border-b border-dashed border-slate-200 dark:border-white/5 pb-3">
            <div>
              <h4 className="font-black text-slate-800 dark:text-white font-['Outfit'] uppercase text-[10px] tracking-wider">ServiceCore SaaS ERP</h4>
              <p className="text-[9px] text-slate-400 font-mono">Toshkent, O'zbekiston</p>
            </div>
            <div className="text-right">
              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg uppercase ${salary.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {salary.status === 'PAID' ? 'To\'langan' : 'To\'lov kutilmoqda'}
              </span>
              <p className="text-[9px] text-slate-400 mt-1 font-mono">Davr: {salary.pay_period}</p>
            </div>
          </div>

          {/* Employee Information */}
          <div className="bg-slate-50 dark:bg-white/2 p-3.5 rounded-xl border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Xodim F.I.SH</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-white">{salary.full_name}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Lavozim / Role</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-white">Drayver (Kuryer)</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Xodim ID</p>
              <p className="text-[10px] font-mono text-slate-700 dark:text-gray-300">{salary.user_id}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Tizim Sanasi</p>
              <p className="text-[10px] font-mono text-slate-700 dark:text-gray-300">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Detailed Statement Ledger */}
          <div className="space-y-3.5">
            <h5 className="font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide text-[9px] border-b pb-1">Batafsil maosh tarkibi</h5>
            
            <div className="space-y-2">
              {/* Base */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400">{t('salaries_page.base_salary')}</span>
                <span className="text-slate-800 dark:text-white font-bold">{formatCurrency(salary.base_salary, i18n.language)}</span>
              </div>

              {/* Commision */}
              <div className="flex justify-between items-center py-1">
                <div className="space-y-0.5">
                  <span className="text-slate-500 dark:text-gray-400">{t('salaries_page.orders_comm')}</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Bajarilgan buyurtmalar soni: {workerOrders.length} ta ({formatCurrency(totalOrdersAmount, i18n.language)} jami)</span>
                </div>
                <span className="text-emerald-600 font-bold">+{formatCurrency(commission, i18n.language)}</span>
              </div>

              {/* Performance Bonus */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400">{t('salaries_page.performance_bonus')}</span>
                <span className="text-emerald-600 font-bold">+{formatCurrency(baseBonus, i18n.language)}</span>
              </div>

              {/* Deductions */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400">{t('salaries_page.deductions')} (Avans / Chegirma)</span>
                <span className="text-rose-600 font-bold">-{formatCurrency(salary.deductions, i18n.language)}</span>
              </div>

              {/* Summary line */}
              <div className="flex justify-between items-center bg-indigo-500/5 px-3 py-2.5 rounded-xl border border-indigo-500/10 mt-3">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[9px] tracking-wide">Sof To'lanadigan (Net Salary)</span>
                <span className="font-black text-sm text-indigo-600 dark:text-indigo-400 font-['Outfit']">
                  {formatCurrency(netSalary, i18n.language)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
          <button 
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};

export default PayslipModal;
