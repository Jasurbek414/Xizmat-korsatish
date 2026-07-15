import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const CreateTxModal = ({ isOpen, onClose, newTx, setNewTx, onSubmit, wallets }) => {
  const { t, i18n } = useTranslation();

  // Set default wallet if not set
  useEffect(() => {
    if (isOpen && wallets && wallets.length > 0 && !newTx.wallet_id) {
      setNewTx(prev => ({ ...prev, wallet_id: wallets[0].id }));
    }
  }, [isOpen, wallets]);

  // Adjust categories when type changes
  const handleTypeChange = (type) => {
    const defaultCategory = type === 'INCOME' ? 'ORDER_PAYMENT' : 'OFFICE_EXPENSE';
    setNewTx(prev => ({
      ...prev,
      type,
      category: defaultCategory
    }));
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
