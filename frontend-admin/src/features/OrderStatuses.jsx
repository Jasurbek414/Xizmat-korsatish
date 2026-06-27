import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../store/mockDb';
import { Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrderStatuses = ({ tab }) => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });

  useEffect(() => {
    setStatuses(getDbItem('order_statuses') || []);
  }, [tab]);

  const handleAddStatus = (e) => {
    e.preventDefault();
    if (!newStatus.name_uz || !newStatus.name_ru || !newStatus.name_en) return;

    const nextOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.sort_order)) + 1 : 1;
    const updated = [...statuses, { ...newStatus, id: Date.now().toString(), sort_order: nextOrder }];
    setStatuses(updated);
    setDbItem('order_statuses', updated);
    setNewStatus({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });
  };

  const handleDelete = (id) => {
    const updated = statuses.filter(s => s.id !== id);
    setStatuses(updated);
    setDbItem('order_statuses', updated);
  };

  const moveStatus = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === statuses.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...statuses];
    
    // Swap items
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate sort_order
    const reordered = updated.map((s, idx) => ({ ...s, sort_order: idx + 1 }));
    setStatuses(reordered);
    setDbItem('order_statuses', reordered);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('settings_page.statuses_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('settings_page.statuses_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add Status Form */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.new_status')}
          </h3>
          <form onSubmit={handleAddStatus} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_uz')}</label>
              <input 
                type="text" 
                value={newStatus.name_uz}
                onChange={(e) => setNewStatus({...newStatus, name_uz: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_ru')}</label>
              <input 
                type="text" 
                value={newStatus.name_ru}
                onChange={(e) => setNewStatus({...newStatus, name_ru: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_en')}</label>
              <input 
                type="text" 
                value={newStatus.name_en}
                onChange={(e) => setNewStatus({...newStatus, name_en: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.color_code')}</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={newStatus.color_code}
                  onChange={(e) => setNewStatus({...newStatus, color_code: e.target.value})}
                  className="w-10 h-8 border border-slate-200 dark:border-white/10 rounded-lg cursor-pointer bg-transparent"
                />
                <span className="text-slate-700 dark:text-gray-300 font-mono text-xs">{newStatus.color_code}</span>
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

        {/* Right: Statuses List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">{t('settings_page.order_sequence')}</h3>
          <div className="space-y-2">
            {statuses.map((status, index) => (
              <div 
                key={status.id} 
                className="flex items-center justify-between bg-slate-50 dark:bg-white/2 border border-slate-200/50 dark:border-white/5 p-4 rounded-xl hover:border-slate-300 dark:hover:border-white/10 transition duration-200"
              >
                <div className="flex items-center gap-3">
                  <span 
                    style={{ backgroundColor: status.color_code }} 
                    className="w-3 h-3 rounded-full inline-block shadow-sm"
                  />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{status.name_uz}</h4>
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wide">
                      {status.name_ru} / {status.name_en}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => moveStatus(index, 'up')}
                    className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => moveStatus(index, 'down')}
                    className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  
                  <button 
                    onClick={() => handleDelete(status.id)}
                    className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 ml-2 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatuses;
