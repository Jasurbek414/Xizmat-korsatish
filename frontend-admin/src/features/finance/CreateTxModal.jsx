import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const INCOME_CATEGORIES = ['ORDER_PAYMENT', 'DEBT_PAYMENT', 'TRANSFER'];
const EXPENSE_CATEGORIES = ['SALARY', 'OFFICE_EXPENSE', 'TAX', 'DEBT_PAYMENT', 'TRANSFER'];

export const CATEGORY_LABELS = {
  ORDER_PAYMENT: "Buyurtma to'lovi",
  DEBT_PAYMENT: "Qarz to'lovi",
  TRANSFER: "O'tkazma",
  SALARY: 'Ish haqi',
  OFFICE_EXPENSE: 'Ofis xarajati',
  TAX: 'Soliq',
};

const CreateTxModal = ({ isOpen, onClose, newTx, setNewTx, onSubmit, wallets, customCategories = { expense: [], income: [] }, onAddCategory }) => {
  const { t, i18n } = useTranslation();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Set default wallet if not set
  useEffect(() => {
    if (isOpen && wallets && wallets.length > 0 && !newTx.wallet_id) {
      setNewTx(prev => ({ ...prev, wallet_id: wallets[0].id }));
    }
  }, [isOpen, wallets]);

  // Sana kiritilmagan bo'lsa bugungi kunni standart qilib qo'yish
  useEffect(() => {
    if (isOpen && !newTx.date) {
      setNewTx(prev => ({ ...prev, date: new Date().toISOString().slice(0, 10) }));
    }
  }, [isOpen]);

  // Oyna qayta ochilganda "yangi kategoriya" mini-formasi tozalansin
  useEffect(() => {
    if (isOpen) {
      setAddingCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  // Adjust categories when type changes
  const handleTypeChange = (type) => {
    const defaultCategory = type === 'INCOME' ? 'ORDER_PAYMENT' : 'OFFICE_EXPENSE';
    setNewTx(prev => ({
      ...prev,
      type,
      category: defaultCategory
    }));
  };

  const baseCategories = newTx.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const extraCategories = (newTx.type === 'INCOME' ? customCategories.income : customCategories.expense) || [];
  const categoryOptions = [...baseCategories, ...extraCategories.filter(c => !baseCategories.includes(c))];

  const handleConfirmNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !onAddCategory) return;
    const added = await onAddCategory(newTx.type, name);
    if (added) {
      setNewTx(prev => ({ ...prev, category: added }));
    }
    setNewCategoryName('');
    setAddingCategory(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 font-semibold text-xs">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">{t('finance_page.new_tx')}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Type Toggle */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.type')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={() => handleTypeChange('INCOME')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  newTx.type === 'INCOME' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Kirim
              </button>
              <button 
                type="button" 
                onClick={() => handleTypeChange('EXPENSE')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  newTx.type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Chiqim
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.amount')} (UZS)</label>
            <input
              type="number"
              value={newTx.amount}
              onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none text-xs font-semibold"
              placeholder="Summani kiriting..."
              required
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Kategoriya</label>
              {addingCategory ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewCategory(); }
                      if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                    }}
                    placeholder="Kategoriya nomi"
                    className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    className="shrink-0 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                    title="Qo'shish"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}
                    className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                    title="Bekor qilish"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={newTx.category}
                    onChange={(e) => setNewTx({...newTx, category: e.target.value})}
                    className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none text-xs font-semibold cursor-pointer"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat} className="bg-white dark:bg-[#111827]">
                        {CATEGORY_LABELS[cat] || cat}
                      </option>
                    ))}
                  </select>
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      className="shrink-0 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                      title="Yangi kategoriya qo'shish"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Sana</label>
              <input
                type="date"
                value={newTx.date || ''}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none text-xs font-semibold"
              />
            </div>
          </div>

          {/* Rejalashtirilgan (hali amalga oshmagan) */}
          <label className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 cursor-pointer">
            <input
              type="checkbox"
              checked={newTx.status === 'PENDING'}
              onChange={(e) => setNewTx({...newTx, status: e.target.checked ? 'PENDING' : 'CONFIRMED'})}
              className="mt-0.5 cursor-pointer"
            />
            <span className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
              Bu hali amalga oshmagan / rejalashtirilgan {newTx.type === 'INCOME' ? 'kirim' : 'xarajat'} — pul hali {newTx.type === 'INCOME' ? 'kelib tushmagan' : 'sarflanmagan'}.
              Belgilansa, tasdiqlanmaguncha balansga qo'shilmaydi.
            </span>
          </label>

          {/* Description */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.description')}</label>
            <input 
              type="text" 
              value={newTx.description} 
              onChange={(e) => setNewTx({...newTx, description: e.target.value})}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>

          {/* Actions */}
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
              {t('common.save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateTxModal;
