import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { confirmDialog } from '../../services/confirmDialog';
import { showToast } from '../../services/toast';
import { Plus, Trash2, ArrowDown, ArrowUp, Edit3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// OrderStatuses.jsx bilan AYNAN bir xil naqsh - lekin bu ro'yxat butunlay
// MUSTAQIL: Buyurtma Statuslari buyurtmaning umumiy holatini (pickup/sex/
// delivery) bildiradi, bu yerdagi bosqichlar esa FAQAT sex ichida, har bir
// gilamning o'z ishlov holatini (masalan Qabul qilindi -> Yuvildi -> Tayyor)
// bildiradi. Avval bular 4 ta qattiq kodlangan qiymat edi (mobil ilovada) -
// endi to'liq sozlanadigan.
const ItemStages = () => {
  const { t } = useTranslation();
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });
  const [editingStage, setEditingStage] = useState(null);

  useEffect(() => {
    const loadStages = async () => {
      try {
        const data = await api.getItemStages();
        const mapped = data.map(s => ({
          id: s.id,
          name_uz: s.nameUz,
          name_ru: s.nameRu,
          name_en: s.nameEn,
          color_code: s.colorCode,
          sort_order: s.sortOrder
        }));
        setStages(mapped);
      } catch (err) {
        console.error("Failed to load item stages:", err);
      }
    };
    loadStages();
  }, []);

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!newStage.name_uz || !newStage.name_ru || !newStage.name_en) return;

    try {
      const saved = await api.createItemStage({
        name_uz: newStage.name_uz,
        name_ru: newStage.name_ru,
        name_en: newStage.name_en,
        color_code: newStage.color_code
      });

      const mapped = {
        id: saved.id,
        name_uz: saved.nameUz,
        name_ru: saved.nameRu,
        name_en: saved.nameEn,
        color_code: saved.colorCode,
        sort_order: saved.sortOrder
      };

      setStages(prev => [...prev, mapped]);
      setNewStage({ name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6' });
    } catch (err) {
      console.error("Failed to create item stage:", err);
    }
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!editingStage.name_uz || !editingStage.name_ru || !editingStage.name_en) return;

    try {
      const saved = await api.updateItemStageDefinition(editingStage.id, {
        name_uz: editingStage.name_uz,
        name_ru: editingStage.name_ru,
        name_en: editingStage.name_en,
        color_code: editingStage.color_code
      });

      const mapped = {
        id: saved.id,
        name_uz: saved.nameUz,
        name_ru: saved.nameRu,
        name_en: saved.nameEn,
        color_code: saved.colorCode,
        sort_order: saved.sortOrder
      };

      setStages(prev => prev.map(s => s.id === editingStage.id ? mapped : s));
      setEditingStage(null);
    } catch (err) {
      console.error("Failed to update item stage:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog("Haqiqatan ham ushbu bosqichni o'chirib yubormoqchimisiz?"))) return;

    try {
      await api.deleteItemStage(id);
      setStages(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete item stage:", err);
      showToast(err.message || "Bosqichni o'chirishda xatolik yuz berdi.");
    }
  };

  const moveStage = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...stages];

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((s, idx) => ({ ...s, sort_order: idx + 1 }));
    setStages(reordered);

    try {
      await api.reorderItemStages(reordered.map(s => s.id));
    } catch (err) {
      console.error("Failed to save reordered item stages:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.item_stages_title')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          {t('settings_page.item_stages_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Card (Add/Edit Stage) */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            {editingStage ? (
              <>
                <Edit3 className="w-4 h-4 text-indigo-500" /> Tahrirlash: {editingStage.name_uz}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.new_item_stage')}
              </>
            )}
          </h4>
          <form onSubmit={editingStage ? handleUpdateStage : handleAddStage} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_uz')}</label>
              <input
                type="text"
                value={editingStage ? editingStage.name_uz : newStage.name_uz}
                onChange={(e) => editingStage
                  ? setEditingStage({ ...editingStage, name_uz: e.target.value })
                  : setNewStage({ ...newStage, name_uz: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_ru')}</label>
              <input
                type="text"
                value={editingStage ? editingStage.name_ru : newStage.name_ru}
                onChange={(e) => editingStage
                  ? setEditingStage({ ...editingStage, name_ru: e.target.value })
                  : setNewStage({ ...newStage, name_ru: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.name_en')}</label>
              <input
                type="text"
                value={editingStage ? editingStage.name_en : newStage.name_en}
                onChange={(e) => editingStage
                  ? setEditingStage({ ...editingStage, name_en: e.target.value })
                  : setNewStage({ ...newStage, name_en: e.target.value })
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
                  value={editingStage ? editingStage.color_code : newStage.color_code}
                  onChange={(e) => editingStage
                    ? setEditingStage({ ...editingStage, color_code: e.target.value })
                    : setNewStage({ ...newStage, color_code: e.target.value })
                  }
                  className="w-10 h-8 border border-slate-200 dark:border-white/10 rounded-lg cursor-pointer bg-transparent"
                />
                <span className="text-slate-700 dark:text-gray-300 font-mono text-xs">
                  {editingStage ? editingStage.color_code : newStage.color_code}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingStage ? t('common.save') : t('common.add')}
              </button>
              {editingStage && (
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Stages List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">{t('settings_page.item_stage_sequence')}</h4>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-white/2 border border-slate-200/50 dark:border-white/5 p-4 rounded-xl hover:border-slate-300 dark:hover:border-white/10 transition duration-200"
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{ backgroundColor: stage.color_code }}
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                  />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{stage.name_uz}</h4>
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wide">
                      {stage.name_ru} / {stage.name_en}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => moveStage(index, 'up')}
                    className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveStage(index, 'down')}
                    className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setEditingStage(stage)}
                    className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 ml-2 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {stages.length === 0 && (
              <div className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
                Bosqichlar mavjud emas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemStages;
