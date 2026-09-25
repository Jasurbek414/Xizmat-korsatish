import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Printer, Landmark, TrendingUp, Scale, Percent, Banknote, CreditCard, ArrowUp, ArrowDown, Minus, Wrench, Users } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import PageLoader from '../components/PageLoader';
import CategoryBreakdown from './finance/CategoryBreakdown';
import { CATEGORY_LABELS } from './finance/CreateTxModal';
import MonthlyTrendChart from './finance/MonthlyTrendChart';
import RevenueBreakdownCard from './finance/RevenueBreakdownCard';

// Tanlangan davrga solishtirma sifatida oldingi davr - "bu oy o'tgan oyga
// nisbatan qanday" degan savolga javob berish uchun. Kompaniya egasi bitta
// raqamni emas, TENDENSIYANI ko'rishi kerak: 50 mln foyda o'zi hech narsa
// anglatmaydi, lekin "o'tgan oyga nisbatan +12%" - anglatadi.
//
// MUHIM: `isMonthMode=true` bo'lsa (foydalanuvchi oy tanlagichdan foydalanган,
// aniq sana oralig'i EMAS) - solishtirma ANIQ oldingi TAQVIM oyi (masalan
// mart uchun - fevral, u 28/29 kun bo'lsa ham). Avval bu har doim "bir xil
// UZUNLIKDAGI, bevosita oldingi kunlar oralig'i" edi (mart uchun 31 kun -
// demak 29-yanvar dan 28-fevralgacha) - texnik jihatdan izchil, lekin
// buxgalter "o'tgan OYga nisbatan" deganda albatta TAQVIM oyini
// (1-fevraldan 28-fevralgacha) nazarda tutadi, shu son emas. Faqat aniq
// (ixtiyoriy) sana oralig'i tanlanganda - uzunlik mos keladigan oldingi
// oraliq ishlatiladi, chunki bunda "oldingi oy" degan tushuncha yo'q.
const previousRange = (rangeStart, rangeEnd, isMonthMode) => {
  if (isMonthMode) {
    const [y, m] = rangeStart.split('-').map(Number);
    const prevMonthDate = new Date(y, m - 2, 1); // m - 1 = joriy oy (0-index), -1 yana = oldingi oy
    const prevY = prevMonthDate.getFullYear();
    const prevM = prevMonthDate.getMonth() + 1;
    const lastDay = new Date(prevY, prevM, 0).getDate();
    return {
      prevStart: `${prevY}-${String(prevM).padStart(2, '0')}-01`,
      prevEnd: `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  }

  const start = new Date(rangeStart + 'T00:00:00');
  const end = new Date(rangeEnd + 'T00:00:00');
  const lengthMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return {
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10)
  };
};

// Alohida "Hisobotlar" menyusi - avval Buxgalteriya ichidagi "PL" tab (bir xil
// ma'lumot) faqat butun-oy kesimida ishlardi, istalgan sana oralig'ini
// tanlab bo'lmasdi. Bu sahifa xuddi shu backend endpointlaridan (GET
// /finance/transactions, /finance/salaries, /finance/debts) foydalanadi -
// yangi backend endpoint kerak emas, faqat client tomonda tanlangan
// oy/sana oralig'iga cheklab hisoblanadi.
const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sana boshqaruvi: standart - joriy oy. Ixtiyoriy aniq oraliq tanlansa,
  // oy tanlagichdan ustun turadi.
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    (async () => {
      try {
        // MUHIM: bu sahifa yon panelda "finance" huquqi bilan ochiladi, lekin
        // getSalaries() "salaries" huquqini talab qiladi - Dispetcherda
        // finance bor, salaries yo'q. .catch bilan o'ralmasa, sahifa
        // ko'rinib turib ochilganda butunlay bo'sh chiqardi.
        const [txsData, debtsData, salariesData] = await Promise.all([
          api.getTransactions(),
          api.getDebts(),
          api.getSalaries({ silent403: true }).catch(() => [])
        ]);
        setTransactions(txsData.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description || '',
          created_at: t.createdAt || t.created_at,
          payment_method: t.paymentMethod || null,
          cash_amount: t.cashAmount || 0,
          card_amount: t.cardAmount || 0,
          created_by_name: t.createdByName || '',
          // Faqat ORDER_PAYMENT tranzaksiyalarida to'ldirilgan - xizmat va
          // xodim (haydovchi) bo'yicha daromad taqsimoti shundan hisoblanadi.
          order: t.order || null
        })));
        setDebts(debtsData);
        setSalaries(salariesData);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (customRange.start && customRange.end) {
      return { rangeStart: customRange.start, rangeEnd: customRange.end };
    }
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      rangeStart: `${month}-01`,
      rangeEnd: `${month}-${String(lastDay).padStart(2, '0')}`
    };
  }, [month, customRange]);

  const periodTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.created_at) return false;
      const d = t.created_at.slice(0, 10);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [transactions, rangeStart, rangeEnd]);

  const computeStats = (txs) => {
    const actualTx = txs.filter(t => t.category !== 'TRANSFER');
    const revenue = actualTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = actualTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const net = revenue - expense;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    return { revenue, expense, net, margin };
  };

  const stats = useMemo(() => computeStats(periodTx), [periodTx]);

  // Aniq sana oralig'i tanlanmagan bo'lsa - oy tanlagichdan foydalanilyapti,
  // demak solishtirma ANIQ oldingi taqvim oyi bo'lishi kerak.
  const isMonthMode = !(customRange.start && customRange.end);

  // Oldingi davr bilan solishtirish - tendensiyani ko'rsatish uchun.
  const { prevStart, prevEnd } = useMemo(
    () => previousRange(rangeStart, rangeEnd, isMonthMode),
    [rangeStart, rangeEnd, isMonthMode]
  );
  const previousPeriodTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.created_at) return false;
      const d = t.created_at.slice(0, 10);
      return d >= prevStart && d <= prevEnd;
    });
  }, [transactions, prevStart, prevEnd]);
  const prevStats = useMemo(() => computeStats(previousPeriodTx), [previousPeriodTx]);

  // Foiz o'zgarish - oldingi davr 0 bo'lsa (solishtirish uchun ma'lumot
  // yo'q) ko'rsatilmaydi, chalg'ituvchi "cheksiz %" o'rniga.
  const growthOf = (current, previous) => {
    if (previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };
  const revenueGrowth = growthOf(stats.revenue, prevStats.revenue);
  const expenseGrowth = growthOf(stats.expense, prevStats.expense);
  const netGrowth = growthOf(stats.net, prevStats.net);

  // Marja - o'zi allaqachon foiz bo'lgani uchun o'zgarishi NISBIY foizda
  // emas, FOIZ PUNKTIDA (percentage points) ko'rsatiladi - masalan marja
  // 20%'dan 25%'ga o'tsa "+5 p.p." to'g'ri, "+25%" (nisbiy o'sish) esa
  // chalkashtiradi.
  const marginDeltaPp = stats.margin - prevStats.margin;

  // To'lov usuli (naqd/karta) taqsimoti - faqat ORDER_PAYMENT kirimlari
  // (qo'lda kiritilgan boshqa kirim/chiqimlarda bu maydon bo'sh).
  const paymentSplit = useMemo(() => {
    const orderPayments = periodTx.filter(t => t.type === 'INCOME' && t.category === 'ORDER_PAYMENT');
    const cash = orderPayments.reduce((s, t) => s + (t.cash_amount || 0), 0);
    const card = orderPayments.reduce((s, t) => s + (t.card_amount || 0), 0);
    return { cash, card };
  }, [periodTx]);

  // Xizmat turlari bo'yicha daromad taqsimoti (tanlangan davr) - "qaysi
  // xizmat eng ko'p daromad keltiryapti" degan savolga javob. Transaction
  // allaqachon bog'liq Order'ni (va uning xizmatini) o'zida olib yuradi -
  // yangi so'rov kerak emas.
  const revenueByService = useMemo(() => {
    const map = new Map();
    periodTx.forEach(t => {
      if (t.type !== 'INCOME' || t.category !== 'ORDER_PAYMENT' || !t.order || !t.order.service) return;
      const name = t.order.service.nameUz || "Noma'lum xizmat";
      map.set(name, (map.get(name) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);
  }, [periodTx]);

  // Xodimlar (haydovchilar) bo'yicha kassaga TOPSHIRILGAN summa - kim
  // qancha pul olib kelganini ko'rsatadi. MUHIM: `order.worker` EMAS
  // (u buyurtmaning "hozirgi bosqich egasi", sex hodimiga ham o'tishi
  // mumkin) - `order.driver` doimiy va aniq, xuddi shu haydovchi
  // ekanini status bosqichidan qat'iy nazar to'g'ri ko'rsatadi.
  const revenueByDriver = useMemo(() => {
    const map = new Map();
    periodTx.forEach(t => {
      if (t.type !== 'INCOME' || t.category !== 'ORDER_PAYMENT' || !t.order) return;
      const driver = t.order.driver || t.order.worker;
      const name = driver ? driver.fullName : "Noma'lum xodim";
      const entry = map.get(name) || { sum: 0, count: 0 };
      entry.sum += t.amount;
      entry.count += 1;
      map.set(name, entry);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.sum - a.sum);
  }, [periodTx]);

  // Kutilayotgan majburiyatlar - davrga bog'liq emas, HOZIRGI umumiy holat
  // (Salaries.jsx bilan bir xil formula, DebtManager.jsx bilan bir xil filtr).
  const pendingPayroll = useMemo(() =>
    salaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.baseSalary + s.bonus - s.deductions, 0),
    [salaries]
  );
  const activePayableDebts = useMemo(() =>
    debts.filter(d => d.status === 'ACTIVE' && d.type === 'PAYABLE').reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );
  const activeReceivableDebts = useMemo(() =>
    debts.filter(d => d.status === 'ACTIVE' && d.type === 'RECEIVABLE').reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const exportToCSV = () => {
    const headers = ['Turi', 'Kategoriya', 'Sana', 'Tavsif', 'Kiritgan', 'Summa (UZS)'];
    const rows = periodTx.map(tx => [
      tx.type === 'INCOME' ? 'Kirim' : 'Chiqim',
      CATEGORY_LABELS[tx.category] || tx.category,
      tx.created_at.slice(0, 10),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.created_by_name || '',
      tx.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,﻿'
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `ServiceCore_Hisobot_${rangeStart}_${rangeEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tendensiya yorlig'i - musbat/manfiy/neytral rangda foiz o'zgarish.
  // `goodDirection` xarajat kabi ko'rsatkichlarda "kamayish yaxshi"
  // ma'nosini teskarilash uchun (xarajat o'sishi qizil, kamayishi yashil).
  const GrowthBadge = ({ value, goodDirection = 'up', suffix = '%' }) => {
    if (value === null) return null;
    const isUp = value > 0;
    const isGood = goodDirection === 'up' ? isUp : !isUp;
    const Icon = value === 0 ? Minus : isUp ? ArrowUp : ArrowDown;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
        value === 0 ? 'bg-slate-500/10 text-slate-500' : isGood ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
      }`}>
        <Icon className="w-2.5 h-2.5" /> {Math.abs(value).toFixed(0)}{suffix}
      </span>
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Hisobotlar</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Har oy yoki istalgan sana oralig'i uchun moliyaviy hisobot</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs w-fit"
          >
            <Printer className="w-4 h-4" /> Chop etish
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs w-fit"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Date controls */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500" />
            <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setCustomRange({ start: '', end: '' }); }}
              className="w-full bg-transparent text-slate-800 dark:text-gray-100 focus:outline-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Yoki aniq boshlanish sanasi</label>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Tugash sanasi</label>
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-3">
          Ko'rsatilayotgan davr: <span className="font-bold text-slate-600 dark:text-gray-300">{rangeStart} — {rangeEnd}</span> ({periodTx.length} ta tranzaksiya)
        </p>
      </div>

      {/* Umumiy tendensiya - tanlangan davrdan mustaqil, doim so'nggi 6 oy */}
      <MonthlyTrendChart transactions={transactions} />

      {/* P&L cards for the period */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Daromad</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Landmark className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{formatCurrency(stats.revenue, 'uz')}</h3>
          <div className="mt-1.5"><GrowthBadge value={revenueGrowth} goodDirection="up" /></div>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Xarajat</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/5 text-rose-600 dark:text-rose-400 flex items-center justify-center"><Scale className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{formatCurrency(stats.expense, 'uz')}</h3>
          <div className="mt-1.5"><GrowthBadge value={expenseGrowth} goodDirection="down" /></div>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Sof Foyda</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <h3 className={`text-lg font-extrabold font-['Outfit'] ${stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>{formatCurrency(stats.net, 'uz')}</h3>
          <div className="mt-1.5"><GrowthBadge value={netGrowth} goodDirection="up" /></div>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Marja</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Percent className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">{stats.margin.toFixed(1)}%</h3>
          <div className="mt-1.5">
            <GrowthBadge
              value={prevStats.revenue !== 0 || prevStats.expense !== 0 ? marginDeltaPp : null}
              goodDirection="up"
              suffix=" p.p."
            />
          </div>
        </div>
      </div>

      <p className="text-[9px] text-slate-400 dark:text-gray-500 -mt-3">
        Solishtirilayotgan oldingi davr: <span className="font-bold text-slate-500 dark:text-gray-400">{prevStart} — {prevEnd}</span> ({previousPeriodTx.length} ta tranzaksiya)
      </p>

      {/* Category breakdown + pending obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryBreakdown transactions={periodTx} />
        </div>

        <div className="space-y-6">
          {/* To'lov usuli taqsimoti - shu davrda mijozlar naqd yoki karta
              orqali qancha to'laganini ko'rsatadi, kassa yaqinlashtirishda
              (naqd summani jismoniy sanashda) ishlatiladi. */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">To'lov Usuli Taqsimoti</h4>
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300"><Banknote className="w-3.5 h-3.5 text-emerald-600" /> Naqd</span>
              <span className="font-extrabold text-emerald-600">{formatCurrency(paymentSplit.cash, 'uz')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300"><CreditCard className="w-3.5 h-3.5 text-blue-600" /> Karta</span>
              <span className="font-extrabold text-blue-600">{formatCurrency(paymentSplit.card, 'uz')}</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">Kutilayotgan Majburiyatlar</h4>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 -mt-3">Joriy holat, davrga bog'liq emas</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <span className="text-slate-600 dark:text-gray-300">Hisoblangan, to'lanmagan ish haqi</span>
                <span className="font-extrabold text-amber-600">{formatCurrency(pendingPayroll, 'uz')}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <span className="text-slate-600 dark:text-gray-300">Faol qarzlarimiz (to'lashimiz kerak)</span>
                <span className="font-extrabold text-rose-600">{formatCurrency(activePayableDebts, 'uz')}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-slate-600 dark:text-gray-300">Bizga qarzdorlar (kutilayotgan)</span>
                <span className="font-extrabold text-emerald-600">{formatCurrency(activeReceivableDebts, 'uz')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Xizmat va xodim (haydovchi) kesimida daromad taqsimoti - "qaysi
          xizmat va kim eng ko'p daromad keltiryapti" degan savolga
          to'g'ridan-to'g'ri javob. Avval bu ma'lumot umuman ko'rinmasdi. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueBreakdownCard
          title="Xizmat Turlari Bo'yicha Daromad"
          icon={Wrench}
          items={revenueByService}
          emptyText="Bu davrda xizmat bo'yicha daromad qayd etilmagan"
        />
        <RevenueBreakdownCard
          title="Xodimlar (Haydovchilar) Samaradorligi"
          icon={Users}
          items={revenueByDriver}
          emptyText="Bu davrda xodim bo'yicha to'lov qayd etilmagan"
          countLabel="ta to'lov"
        />
      </div>

    </div>
  );
};

export default Reports;
