import React from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../utils/format';

const FinanceTable = ({ filteredTx, wallets, onDeleteTx }) => {
  const { t, i18n } = useTranslation();

  const getWalletName = (walletId) => {
    if (!walletId) return 'Kassa';
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return walletId;
    return i18n.language === 'uz' ? wallet.name_uz : i18n.language === 'ru' ? wallet.name_ru : wallet.name_en;
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent border border-slate-200 dark:border-white/5 text-xs font-semibold">
      <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent flex justify-between items-center">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">{t('finance_page.tx_history')}</h4>
        <span className="text-[10px] text-slate-400 font-bold">Jami: {filteredTx.length} ta tranzaksiya</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">{t('finance_page.type')}</th>
              <th className="p-4">{t('finance_page.description')}</th>
              <th className="p-4">To'lov usuli</th>
              <th className="p-4">{t('finance_page.category')}</th>
              <th className="p-4">{t('finance_page.date')}</th>
              <th className="p-4 text-right">{t('finance_page.amount')}</th>
              <th className="p-4 text-right">Harakatlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Tranzaksiyalar topilmadi
                </td>
              </tr>
            ) : (
              filteredTx.slice().reverse().map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                  {/* Type */}
                  <td className="p-4">
                    {tx.type === 'INCOME' ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <ArrowUpRight className="w-4 h-4" /> Kirim
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                        <ArrowDownRight className="w-4 h-4" /> Chiqim
                      </span>
                    )}
                  </td>
                  
                  {/* Description */}
                  <td className="p-4 font-semibold text-slate-800 dark:text-white">{tx.description}</td>
                  
                  {/* Wallet */}
                  <td className="p-4">
                    <span className="text-slate-500 dark:text-gray-400 font-medium">
                      {getWalletName(tx.wallet_id)}
                    </span>
                  </td>
                  
                  {/* Category */}
                  <td className="p-4">
                    <span className="bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-lg text-[9px] text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 font-bold uppercase tracking-wide">
                      {tx.category}
                    </span>
                  </td>
                  
                  {/* Date */}
                  <td className="p-4 text-slate-500 dark:text-gray-400 font-['Outfit']">
                    {formatDate(tx.created_at, i18n.language)}
                  </td>
                  
                  {/* Amount */}
                  <td className={`p-4 text-right font-extrabold font-['Outfit'] ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, i18n.language)}
                  </td>
                  
                  {/* Delete / Actions */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onDeleteTx(tx.id)}
                      title="Tranzaksiyani bekor qilish"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition cursor-pointer inline-flex items-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceTable;
