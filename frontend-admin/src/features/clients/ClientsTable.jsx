import React from 'react';
import { ShoppingBag, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ClientsTable = ({ filteredClients, getClientStats, handleOpenClientDetails, setSelectedClient, setShowOrderModal, setEditingClient, setShowEditModal, handleDeleteClient }) => {
  const { t } = useTranslation();

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">{t('clients_page.fullname')}</th>
              <th className="p-4">{t('clients_page.phone')}</th>
              <th className="p-4">{t('clients_page.address')}</th>
              <th className="p-4">Buyurtmalar soni</th>
              <th className="p-4">Jami Sarf</th>
              <th className="p-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Mijozlar topilmadi
                </td>
              </tr>
            ) : (
              filteredClients.map((c, idx) => {
                const stats = getClientStats(c.full_name);
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => handleOpenClientDetails(c)}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                  >
                    <td className="p-4 text-center text-slate-400 dark:text-gray-500 font-mono font-bold w-12">
                      {idx + 1}
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {c.full_name.charAt(0)}
                      </div>
                      {c.full_name}
                    </td>
                    <td className="p-4 text-slate-800 dark:text-gray-200 font-mono font-bold">{c.phone}</td>
                    <td className="p-4 text-slate-500 dark:text-gray-400 truncate max-w-[200px]" title={c.address}>
                      {c.address || 'Kiritilmagan'}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-gray-300 font-bold font-['Outfit']">{stats.orderCount} ta</td>
                    <td className="p-4 text-indigo-600 dark:text-indigo-400 font-extrabold font-['Outfit']">
                      {stats.spent.toLocaleString()} UZS
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedClient(c);
                          setShowOrderModal(true);
                        }}
                        title="Buyurtma yaratish"
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingClient(c);
                          setShowEditModal(true);
                        }}
                        title="Tahrirlash"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClient(c, e)}
                        title="O'chirish"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-450 transition cursor-pointer"
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
    </div>
  );
};

export default ClientsTable;
