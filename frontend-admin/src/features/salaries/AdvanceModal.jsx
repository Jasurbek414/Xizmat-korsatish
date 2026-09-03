import React, { useState, useEffect } from 'react';
import { X, PlusCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdvanceModal = ({ isOpen, onClose, salary, wallets, onSubmit }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState('DEDUCTION'); // DEDUCTION or BONUS
  const [type, setType] = useState('ADVANCE'); // ADVANCE/FINE (chegirish) yoki BONUS_ADD/BONUS_REMOVE (bonus)
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletId, setWalletId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && wallets && wallets.length > 0) {
      setWalletId(wallets[0].id);
    }
    if (isOpen) {
      setCategory('DEDUCTION');
      setType('ADVANCE');
    }
    setError('');
  }, [isOpen, wallets]);

  if (!isOpen || !salary) return null;

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    setType(nextCategory === 'BONUS' ? 'BONUS_ADD' : 'ADVANCE');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Iltimos, musbat summa kiriting");
      return;
    }

    if (type === 'ADVANCE') {
      const selectedWallet = wallets.find(w => w.id === walletId);
      if (selectedWallet && selectedWallet.balance < amt) {
        setError("Tanlangan hisobda yetarli mablag' mavjud emas! Joriy balans: " + selectedWallet.balance.toLocaleString() + " UZS");
        return;
      }
    }

    if (type === 'BONUS_REMOVE' && amt > salary.bonus) {
      setError("Olib tashlanadigan summa joriy bonusdan (" + salary.bonus.toLocaleString() + " UZS) katta bo'lishi mumkin emas");
      return;
    }

    if (type === 'DEDUCTION_REMOVE' && amt > salary.deductions) {
      setError("Qaytariladigan summa joriy chegirmadan (" + salary.deductions.toLocaleString() + " UZS) katta bo'lishi mumkin emas");
      return;
    }

    onSubmit(salary.id, type, amt, description, walletId);
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-xs font-semibold">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">
            {t('salaries_page.advance_fine_title')}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
              {error}
            </div>
          )}

          {/* Toggle Category: Deduction vs Bonus */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Kategoriya</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('DEDUCTION')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  category === 'DEDUCTION' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Chegirish
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('BONUS')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  category === 'BONUS' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Bonus
              </button>
            </div>
          </div>

          {/* Toggle Type */}
          {category === 'DEDUCTION' ? (
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Amal turi</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('ADVANCE')}
                  className={`py-2 rounded-xl font-bold transition cursor-pointer text-[10px] ${
                    type === 'ADVANCE' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {t('salaries_page.advance')}
                </button>
                <button
                  type="button"
                  onClick={() => setType('FINE')}
                  className={`py-2 rounded-xl font-bold transition cursor-pointer text-[10px] ${
                    type === 'FINE' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {t('salaries_page.fine')}
                </button>
                <button
                  type="button"
                  onClick={() => setType('DEDUCTION_REMOVE')}
                  className={`py-2 rounded-xl font-bold transition cursor-pointer text-[10px] ${
                    type === 'DEDUCTION_REMOVE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Xato - qaytarish
                </button>
              </div>
              {type === 'DEDUCTION_REMOVE' && (
                <p className="text-[9px] text-slate-400 mt-1 font-normal">Joriy chegirma: {(salary.deductions || 0).toLocaleString()} UZS</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Amal turi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('BONUS_ADD')}
                  className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                    type === 'BONUS_ADD' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Qo'shish
                </button>
                <button
                  type="button"
                  onClick={() => setType('BONUS_REMOVE')}
                  className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                    type === 'BONUS_REMOVE' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Olib tashlash
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-normal">Joriy bonus: {(salary.bonus || 0).toLocaleString()} UZS</p>
            </div>
          )}

          {/* Wallet selection (only for advance) */}
          {type === 'ADVANCE' && (
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">To'lov kassasi (Wallet)</label>
              <select 
                value={walletId} 
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer font-bold"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827]">
                    {w.name_uz || w.name_en} ({w.balance.toLocaleString()} UZS)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('salaries_page.amount_uzs')}</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              placeholder="Masalan: 100000"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.description')}</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              placeholder={t('salaries_page.desc_placeholder')}
              required
            />
          </div>

          {/* Worker Alert context */}
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {category === 'DEDUCTION'
                ? (type === 'DEDUCTION_REMOVE'
                    ? `Xato bilan berilgan avans/jarima ${salary.full_name}ning chegirmasidan olib tashlanadi va summa balansga qaytariladi.`
                    : `Ushbu summa ${salary.full_name}ning joriy oydagi maoshidan chegiriladi.`)
                : `Ushbu summa ${salary.full_name}ning joriy oydagi maoshiga ${type === 'BONUS_ADD' ? "qo'shiladi" : "bonusidan olib tashlanadi"}.`}
            </span>
          </div>

          {/* Footer Actions */}
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
              Tasdiqlash
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdvanceModal;
