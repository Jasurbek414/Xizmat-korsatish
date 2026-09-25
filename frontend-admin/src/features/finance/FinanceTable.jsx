import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { CATEGORY_LABELS } from './CreateTxModal';
import OrderItemsBreakdownTable from '../orders/OrderItemsBreakdownTable';

const PAGE_SIZE = 20;

const FinanceTable = ({ filteredTx, wallets, onDeleteTx }) => {
  const { t, i18n } = useTranslation();
  const [selectedTx, setSelectedTx] = useState(null);
  const [page, setPage] = useState(1);

  // Ro'yxat eng yangisi tepada bo'lishi kerak (filteredTx backenddan eski->yangi
  // tartibda keladi) - sahifalash shu tartiblangan ro'yxat ustida ishlaydi.
  const sortedTx = useMemo(() => filteredTx.slice().reverse(), [filteredTx]);
  const totalPages = Math.max(1, Math.ceil(sortedTx.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // Filtr natijasi o'zgarsa (qidiruv/tur/davr almashsa) 1-sahifaga qaytish -
  // aks holda foydalanuvchi 3-sahifada turib filtr o'zgartirsa, bo'sh yoki
  // chalkash natija ko'rishi mumkin edi.
  useEffect(() => {
    setPage(1);
  }, [sortedTx.length]);

  const pageTx = sortedTx.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const getWalletName = (walletId) => {
    if (!walletId) return 'Kassa';
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return walletId;
    return i18n.language === 'uz' ? wallet.name_uz : i18n.language === 'ru' ? wallet.name_ru : wallet.name_en;
  };

  return (
    <>
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
              <th className="p-4">Kategoriya</th>
              <th className="p-4">{t('finance_page.description')}</th>
              <th className="p-4">{t('finance_page.date')}</th>
              <th className="p-4 text-right">{t('finance_page.amount')}</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Tranzaksiyalar topilmadi
                </td>
              </tr>
            ) : (
              pageTx.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                >
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

                  {/* Category */}
                  <td className="p-4 text-slate-500 dark:text-gray-400">
                    {CATEGORY_LABELS[tx.category] || tx.category}
                  </td>

                  {/* Description */}
                  <td className="p-4 font-semibold text-slate-800 dark:text-white max-w-[220px] truncate">{tx.description}</td>

                  {/* Date */}
                  <td className="p-4 text-slate-500 dark:text-gray-400 font-['Outfit']">
                    {formatDate(tx.created_at, i18n.language)}
                  </td>

                  {/* Amount */}
                  <td className={`p-4 text-right font-extrabold font-['Outfit'] ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, i18n.language)}
                  </td>

                  {/* Delete */}
                  <td className="p-4 text-right">
                    {onDeleteTx && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTx(tx.id); }}
                        title="O'chirish"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sahifalash */}
      {sortedTx.length > PAGE_SIZE && (
        <div className="p-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">
            {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, sortedTx.length)} / {sortedTx.length} ta
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold px-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Tranzaksiyaning to'liq tafsiloti - qatorga bosilganda ochiladigan modal.
        Qo'lda kiritilgan kirim/chiqimlarda tx.order yo'q (faqat asosiy
        maydonlar ko'rsatiladi), ORDER_PAYMENT tranzaksiyalarida esa
        bog'liq buyurtma (mijoz, xizmat, gilamlar) ham ko'rsatiladi.
        MUHIM: bu modal glass-card konteyneridan TASHQARIDA (Fragment
        sibling) render qilinadi - .dark .glass-card'dagi backdrop-filter
        (va :hover'dagi transform) position:fixed uchun yangi "containing
        block" hosil qilib, modalni ota elementning overflow-hidden
        chegarasi ICHIGA "qamab" qo'yar edi (ekranga emas, kichik karta
        ichiga joylashib, kesilib qolardi) - shu sabab "to'liq ma'lumotlar
        ko'rinmayapti" degan xato kelib chiqqan edi. */}
    {selectedTx && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTx(null)}>
          <div
            className="glass-card rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 text-xs font-semibold flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">Tranzaksiya tafsiloti</h3>
                <p className="text-[9px] text-slate-400 font-mono">
                  № {selectedTx.id ? selectedTx.id.slice(0, 8).toUpperCase() : "Noma'lum"}
                </p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-white/2 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Turi</p>
                  {selectedTx.type === 'INCOME' ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><ArrowUpRight className="w-3.5 h-3.5" /> Kirim</span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold"><ArrowDownRight className="w-3.5 h-3.5" /> Chiqim</span>
                  )}
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Kategoriya</p>
                  <p className="text-slate-800 dark:text-white font-bold">{CATEGORY_LABELS[selectedTx.category] || selectedTx.category}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Sana / vaqt</p>
                <p className="text-slate-700 dark:text-gray-300 font-mono">{formatDateTime(selectedTx.created_at, i18n.language)}</p>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Izoh / sabab</p>
                <p className="text-slate-700 dark:text-gray-300">{selectedTx.description || "Izoh kiritilmagan"}</p>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Kassa</p>
                <p className="text-slate-700 dark:text-gray-300">{getWalletName(selectedTx.wallet_id)}</p>
              </div>

              {selectedTx.payment_method && (
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">To'lov usuli</p>
                  <span className={`inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded ${
                    selectedTx.payment_method === 'CARD' ? 'bg-blue-500/10 text-blue-600' :
                    selectedTx.payment_method === 'MIXED' ? 'bg-purple-500/10 text-purple-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {selectedTx.payment_method === 'CARD' ? 'KARTA' : selectedTx.payment_method === 'MIXED' ? 'ARALASH' : 'NAQD'}
                  </span>
                  {selectedTx.payment_method === 'MIXED' && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-white/2 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 mt-1.5">
                      <div>
                        <p className="text-slate-400">Naqd qismi</p>
                        <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedTx.cash_amount, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Karta qismi</p>
                        <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedTx.card_amount, i18n.language)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bog'liq buyurtma - faqat ORDER_PAYMENT tranzaksiyalarida mavjud */}
              {selectedTx.order && (
                <div className="space-y-2 pt-1 border-t border-dashed border-slate-200 dark:border-white/5">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Bog'liq buyurtma</p>
                  <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                    <div>
                      <p className="text-slate-400">Buyurtma №</p>
                      <p className="font-mono font-bold text-slate-700 dark:text-gray-300">
                        {selectedTx.order.id ? selectedTx.order.id.slice(0, 8).toUpperCase() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Mijoz</p>
                      <p className="font-bold text-slate-700 dark:text-gray-300">
                        {selectedTx.order.client ? selectedTx.order.client.fullName : "Noma'lum"}
                      </p>
                    </div>
                  </div>
                  {selectedTx.order.items && selectedTx.order.items.length > 0 && (
                    <OrderItemsBreakdownTable items={selectedTx.order.items} />
                  )}
                </div>
              )}

              <div className="flex justify-between items-center bg-slate-50 dark:bg-white/2 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="font-extrabold uppercase text-[9px] tracking-wide text-slate-500 dark:text-gray-400">Summa</span>
                <span className={`font-black text-sm font-['Outfit'] ${selectedTx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {selectedTx.type === 'INCOME' ? '+' : '-'}{formatCurrency(selectedTx.amount, i18n.language)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              {onDeleteTx && (
                <button
                  onClick={async () => {
                    // onDeleteTx ICHIDA tasdiqlash oynasi (confirmDialog)
                    // chiqadi - foydalanuvchi "Bekor qilish" desa (false
                    // qaytadi) tafsilot modali OCHIQ qolishi kerak, faqat
                    // haqiqatan o'chirilganda yopiladi.
                    const deleted = await onDeleteTx(selectedTx.id);
                    if (deleted) setSelectedTx(null);
                  }}
                  className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> O'chirish
                </button>
              )}
              <button
                onClick={() => setSelectedTx(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinanceTable;
