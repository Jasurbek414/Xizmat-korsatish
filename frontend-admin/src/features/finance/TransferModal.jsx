import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const TransferModal = ({ isOpen, onClose, wallets, onTransfer }) => {
  const { t, i18n } = useTranslation();
  const [fromWallet, setFromWallet] = useState(wallets[0]?.id || '');
  const [toWallet, setToWallet] = useState(wallets[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (fromWallet === toWallet) {
      setError(t('finance_page.same_wallet_error') || 'Ikkala hisob bir xil bo\'lmasligi kerak');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError(t('finance_page.invalid_amount') || 'Noto\'g\'ri summa kiritildi');
      return;
    }

    const source = wallets.find(w => w.id === fromWallet);
    if (source && source.balance < numericAmount) {
      setError((t('finance_page.insufficient_funds') || 'Hisobda yetarli mablag\' mavjud emas! Joriy balans: ') + formatCurrency(source.balance, i18n.language));
      return;
    }

    onTransfer(fromWallet, toWallet, numericAmount);
    setAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 text-xs font-semibold">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">
              {t('finance_page.transfer')}
            </h3>
          </div>
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

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.from_wallet')}</label>
            <select 
              value={fromWallet} 
              onChange={(e) => setFromWallet(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {wallets.map(w => {
                const wName = i18n.language === 'uz' ? w.name_uz : i18n.language === 'ru' ? w.name_ru : w.name_en;
                return (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827]">
                    {wName} ({formatCurrency(w.balance, i18n.language)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.to_wallet')}</label>
            <select 
              value={toWallet} 
              onChange={(e) => setToWallet(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {wallets.map(w => {
                const wName = i18n.language === 'uz' ? w.name_uz : i18n.language === 'ru' ? w.name_ru : w.name_en;
                return (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827]">
                    {wName} ({formatCurrency(w.balance, i18n.language)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('finance_page.amount')} (UZS)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Masalan: 500000"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
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
              {t('finance_page.transfer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;
