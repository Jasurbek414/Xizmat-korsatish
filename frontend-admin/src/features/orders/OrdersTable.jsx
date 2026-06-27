import React from 'react';
import { User, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrdersTable = ({ filteredOrders, statuses, onStatusChange, onOpenDetails }) => {
  const { t } = useTranslation();

  const getStatusColor = (statusId) => {
    const s = statuses.find(x => x.id === statusId);
    return s ? s.color_code : '#3b82f6';
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">{t('dashboard.client')}</th>
              <th className="p-4">{t('orders_page.service_type')}</th>
              <th className="p-4">{t('orders_page.worker')}</th>
              <th className="p-4">{t('dashboard.address')}</th>
              <th className="p-4">{t('dashboard.price')}</th>
              <th className="p-4">{t('common.status')}</th>
              <th className="p-4 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Buyurtmalar topilmadi
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr 
                  key={o.id} 
                  onClick={() => onOpenDetails(o)}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                >
                  <td className="p-4 font-semibold text-slate-800 dark:text-white">{o.client_name}</td>
                  <td className="p-4 text-slate-700 dark:text-gray-200">
                    <div className="font-semibold">{o.service_name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-gray-550 font-semibold mt-0.5">
                      {o.quantity !== undefined ? `${o.quantity} ${o.measurement_unit || 'dona'}` : '1 dona'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                      <User className="w-3.5 h-3.5" /> {o.worker_name}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-gray-400 truncate max-w-[150px]" title={o.address}>
                    {o.address}
                  </td>
                  <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold font-['Outfit']">
                    {o.price.toLocaleString()} UZS
                  </td>
                  <td className="p-4">
                    <span 
                      style={{ backgroundColor: getStatusColor(o.status_id) + '12', color: getStatusColor(o.status_id), borderColor: getStatusColor(o.status_id) + '25' }}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider"
                    >
                      {statuses.find(s => s.id === o.status_id)?.name_uz || 'Noma\'lum'}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onOpenDetails(o)}
                      title={t('orders_page.order_detail')}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <select 
                      value={o.status_id}
                      onChange={(e) => onStatusChange(o.id, e.target.value)}
                      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {statuses.map(st => (
                        <option key={st.id} value={st.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">
                          {st.name_uz}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersTable;
