import React from 'react';
import { User, Phone, Eye, Edit, Trash2, Printer } from 'lucide-react';
import TablePagination, { usePagination } from '../../components/TablePagination';
import { useTranslation } from 'react-i18next';

const OrdersTable = ({ filteredOrders, statuses, onStatusChange, onOpenDetails, onEditOrder, onDeleteOrder, onOpenPrint }) => {
  const { t } = useTranslation();
  const pg = usePagination(filteredOrders);

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
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">{t('dashboard.client')}</th>
              <th className="p-4">{t('orders_page.service_type')}</th>
              <th className="p-4">Olingan Vaqti</th>
              <th className="p-4">{t('orders_page.worker')}</th>
              <th className="p-4">{t('dashboard.address')}</th>
              <th className="p-4">{t('dashboard.price')}</th>
              <th className="p-4">{t('common.status')}</th>
              <th className="p-4 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
            {pg.total === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Buyurtmalar topilmadi
                </td>
              </tr>
            ) : (
              pg.pageItems.map((o, idx) => {
                const itemsCount = o.items ? o.items.length : 0;
                const orderArea = (o.items || []).reduce((sum, i) => sum + ((parseFloat(i.length) || 0) * (parseFloat(i.width) || 0)), 0).toFixed(1);

                return (
                  <tr 
                    key={o.id} 
                    onClick={() => onOpenDetails(o)}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                  >
                    <td className="p-4 text-center text-slate-400 dark:text-gray-500 font-mono font-bold w-12">
                      {pg.startIndex + idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-white">{o.client_name}</div>
                      {o.client_phone && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-gray-400 font-mono mt-0.5">
                          <Phone className="w-3 h-3 shrink-0 text-indigo-500" /> {o.client_phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-gray-200">
                      <div className="font-semibold">{o.service_name || 'Gilam yuvish'}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        {itemsCount > 0 ? `${itemsCount} dona gilam (${orderArea} m²)` : "O'lchov kiritilmagan"}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-500 dark:text-gray-400">
                      {o.created_at ? new Date(o.created_at).toLocaleString('uz-UZ', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                        <User className="w-3.5 h-3.5" /> {o.worker_name}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-gray-400 truncate max-w-[150px]" title={o.address}>
                      {o.address}
                    </td>
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {Number(o.price ?? 0).toLocaleString()} UZS
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={o.status_id || ''}
                        onChange={(e) => onStatusChange(o.id, e.target.value)}
                        style={{ backgroundColor: getStatusColor(o.status_id) + '15', color: getStatusColor(o.status_id), borderColor: getStatusColor(o.status_id) + '30' }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider cursor-pointer outline-none appearance-none"
                        title="Statusni o'zgartirish"
                      >
                        {statuses.map(s => (
                          <option key={s.id} value={s.id} style={{ color: '#1e293b', backgroundColor: '#fff' }}>
                            {s.name_uz}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => onOpenDetails(o)}
                        title={t('orders_page.order_detail')}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {onOpenPrint && (
                        <button 
                          onClick={() => onOpenPrint(o)}
                          title="Chek va Birka chop etish"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => onEditOrder(o)}
                        title="Tahrirlash"
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteOrder(o.id)}
                        title="O'chirish"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination {...pg} />
    </div>
  );
};

export default OrdersTable;
