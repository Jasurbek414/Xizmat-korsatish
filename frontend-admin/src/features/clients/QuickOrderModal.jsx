import React from 'react';
import { useTranslation } from 'react-i18next';

const QuickOrderModal = ({
  showOrderModal,
  setShowOrderModal,
  selectedClient,
  quickOrder,
  setQuickOrder,
  services,
  workers,
  handleCreateQuickOrder
}) => {
  const { t } = useTranslation();

  return (
    <>
      {showOrderModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Yangi Tezkor Buyurtma</h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">Mijoz: <span className="font-bold text-slate-800 dark:text-gray-200">{selectedClient.full_name}</span></p>
            <form onSubmit={handleCreateQuickOrder} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.service_type')}</label>
                <select 
                  value={quickOrder.service_id}
                  onChange={(e) => setQuickOrder({...quickOrder, service_id: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Tanlang --</option>
                  {services.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">{s.name_uz} ({s.price.toLocaleString()} UZS)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.worker')}</label>
                <select 
                  value={quickOrder.worker_id}
                  onChange={(e) => setQuickOrder({...quickOrder, worker_id: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Tanlang --</option>
                  {workers.map(w => <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">{w.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('dashboard.address')}</label>
                <input 
                  type="text" 
                  value={quickOrder.address} 
                  onChange={(e) => setQuickOrder({...quickOrder, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder={selectedClient.address}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowOrderModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickOrderModal;
