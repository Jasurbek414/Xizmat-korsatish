import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { confirmDialog } from '../../services/confirmDialog';
import { showToast } from '../../services/toast';
import { Layers, Plus, Trash2, ArrowDown, ArrowUp, Edit3, X } from 'lucide-react';

// Gilam (buyurtma ichidagi har bir mahsulot) ishlov bosqichi - "Buyurtma
// statuslari" bilan BIR XIL erkin CRUD (qo'shish/tahrirlash/o'chirish/tartib
// almashtirish). Boshida (jonli tizimda) bu 4 ta QATTIQ bosqich edi -
// ACCEPTED/WASHED/DRIED/READY, faqat nom/rang tahrirlanardi - jonli so'rov
// bo'yicha admin o'zi bosqich qo'shishi/o'chirishi SHART bo'lib qoldi.
const mapLabel = (l) => ({
  id: l.id,
  itemKey: l.itemKey,
  name_uz: l.nameUz,
  name_ru: l.nameRu,
  name_en: l.nameEn,
  color_code: l.colorCode || '#3b82f6',
  sort_order: l.sortOrder,
  is_final: l.isFinal === true
});

const EMPTY_FORM = { name_uz: '', name_ru: '', name_en: '', color_code: '#3b82f6', is_final: false };

const ItemStatusLabels = () => {
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState(EMPTY_FORM);
  const [editingLabel, setEditingLabel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getItemStatuses();
        setLabels((data || []).map(mapLabel).sort((a, b) => a.sort_order - b.sort_order));
      } catch (err) {
        console.error('Failed to load item status labels:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.name_uz.trim() || !newLabel.name_ru.trim() || !newLabel.name_en.trim()) {
      showToast("Barcha tillarda nom kiritilishi shart");
      return;
    }
    try {
      const saved = await api.createItemStatusLabel({
        name_uz: newLabel.name_uz.trim(),
        name_ru: newLabel.name_ru.trim(),
        name_en: newLabel.name_en.trim(),
        color_code: newLabel.color_code,
        is_final: newLabel.is_final
      });
      setLabels(prev => [...prev, mapLabel(saved)]);
      setNewLabel(EMPTY_FORM);
      showToast('Bosqich qo\'shildi', 'success');
    } catch (err) {
      console.error('Failed to create item status label:', err);
      showToast(err.message || "Bosqichni qo'shishda xatolik yuz berdi.");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingLabel.name_uz.trim() || !editingLabel.name_ru.trim() || !editingLabel.name_en.trim()) {
      showToast("Barcha tillarda nom kiritilishi shart");
      return;
    }
    try {
      const saved = await api.updateItemStatusLabel(editingLabel.itemKey, {
        name_uz: editingLabel.name_uz.trim(),
        name_ru: editingLabel.name_ru.trim(),
        name_en: editingLabel.name_en.trim(),
        color_code: editingLabel.color_code,
        is_final: editingLabel.is_final
      });
      const mapped = mapLabel(saved);
      setLabels(prev => prev.map(l => l.itemKey === editingLabel.itemKey ? mapped : l));
      setEditingLabel(null);
      showToast('Bosqich saqlandi', 'success');
    } catch (err) {
      console.error('Failed to update item status label:', err);
      showToast(err.message || 'Saqlashda xatolik yuz berdi.');
    }
  };

  const handleDelete = async (label) => {
    if (!(await confirmDialog("Haqiqatan ham ushbu bosqichni o'chirib yubormoqchimisiz?"))) return;
    try {
      await api.deleteItemStatusLabel(label.itemKey);
      setLabels(prev => prev.filter(l => l.itemKey !== label.itemKey));
      showToast("Bosqich o'chirildi", 'success');
    } catch (err) {
      console.error('Failed to delete item status label:', err);
      showToast(err.message || "Bosqichni o'chirishda xatolik yuz berdi.");
    }
  };

  const moveLabel = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === labels.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...labels];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((l, idx) => ({ ...l, sort_order: idx + 1 }));
    setLabels(reordered);

    try {
      await api.reorderItemStatuses(reordered.map(l => l.id));
    } catch (err) {
      console.error('Failed to save reordered item statuses:', err);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
      <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
          <Layers className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">
            Gilam bosqichlari
          </h4>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5 max-w-xl leading-relaxed">
            Sex hodimi mobil ilovada har bir gilamni shu bosqichlar orqali o'tkazadi (bitta safar faqat qo'shni
            bosqichga o'tish mumkin). Bosqich qo'shish, o'chirish va tartibini o'zgartirish mumkin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        {/* Chap: qo'shish/tahrirlash formasi */}
        <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 p-4 space-y-3 h-fit">
          <h5 className="text-slate-800 dark:text-white font-bold text-[13px] flex items-center gap-2">
            {editingLabel ? (
              <><Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Tahrirlash</>
            ) : (
              <><Plus className="w-3.5 h-3.5 text-indigo-500" /> Yangi bosqich</>
            )}
          </h5>
          <form onSubmit={editingLabel ? handleUpdate : handleAdd} className="space-y-3">
            <input
              type="text"
              value={editingLabel ? editingLabel.name_uz : newLabel.name_uz}
              onChange={(e) => editingLabel
                ? setEditingLabel({ ...editingLabel, name_uz: e.target.value })
                : setNewLabel({ ...newLabel, name_uz: e.target.value })
              }
              placeholder="O'zbekcha"
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
            />
            <input
              type="text"
              value={editingLabel ? editingLabel.name_ru : newLabel.name_ru}
              onChange={(e) => editingLabel
                ? setEditingLabel({ ...editingLabel, name_ru: e.target.value })
                : setNewLabel({ ...newLabel, name_ru: e.target.value })
              }
              placeholder="Русский"
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
            />
            <input
              type="text"
              value={editingLabel ? editingLabel.name_en : newLabel.name_en}
              onChange={(e) => editingLabel
                ? setEditingLabel({ ...editingLabel, name_en: e.target.value })
                : setNewLabel({ ...newLabel, name_en: e.target.value })
              }
              placeholder="English"
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editingLabel ? editingLabel.color_code : newLabel.color_code}
                onChange={(e) => editingLabel
                  ? setEditingLabel({ ...editingLabel, color_code: e.target.value })
                  : setNewLabel({ ...newLabel, color_code: e.target.value })
                }
                className="w-9 h-8 border border-slate-200 dark:border-white/10 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                {editingLabel ? editingLabel.color_code : newLabel.color_code}
              </span>
            </div>

            {/* Yakunlovchi bosqich - gilam bu yerga yetsa "tayyor" hisoblanadi. */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingLabel ? editingLabel.is_final : newLabel.is_final}
                onChange={(e) => editingLabel
                  ? setEditingLabel({ ...editingLabel, is_final: e.target.checked })
                  : setNewLabel({ ...newLabel, is_final: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer"
              />
              <span>
                <span className="block text-slate-700 dark:text-gray-200">Yakunlovchi bosqich</span>
                <span className="block text-[10px] text-slate-400 dark:text-gray-500 font-medium leading-snug">
                  Gilam shu bosqichga yetsa "tayyor" hisoblanadi - buyurtmani
                  haydovchiga topshirish shu asosda ruxsat etiladi.
                </span>
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 premium-btn text-white font-bold py-2 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingLabel ? 'Saqlash' : "Qo'shish"}
              </button>
              {editingLabel && (
                <button
                  type="button"
                  onClick={() => setEditingLabel(null)}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* O'ng: bosqichlar ro'yxati */}
        <div className="lg:col-span-2 space-y-2">
          {labels.map((label, index) => (
            <div
              key={label.itemKey}
              className="flex items-center justify-between bg-slate-50 dark:bg-white/2 border border-slate-200/50 dark:border-white/5 p-3.5 rounded-xl hover:border-slate-300 dark:hover:border-white/10 transition duration-200"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: label.color_code }}
                >
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5 flex-wrap">
                    {label.name_uz}
                    {label.is_final && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                        Yakunlovchi
                      </span>
                    )}
                  </h4>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wide">
                    {label.name_ru} / {label.name_en}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => moveLabel(index, 'up')}
                  className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveLabel(index, 'down')}
                  className="p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingLabel(label)}
                  className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 ml-2 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(label)}
                  className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {labels.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
              Bosqichlar mavjud emas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemStatusLabels;
