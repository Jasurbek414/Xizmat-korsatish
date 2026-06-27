import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../../store/mockDb';
import { Plus, Trash2, ArrowDown, ArrowUp, Edit3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrderStatuses = () => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });
  const [editingStatus, setEditingStatus] = useState(null);

  useEffect(() => {
    setStatuses(getDbItem('order_statuses') || []);
  }, []);

  const handleAddStatus = (e) => {
    e.preventDefault();
    if (!newStatus.name_uz || !newStatus.name_ru || !newStatus.name_en) return;

    const nextOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.sort_order)) + 1 : 1;
    const updated = [...statuses, { ...newStatus, id: Date.now().toString(), sort_order: nextOrder }];
    setStatuses(updated);
    setDbItem('order_statuses', updated);
    setNewStatus({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });
  };

  const handleUpdateStatus = (e) => {
    e.preventDefault();
    if (!editingStatus.name_uz || !editingStatus.name_ru || !editingStatus.name_en) return;

    const updated = statuses.map(s => s.id === editingStatus.id ? editingStatus : s);
    setStatuses(updated);
    setDbItem('order_statuses', updated);
    setEditingStatus(null);
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
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.statuses_title')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          {t('settings_page.statuses_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Card (Add/Edit Status) */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            {editingStatus ? (
              <>
                <Edit3 className="w-4 h-4 text-indigo-500" /> Tahrirlash: {editingStatus.name_uz}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.new_status')}
              </>
            )}
          </h4>
          <form onSubmit={editingStatus ? handleUpdateStatus : handleAddStatus} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_uz')}</label>
              <input 
                type="text" 
                value={editingStatus ? editingStatus.name_uz : newStatus.name_uz}
                onChange={(e) => editingStatus
                  ? setEditingStatus({ ...editingStatus, name_uz: e.target.value })
                  : setNewStatus({ ...newStatus, name_uz: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_ru')}</label>
              <input 
                type="text" 
                value={editingStatus ? editingStatus.name_ru : newStatus.name_ru}
                onChange={(e) => editingStatus
                  ? setEditingStatus({ ...editingStatus, name_ru: e.target.value })
                  : setNewStatus({ ...newStatus, name_ru: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_en')}</label>
              <input 
                type="text" 
                value={editingStatus ? editingStatus.name_en : newStatus.name_en}
                onChange={(e) => editingStatus
                  ? setEditingStatus({ ...editingStatus, name_en: e.target.value })
                  : setNewStatus({ ...newStatus, name_en: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.color_code')}</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={editingStatus ? editingStatus.color_code : newStatus.color_code}
                  onChange={(e) => editingStatus
                    ? setEditingStatus({ ...editingStatus, color_code: e.target.value })
                    : setNewStatus({ ...newStatus, color_code: e.target.value })
                  }
                  className="w-10 h-8 border border-slate-200 dark:border-white/10 rounded-lg cursor-pointer bg-transparent"
                />
                <span className="text-slate-700 dark:text-gray-300 font-mono text-xs">
                  {editingStatus ? editingStatus.color_code : newStatus.color_code}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingStatus ? t('common.save') : t('common.add')}
              </button>
              {editingStatus && (
                <button 
                  type="button"
                  onClick={() => setEditingStatus(null)}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Statuses List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">{t('settings_page.order_sequence')}</h4>
          <div className="space-y-2">
            {statuses.map((status, index) => (
              <div 
                key={status.id} 
                className="flex items-center justify-between bg-slate-50 dark:bg-white/2 border border-slate-200/50 dark:border-white/5 p-4 rounded-xl hover:border-slate-300 dark:hover:border-white/10 transition duration-200"
              >
                <div className="flex items-center gap-3">
                  <span 
                    style={{ backgroundColor: status.color_code }} 
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
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
                    onClick={() => setEditingStatus(status)}
                    className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 ml-2 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={() => handleDelete(status.id)}
                    className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {statuses.length === 0 && (
              <div className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
                Statuslar mavjud emas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatuses;
