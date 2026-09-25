import React from 'react';
import { ArrowDownRight, Clock, ShieldAlert, Users, Banknote, CreditCard, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const FinanceStats = ({ balance, dailyExpenses, expectedFunds, pendingHandoversSum = 0, pendingPayroll = 0, paymentBreakdown = { cash: 0, card: 0 } }) => {
  const { t, i18n } = useTranslation();

  // Kompaniya nazorati ostidagi HAQIQIY jami pul - kassadagi balans + hali
  // kuryerlarda (kassaga topshirilmagan) turgan naqd/karta summasi. Avval
  // egasi bu ikkisini QO'LDA qo'shishi kerak edi (ikkita alohida karta) -
  // "kompaniyaning umumiy pul aylanmasi qancha" degan eng birinchi savolga
  // to'g'ridan-to'g'ri javob beradigan yagona raqam yo'q edi.
  const totalControlled = balance + pendingHandoversSum;
  const totalTurnover = (paymentBreakdown.cash || 0) + (paymentBreakdown.card || 0);
  const cashPct = totalTurnover > 0 ? (paymentBreakdown.cash / totalTurnover) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Hero: kompaniyaning UMUMIY pul holati - eng yuqorida, eng katta va
          ajralib turadigan joyda, ichida uch komponentga bo'lib ko'rsatiladi
          (jami/kassada/kuryerlarda). Bu "bitta qarashda hammasi ayon"
          tamoyili - egasi boshqa hech narsani hisoblab o'tirmasligi kerak. */}
      <div className="glass-card p-6 rounded-2xl shadow-sm dark:shadow-none bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white overflow-hidden relative">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Umumiy Nazorat Ostidagi Mablag'
            </p>
            <h3 className="text-3xl font-extrabold font-['Outfit']">
              {formatCurrency(totalControlled, i18n.language)}
            </h3>
            <p className="text-[10px] text-indigo-200 mt-1">Kompaniyaga tegishli, hozirda qayerda turishidan qat'i nazar - jami mablag'</p>
          </div>

          <div className="flex gap-3 md:gap-4">
            <div className="bg-white/10 rounded-xl px-4 py-3 min-w-[140px]">
              <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-wide">Kassada</p>
              <p className="text-base font-extrabold font-['Outfit']">{formatCurrency(balance, i18n.language)}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 min-w-[140px]">
              <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1">
                <ShieldAlert className="w-2.5 h-2.5" /> Kuryerlarda
              </p>
              <p className="text-base font-extrabold font-['Outfit']">{formatCurrency(pendingHandoversSum, i18n.language)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ikkinchi qatlam - kunlik va kutilayotgan ko'rsatkichlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Kunlik Xarajatlar */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Kunlik Xarajatlar (Bugun)</p>
            <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-['Outfit']">
              -{formatCurrency(dailyExpenses, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Bugungi kunda qilingan chiqimlar yig'indisi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Kutilayotgan Mablag'lar */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Kutilayotgan Mablag'lar</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
              {formatCurrency(expectedFunds, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Faol buyurtmalarning umumiy summasi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Hisoblangan, lekin to'lanmagan ish haqi - avval Buxgalteriyada
            umuman ko'rinmasdi, faqat "Xodimlar maoshi" sahifasida bor edi. */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">To'lanmagan Ish Haqi</p>
            <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-['Outfit']">
              {formatCurrency(pendingPayroll, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Yaqinda to'lanishi kerak bo'lgan maosh majburiyati</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* To'lov usuli taqsimoti - naqd va karta BIR kartada, nisbat
            chizig'i bilan. Avval bu ikkita alohida kartaga bo'lingan edi -
            umumiy tushumga nisbatan qay darajada ekanini ko'rish uchun
            ikkalasini ham qo'lda solishtirish kerak edi. */}
        <div className="glass-card p-6 rounded-2xl shadow-sm dark:shadow-none bg-white dark:bg-[#111827]/80 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">To'lov Usuli Taqsimoti</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-3.5 h-3.5" /> {formatCurrency(paymentBreakdown.cash, i18n.language)}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(paymentBreakdown.card, i18n.language)} <CreditCard className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-blue-500/15 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${cashPct}%` }} />
          </div>
          <p className="text-[9px] text-slate-400 dark:text-gray-500">
            Naqd {cashPct.toFixed(0)}% · Karta {(100 - cashPct).toFixed(0)}% (kassaga topshirilgan tushumdan)
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceStats;
