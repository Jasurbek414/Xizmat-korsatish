import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Landmark, TrendingUp, Scale, Percent } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import PageLoader from '../components/PageLoader';
import CategoryBreakdown from './finance/CategoryBreakdown';

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
          created_at: t.createdAt || t.created_at
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

  const stats = useMemo(() => {
    const actualTx = periodTx.filter(t => t.category !== 'TRANSFER');
    const revenue = actualTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = actualTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const net = revenue - expense;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    return { revenue, expense, net, margin };
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
    const headers = ['Turi', 'Kategoriya', 'Sana', 'Tavsif', 'Summa (UZS)'];
    const rows = periodTx.map(tx => [
      tx.type === 'INCOME' ? 'Kirim' : 'Chiqim',
      tx.category,
      tx.created_at.slice(0, 10),
      `"${tx.description.replace(/"/g, '""')}"`,
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

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Hisobotlar</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Har oy yoki istalgan sana oralig'i uchun moliyaviy hisobot</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs w-fit"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Date controls */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
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

      {/* P&L cards for the period */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Daromad</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Landmark className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{formatCurrency(stats.revenue, 'uz')}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Xarajat</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/5 text-rose-600 dark:text-rose-400 flex items-center justify-center"><Scale className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{formatCurrency(stats.expense, 'uz')}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Sof Foyda</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <h3 className={`text-lg font-extrabold font-['Outfit'] ${stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>{formatCurrency(stats.net, 'uz')}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Marja</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Percent className="w-4 h-4" /></div>
          </div>
          <h3 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">{stats.margin.toFixed(1)}%</h3>
        </div>
      </div>

      {/* Category breakdown + pending obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryBreakdown transactions={periodTx} />
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
  );
};

export default Reports;
