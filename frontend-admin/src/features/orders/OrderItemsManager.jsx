import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Ruler, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { showToast } from '../../services/toast';

const CARPET_TYPES = [
  'Standart gilam',
  'Jun gilam (yungi baland)',
  'Eron / Ipak gilam',
  'Shaggy / Qalin gilam',
  'Sintetik gilam',
  'Pled / Adyol',
  'Turk gilam',
  'Xitoy gilam',
  'Oval gilam'
];

const ITEM_STATUSES = [
  { key: 'ACCEPTED', label: 'Qabul qilindi', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { key: 'WASHED', label: 'Yuvildi', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { key: 'DRIED', label: 'Quritildi', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { key: 'READY', label: 'Tayyor', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
];

const OrderItemsManager = ({ order, onOrderUpdated }) => {
  const [items, setItems] = useState(order.items || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default unit price from service or 18000
  const defaultUnitPrice = Number(order.service?.price || 18000) || 18000;

  // New item form state
  const [newItem, setNewItem] = useState({
    name: 'Standart gilam',
    length: '',
    width: '',
    unitPrice: defaultUnitPrice,
    quantity: 1,
    status: 'ACCEPTED'
  });

  // Edit item form state
  const [editItem, setEditItem] = useState({
    name: '',
    length: '',
    width: '',
    price: '',
    status: 'ACCEPTED'
  });

  const calculateArea = (len, wid) => {
    const l = parseFloat(len) || 0;
    const w = parseFloat(wid) || 0;
    return (l * w).toFixed(2);
  };

  const calculateItemPrice = (len, wid, uPrice) => {
    const area = parseFloat(calculateArea(len, wid));
    const up = parseFloat(uPrice) || 0;
    return Math.round(area * up);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const len = parseFloat(newItem.length) || 0;
    const wid = parseFloat(newItem.width) || 0;
    const computedPrice = calculateItemPrice(len, wid, newItem.unitPrice);

    setLoading(true);
    try {
      const payload = {
        name: newItem.name,
        length: len,
        width: wid,
        quantity: 1,
        price: computedPrice > 0 ? computedPrice : null,
        status: newItem.status
      };

      await api.addOrderItem(order.id, payload);
      showToast("Gilam muvaffaqiyatli qo'shildi", 'success');
      setIsAdding(false);
      setNewItem({
        name: 'Standart gilam',
        length: '',
        width: '',
        unitPrice: defaultUnitPrice,
        quantity: 1,
        status: 'ACCEPTED'
      });

      if (onOrderUpdated) await onOrderUpdated();
    } catch (err) {
      showToast(err.message || "Gilam qo'shishda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    const area = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
    const uPrice = area > 0 && item.price ? Math.round(item.price / area) : defaultUnitPrice;

    setEditItem({
      name: item.name || 'Standart gilam',
      length: item.length || '',
      width: item.width || '',
      unitPrice: uPrice,
      price: item.price || '',
      status: item.status || 'ACCEPTED'
    });
  };

  const handleSaveEdit = async (itemId) => {
    setLoading(true);
    try {
      const len = parseFloat(editItem.length) || 0;
      const wid = parseFloat(editItem.width) || 0;
      const computedPrice = calculateItemPrice(len, wid, editItem.unitPrice);

      const payload = {
        name: editItem.name,
        length: len,
        width: wid,
        price: computedPrice > 0 ? computedPrice : null,
        status: editItem.status
      };

      await api.updateOrderItem(order.id, itemId, payload);
      showToast("Gilam ma'lumotlari yangilandi", 'success');
      setEditingItemId(null);
      if (onOrderUpdated) await onOrderUpdated();
    } catch (err) {
      showToast(err.message || 'Tahrirlashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Haqiqatan ham bu gilamni o'chirmoqchimisiz?")) return;
    setLoading(true);
    try {
      await api.deleteOrderItem(order.id, itemId);
      showToast("Gilam o'chirildi", 'success');
      if (onOrderUpdated) await onOrderUpdated();
    } catch (err) {
      showToast(err.message || "O'chirishda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (itemId, currentStatus) => {
    const currentIndex = ITEM_STATUSES.findIndex(s => s.key === currentStatus);
    const nextStatus = ITEM_STATUSES[(currentIndex + 1) % ITEM_STATUSES.length].key;

    setLoading(true);
    try {
      await api.updateOrderItem(order.id, itemId, { status: nextStatus });
      if (onOrderUpdated) await onOrderUpdated();
    } catch (err) {
      showToast(err.message || 'Statusni yangilashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalArea = (order.items || []).reduce((sum, item) => {
    const a = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
    return sum + a;
  }, 0).toFixed(2);

  const totalSum = (order.items || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header and Summary stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-white/2 p-3.5 rounded-xl border border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-gray-400">Jami gilamlar:</span>
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
              {(order.items || []).length} dona
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-gray-400">Umumiy yuzi:</span>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
              {totalArea} m²
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-gray-400">Gilamlar summasi:</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              {totalSum.toLocaleString()} UZS
            </span>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Gilam qo'shish
          </button>
        )}
      </div>

      {/* Add New Carpet Form */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-500/10">
            <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yangi gilam o'lchovini kiritish
            </h5>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">Gilam turi</label>
              <select
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white focus:outline-none"
              >
                {CARPET_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">Bo'yi (metr)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                placeholder="Masalan: 3.0"
                value={newItem.length}
                onChange={(e) => setNewItem({ ...newItem, length: e.target.value })}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">Eni (metr)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                placeholder="Masalan: 2.0"
                value={newItem.width}
                onChange={(e) => setNewItem({ ...newItem, width: e.target.value })}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">1 m² narxi (UZS)</label>
              <input
                type="number"
                step="1000"
                min="0"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                className="w-full text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Calculation Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-500/10">
            <div className="text-xs font-medium text-slate-600 dark:text-gray-300">
              O'lcham: <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{calculateArea(newItem.length, newItem.width)} m²</span>
              {' '} | Narxi: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{calculateItemPrice(newItem.length, newItem.width, newItem.unitPrice).toLocaleString()} UZS</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saqlanmoqda...' : "Qo'shish"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Carpet List Table */}
      {(order.items || []).length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
          <Ruler className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Hozircha gilamlar o'lchovi kiritilmagan</p>
          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Sex xodimi yoki operator gilam bo'yi va enini kiritgach summa hisoblanadi</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Gilam Turi</th>
                <th className="py-2.5 px-3">O'lchami (Bo'yi x Eni)</th>
                <th className="py-2.5 px-3">Maydoni</th>
                <th className="py-2.5 px-3">Narxi</th>
                <th className="py-2.5 px-3 text-center">Holati</th>
                <th className="py-2.5 px-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {(order.items || []).map((item, idx) => {
                const isEditing = editingItemId === item.id;
                const area = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
                const stObj = ITEM_STATUSES.find(s => s.key === item.status) || ITEM_STATUSES[0];

                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-indigo-50/30 dark:bg-indigo-950/20">
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={editItem.name}
                          onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                          className="w-full text-xs px-2 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
                        >
                          {CARPET_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            placeholder="Bo'yi"
                            value={editItem.length}
                            onChange={(e) => setEditItem({ ...editItem, length: e.target.value })}
                            className="w-16 px-1.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
                          />
                          <span className="text-slate-400">x</span>
                          <input
                            type="number"
                            step="0.05"
                            placeholder="Eni"
                            value={editItem.width}
                            onChange={(e) => setEditItem({ ...editItem, width: e.target.value })}
                            className="w-16 px-1.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
                          />
                          <span className="text-[10px] text-slate-400">m</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {calculateArea(editItem.length, editItem.width)} m²
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="1000"
                          placeholder="1m² narxi"
                          value={editItem.unitPrice}
                          onChange={(e) => setEditItem({ ...editItem, unitPrice: e.target.value })}
                          className="w-24 px-1.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={editItem.status}
                          onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                          className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
                        >
                          {ITEM_STATUSES.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            title="Saqlash"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-300 cursor-pointer"
                            title="Bekor qilish"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px] font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                      {item.name || 'Gilam'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-gray-300 font-semibold">
                      {item.length && item.width ? `${item.length}m × ${item.width}m` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {area > 0 ? `${area.toFixed(2)} m²` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {item.price ? `${Number(item.price).toLocaleString()} UZS` : '0 UZS'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(item.id, item.status)}
                        title="Statusni keyingisiga o'tkazish"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition hover:opacity-80 cursor-pointer ${stObj.color}`}
                      >
                        {stObj.label}
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderItemsManager;
