import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../store/mockDb';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ServicesCatalog = ({ tab }) => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name_uz: '', name_ru: '', name_en: '', price: '', category: '' });

  useEffect(() => {
    setServices(getDbItem('services') || []);
  }, [tab]);

  const handleAddService = (e) => {
    e.preventDefault();
    if (!newService.name_uz || !newService.price) return;

    const updated = [...services, { ...newService, id: Date.now().toString(), price: parseFloat(newService.price) }];
    setServices(updated);
    setDbItem('services', updated);
    setNewService({ name_uz: '', name_ru: '', name_en: '', price: '', category: '' });
  };

  const handleDelete = (id) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    setDbItem('services', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('settings_page.services_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('settings_page.services_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add Service Form */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.new_service')}
          </h3>
          <form onSubmit={handleAddService} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_uz')}</label>
              <input 
                type="text" 
                value={newService.name_uz}
                onChange={(e) => setNewService({...newService, name_uz: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_ru')}</label>
              <input 
                type="text" 
                value={newService.name_ru}
                onChange={(e) => setNewService({...newService, name_ru: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_en')}</label>
              <input 
                type="text" 
                value={newService.name_en}
                onChange={(e) => setNewService({...newService, name_en: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.price')} (UZS)</label>
                <input 
                  type="number" 
                  value={newService.price}
                  onChange={(e) => setNewService({...newService, price: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.category')}</label>
                <input 
                  type="text" 
                  value={newService.category}
                  onChange={(e) => setNewService({...newService, category: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="masalan: Cleaning"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
            >
              {t('common.add')}
            </button>
          </form>
        </div>

        {/* Right: Services List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">{t('settings_page.services_title')}</h3>
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">{t('finance_page.category')}</th>
                  <th className="p-4">{t('settings_page.services_title')}</th>
                  <th className="p-4">{t('orders_page.price')}</th>
                  <th className="p-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    <td className="p-4">
                      <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                        {service.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-white">{service.name_uz}</div>
                      <div className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5 uppercase tracking-wide">
                        {service.name_ru || 'RU yo\'q'} / {service.name_en || 'EN yo\'q'}
                      </div>
                    </td>
                    <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold font-['Outfit']">{service.price.toLocaleString()} UZS</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(service.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesCatalog;
