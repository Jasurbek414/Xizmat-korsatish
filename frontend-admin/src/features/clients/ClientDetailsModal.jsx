import React from 'react';
import { Phone, MapPin, Edit2, X, FileText, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ClientDetailsModal = ({
  selectedClient,
  setSelectedClient,
  clientStats,
  clientOrders,
  noteText,
  setNoteText,
  handleAddNote,
  setShowOrderModal,
  setEditingClient,
  setShowEditModal
}) => {
  const { t } = useTranslation();

  if (!selectedClient) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-lg">
              {selectedClient.full_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white font-['Outfit']">{selectedClient.full_name}</h3>
              <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">ID: {selectedClient.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingClient(selectedClient);
                setShowEditModal(true);
              }}
              className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
            </button>
            <button 
              onClick={() => setSelectedClient(null)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs font-semibold">
          {/* Contact info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3.5 rounded-xl flex items-center gap-3">
              <Phone className="w-4 h-4 text-indigo-500" />
              <div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.phone')}</p>
                <p className="text-xs text-slate-800 dark:text-gray-200 font-bold mt-0.5">{selectedClient.phone}</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3.5 rounded-xl flex items-center gap-3 sm:col-span-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.address')}</p>
                <p className="text-xs text-slate-800 dark:text-gray-200 font-semibold mt-0.5">{selectedClient.address || 'Kiritilmagan'}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">{t('clients_page.client_stats')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.total_orders')}</p>
                <h5 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{clientStats.orderCount} ta</h5>
              </div>
              <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.total_spent')}</p>
                <h5 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">{clientStats.spent.toLocaleString()} UZS</h5>
              </div>
              <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Sevimli Xizmat</p>
                <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate font-['Outfit']" title="Xizmat">
                  Kuryerlik
                </h5>
              </div>
            </div>
          </div>

          {/* CRM Activity Timeline Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Mijoz Faoliyati va Eslatmalar (CRM Timeline)</h4>
            
            {/* Note creation form */}
            <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Mijoz uchun yangi eslatma yozish..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
              />
              <button 
                type="submit" 
                className="premium-btn text-white px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Yozish
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {(!selectedClient.notes || selectedClient.notes.length === 0) ? (
                <p className="text-[11px] text-slate-400 dark:text-gray-500 italic">Eslatmalar yozilmagan</p>
              ) : (
                selectedClient.notes.map(note => (
                  <div key={note.id} className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3 rounded-xl space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-gray-500 font-bold">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-indigo-500" /> Eslatma</span>
                      <span>{note.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed">{note.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order History */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">{t('clients_page.order_history')}</h4>
            {clientOrders.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-gray-500 font-medium border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                Sotib olingan xizmatlar mavjud emas
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-transparent">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5 text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500">
                      <th className="p-3">Xizmat</th>
                      <th className="p-3">Narxi</th>
                      <th className="p-3">Kuryer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px] text-slate-700 dark:text-gray-300 font-medium">
                    {clientOrders.map(o => (
                      <tr key={o.id}>
                        <td className="p-3 text-slate-800 dark:text-white font-semibold">Tezkor yetkazish</td>
                        <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold">{o.price.toLocaleString()} UZS</td>
                        <td className="p-3 text-slate-550 dark:text-gray-400">{o.worker_name || 'Biriktirilmagan'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4 flex justify-between items-center">
          <button 
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-1.5 premium-btn text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" /> Yangi Buyurtma
          </button>
          <button 
            onClick={() => setSelectedClient(null)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-750 dark:text-gray-300 text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;
