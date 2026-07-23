import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreateOrderModal = ({ isOpen, onClose, clients, services, workers, newOrder, setNewOrder, onSubmit, companySettings, error }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">{t('orders_page.add_order')}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl px-3 py-2 font-semibold">
              {error}
            </div>
          )}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Mijoz Telefon Raqami</label>
            <input 
              type="text"
              value={newOrder.client_phone || ''}
              onChange={(e) => {
                const val = e.target.value;
                const cleanInput = val.replace(/\D/g, '');
                const found = clients.find(c => {
                  const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
                  return cleanPhone && cleanPhone.endsWith(cleanInput) && cleanInput.length >= 7;
                });
                
                if (found) {
                  setNewOrder({
                    ...newOrder,
                    client_phone: val,
                    client_name: found.fullName || found.full_name || '',
                    address: found.address || newOrder.address || ''
                  });
                } else {
                  setNewOrder({
                    ...newOrder,
                    client_phone: val,
                    client_name: newOrder.client_name || ''
                  });
                }
              }}
              placeholder="+998 (90) 123-45-67"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Mijoz Ism Familiyasi</label>
            <input 
              type="text"
              value={newOrder.client_name || ''}
              onChange={(e) => setNewOrder({...newOrder, client_name: e.target.value})}
              placeholder="Masalan: Alisher Qodirov"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.service_type')}</label>
            <select 
              value={newOrder.service_id}
              onChange={(e) => setNewOrder({...newOrder, service_id: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              required
            >
              <option value="" className="bg-white dark:bg-[#111827] text-slate-400">-- {t('common.search')} --</option>
              {services.map(s => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">
                  {s.name_uz} ({s.price.toLocaleString()} UZS)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.worker')} (Ixtiyoriy)</label>
            <select 
              value={newOrder.worker_id || ''}
              onChange={(e) => setNewOrder({...newOrder, worker_id: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-[#111827] text-slate-400">-- Kuryer biriktirilmasin --</option>
              {workers.map(w => (
                <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">
                  {w.fullName || w.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Miqdor (Quantity)</label>
              <input 
                type="number" 
                min="0.01"
                step="any"
                value={newOrder.quantity || 1} 
                onChange={(e) => setNewOrder({...newOrder, quantity: parseFloat(e.target.value) || 1})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">O'lchov Birligi</label>
              <select 
                value={newOrder.measurement_unit || 'dona'}
                onChange={(e) => setNewOrder({...newOrder, measurement_unit: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                required
              >
                {(companySettings?.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr']).map(unit => (
                  <option key={unit} value={unit} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('dashboard.address')}</label>
            <input 
              type="text" 
              value={newOrder.address} 
              onChange={(e) => setNewOrder({...newOrder, address: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              placeholder={t('orders_page.address_placeholder')}
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Qo'shimcha Izoh</label>
            <input 
              type="text" 
              value={newOrder.description || ''} 
              onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              placeholder="masalan: 3-podezd, kod 123"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
            >
              {t('orders_page.add_order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
