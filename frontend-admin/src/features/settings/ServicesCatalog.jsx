import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../../store/mockDb';
import { Plus, Trash2, Edit3, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ServicesCatalog = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  
  // Modals / Editing state
  const [newService, setNewService] = useState({ name_uz: '', name_ru: '', name_en: '', price: '', category: '' });
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    setServices(getDbItem('services') || []);
  }, []);

  const handleAddService = (e) => {
    e.preventDefault();
    if (!newService.name_uz || !newService.price || !newService.category) return;

    const updated = [...services, { ...newService, id: Date.now().toString(), price: parseFloat(newService.price) }];
    setServices(updated);
    setDbItem('services', updated);
    setNewService({ name_uz: '', name_ru: '', name_en: '', price: '', category: '' });
  };

  const handleUpdateService = (e) => {
    e.preventDefault();
    if (!editingService.name_uz || !editingService.price || !editingService.category) return;

    const updated = services.map(s => s.id === editingService.id ? { ...editingService, price: parseFloat(editingService.price) } : s);
    setServices(updated);
    setDbItem('services', updated);
    setEditingService(null);
  };

  const handleDelete = (id) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    setDbItem('services', updated);
  };

  // Get unique categories for filtration
  const categories = ['all', ...new Set(services.map(s => s.category).filter(Boolean))];

  // Filtering services
  const filtered = services.filter(s => {
    const matchesSearch = 
      (s.name_uz || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.name_ru || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCat === 'all' || s.category === selectedCat;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
            {t('settings_page.services_title')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            {t('settings_page.services_desc')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Add/Edit Service Form */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            {editingService ? (
              <>
                <Edit3 className="w-4 h-4 text-indigo-500" /> Tahrirlash: {editingService.name_uz}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.new_service')}
              </>
            )}
          </h4>
          
          <form onSubmit={editingService ? handleUpdateService : handleAddService} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_uz')}</label>
              <input 
                type="text" 
                value={editingService ? editingService.name_uz : newService.name_uz}
                onChange={(e) => editingService 
                  ? setEditingService({ ...editingService, name_uz: e.target.value })
                  : setNewService({ ...newService, name_uz: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_ru')}</label>
              <input 
                type="text" 
                value={editingService ? editingService.name_ru : newService.name_ru}
                onChange={(e) => editingService
                  ? setEditingService({ ...editingService, name_ru: e.target.value })
                  : setNewService({ ...newService, name_ru: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_en')}</label>
              <input 
                type="text" 
                value={editingService ? editingService.name_en : newService.name_en}
                onChange={(e) => editingService
                  ? setEditingService({ ...editingService, name_en: e.target.value })
                  : setNewService({ ...newService, name_en: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.price')} (UZS)</label>
                <input 
                  type="number" 
                  value={editingService ? editingService.price : newService.price}
                  onChange={(e) => editingService
                    ? setEditingService({ ...editingService, price: e.target.value })
                    : setNewService({ ...newService, price: e.target.value })
                  }
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.category')}</label>
                <input 
                  type="text" 
                  value={editingService ? editingService.category : newService.category}
                  onChange={(e) => editingService
                    ? setEditingService({ ...editingService, category: e.target.value })
                    : setNewService({ ...newService, category: e.target.value })
                  }
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="masalan: Cleaning"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingService ? t('common.save') : t('common.add')}
              </button>
              {editingService && (
                <button 
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Card: Filterable Services List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          {/* Header Search & Category selection */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none font-semibold"
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition ${
                    selectedCat === cat
                      ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500'
                      : 'bg-transparent text-slate-500 dark:text-gray-400 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {cat === 'all' ? 'BARCHASI' : cat}
                </button>
              ))}
            </div>
          </div>

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
                {filtered.map((service) => (
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
                    <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold font-['Outfit']">
                      {service.price.toLocaleString()} UZS
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => setEditingService(service)}
                        className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(service.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
                      Xizmatlar topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesCatalog;
