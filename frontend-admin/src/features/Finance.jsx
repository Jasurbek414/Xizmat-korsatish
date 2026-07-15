import React, { useState, useEffect } from 'react';
import { Plus, Download, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

// Import modular components
import FinanceStats from './finance/FinanceStats';
import FinanceFilters from './finance/FinanceFilters';
import FinanceTable from './finance/FinanceTable';
import CreateTxModal from './finance/CreateTxModal';
import PLReport from './finance/PLReport';

const Finance = ({ tab }) => {
  const { t } = useTranslation();
  
  // Tabs: 'TRANSACTIONS' | 'PL'
  const [activeTab, setActiveTab] = useState('TRANSACTIONS');

  // DB States
  const [transactions, setTransactions] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [wallets, setWallets] = useState([
    { id: 'cash', name_uz: 'Naqd pul', name_ru: 'Наличные', name_en: 'Cash', balance: 0 }
  ]);
  const [expectedFunds, setExpectedFunds] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  const [filterCategory, setFilterCategory] = useState('ALL'); 
  const [filterWallet, setFilterWallet] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL'); // ALL, TODAY, YESTERDAY, WEEK, MONTH, CUSTOM
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  // Totals State
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });

  // Pending Handovers from Drivers
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [pendingHandoversSum, setPendingHandoversSum] = useState(0);

  // Form State
  const [newTx, setNewTx] = useState({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: 'cash' });

  // Loading database items on mount or tab change
  const loadData = async () => {
    try {
      const [txsData, statsData, ordersData, pendingHandoversData] = await Promise.all([
        api.getTransactions(),
        api.getFinanceStats(),
        api.getOrders(),
        api.getPendingHandovers()
      ]);

      const mappedTxs = txsData.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description || '',
        created_at: t.createdAt || t.created_at,
        wallet_id: 'cash'
      }));

      setTransactions(mappedTxs);
      setOrdersList(ordersData);
      setPendingHandovers(pendingHandoversData || []);
      
      const pHSum = (pendingHandoversData || []).reduce((sum, o) => sum + (o.collectedPrice || 0), 0);
      setPendingHandoversSum(pHSum);

      setTotals({
        income: statsData.totalIncome,
        expense: statsData.totalExpense,
        balance: statsData.balance
      });

      setWallets([
        { id: 'cash', name_uz: 'Asosiy Kassa (Naqd/Karta)', name_ru: 'Основная касса', name_en: 'Main Cash', balance: statsData.balance }
      ]);

      // Calculate Daily Expenses
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayExp = mappedTxs
        .filter(t => t.type === 'EXPENSE' && t.created_at && t.created_at.slice(0, 10) === todayStr)
        .reduce((sum, t) => sum + t.amount, 0);
      setDailyExpenses(todayExp);

      // Calculate Expected Funds (from non-completed orders)
      const pendingOrders = ordersData.filter(o => {
        const statusId = o.status ? o.status.id : '';
        return statusId !== 'b4444444-4444-4444-4444-444444444444';
      });
      const pendingSum = pendingOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      setExpectedFunds(pendingSum);

    } catch (err) {
      console.error("Failed to load finance data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  // Add Transaction
  const handleAddTx = async (e) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    try {
      const saved = await api.createTransaction({
        type: newTx.type,
        amount: parseFloat(newTx.amount),
        category: newTx.category,
        description: newTx.description
      });

      const tx = {
        id: saved.id,
        type: saved.type,
        amount: saved.amount,
        category: saved.category,
        description: saved.description || '',
        created_at: saved.createdAt,
        wallet_id: 'cash'
      };

      setTransactions(prev => [tx, ...prev]);
      setShowTxModal(false);
      setNewTx({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: 'cash' });

      // Refresh stats
      const statsData = await api.getFinanceStats();
      setTotals({
        income: statsData.totalIncome,
        expense: statsData.totalExpense,
        balance: statsData.balance
      });
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  const handleConfirmHandover = async (orderId) => {
    try {
      await api.confirmHandover(orderId);
      loadData();
    } catch (err) {
      console.error("Failed to confirm cash handover:", err);
    }
  };

  // Dynamic stats based on selected date
  const statsForSelectedDate = React.useMemo(() => {
    const targetDateStr = selectedDate;

    // Filter transactions on or before target date for balance
    const balanceBeforeTarget = transactions
      .filter(t => !targetDateStr || (t.created_at && t.created_at.slice(0, 10) <= targetDateStr))
      .reduce((sum, t) => {
        if (t.type === 'INCOME') return sum + t.amount;
        return sum - t.amount;
      }, 0);

    // Daily expenses on target date
    const targetDateForDaily = targetDateStr || new Date().toISOString().slice(0, 10);
    const targetDailyExpenses = transactions
      .filter(t => t.type === 'EXPENSE' && t.created_at && t.created_at.slice(0, 10) === targetDateForDaily)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      balance: balanceBeforeTarget,
      dailyExpenses: targetDailyExpenses
    };
  }, [transactions, selectedDate]);

  // Expected funds based on target date
  const expectedFundsForSelectedDate = React.useMemo(() => {
    const targetDateStr = selectedDate;

    const pendingOrders = ordersList.filter(o => {
      const orderDate = o.created_at || o.createdAt;
      const orderDateStr = orderDate ? orderDate.slice(0, 10) : '';
      
      // If targetDate is set, only consider orders created up to that date
      if (targetDateStr && orderDateStr > targetDateStr) {
        return false;
      }

      // Check if not completed
      const statusId = o.status ? o.status.id : '';
      return statusId !== 'b4444444-4444-4444-4444-444444444444';
    });

    return pendingOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  }, [ordersList, selectedDate]);

  const categories = ['ALL', 'ORDER_PAYMENT', 'SALARY', 'OFFICE_EXPENSE', 'TAX', 'DEBT_PAYMENT', 'TRANSFER'];

  // Apply filters on transactions list
  const filteredTx = transactions.filter(t => {
    // 1. Search filter
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    
    // 2. Type filter
    const matchesType = filterType === 'ALL' || t.type === filterType;
    
    // 3. Category filter
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    
    // 4. Wallet filter
    const matchesWallet = filterWallet === 'ALL' || t.wallet_id === filterWallet;

    // 5. Date filter
    let matchesDate = true;
    const txDate = new Date(t.created_at);
    const now = new Date();

    if (selectedDate) {
      matchesDate = t.created_at && t.created_at.slice(0, 10) === selectedDate;
    } else if (dateRange === 'TODAY') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesDate = txDate >= today;
    } else if (dateRange === 'YESTERDAY') {
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesDate = txDate >= yesterdayStart && txDate < yesterdayEnd;
    } else if (dateRange === 'WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = txDate >= sevenDaysAgo;
    } else if (dateRange === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchesDate = txDate >= startOfMonth;
    } else if (dateRange === 'CUSTOM') {
      const start = customDates.start ? new Date(customDates.start + 'T00:00:00') : null;
      const end = customDates.end ? new Date(customDates.end + 'T23:59:59') : null;
      if (start && end) {
        matchesDate = txDate >= start && txDate <= end;
      } else if (start) {
        matchesDate = txDate >= start;
      } else if (end) {
        matchesDate = txDate <= end;
      }
    }

    return matchesSearch && matchesType && matchesCategory && matchesWallet && matchesDate;
  });

  // CSV Export for filtered transactions
  const exportToCSV = () => {
    const headers = ['Tranzaksiya ID', 'Turi', 'Kategoriya', 'Hisob', 'Sana', 'Tavsif', 'Summa (UZS)'];
    const rows = filteredTx.map(tx => [
      tx.id,
      tx.type === 'INCOME' ? 'Kirim' : 'Chiqim',
      tx.category,
      tx.wallet_id || 'Kassa',
      tx.created_at.slice(0, 10),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ServiceCore_Buxgalteriya_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic SVG Cash Flow double line chart coordinate builder
  const getChartCoordinates = () => {
    if (transactions.length === 0) return { income: '0,100', expense: '0,100' };

    // Get last 10 transaction periods or steps
    let incomeRunning = 0;
    let expenseRunning = 0;

    const points = transactions.map(tx => {
      if (tx.category === 'TRANSFER') return { inc: incomeRunning, exp: expenseRunning };
      if (tx.type === 'INCOME') incomeRunning += tx.amount;
      else expenseRunning += tx.amount;
      return { inc: incomeRunning, exp: expenseRunning };
    });

    const maxInc = Math.max(...points.map(p => p.inc), 100000);
    const maxExp = Math.max(...points.map(p => p.exp), 100000);
    const maxVal = Math.max(maxInc, maxExp);

    const height = 100;
    const width = 500;
    const padding = 15;

    const incPath = points.map((p, i) => {
      const x = padding + (i * (width - padding * 2)) / (points.length - 1 || 1);
      const y = height - padding - (p.inc * (height - padding * 2)) / maxVal;
      return `${x},${y}`;
    }).join(' ');

    const expPath = points.map((p, i) => {
      const x = padding + (i * (width - padding * 2)) / (points.length - 1 || 1);
      const y = height - padding - (p.exp * (height - padding * 2)) / maxVal;
      return `${x},${y}`;
    }).join(' ');

    return { income: incPath, expense: expPath };
  };

  const chartPaths = getChartCoordinates();

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Upper Navigation & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('finance_page.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('finance_page.desc')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kalendar Tanlagich */}
          <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 dark:text-gray-300 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="text-[9px] text-rose-500 hover:underline ml-1 font-extrabold cursor-pointer"
              >
                Tozalash
              </button>
            )}
          </div>

          <button 
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer w-fit shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('finance_page.add_tx')}
          </button>
        </div>
      </div>

      {/* Advanced sub-tab navigation menu */}
      <div className="flex bg-slate-200/50 dark:bg-white/2 p-1 rounded-xl w-full sm:w-fit border border-slate-300/30 dark:border-white/5 font-bold text-xs">
        <button 
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'TRANSACTIONS' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.tx_history')} & Kassa
        </button>
        <button 
          onClick={() => setActiveTab('PL')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'PL' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.reports')} (P&L Hisoboti)
        </button>
      </div>

      {/* Render Active Tab content */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <FinanceStats 
            balance={statsForSelectedDate.balance} 
            dailyExpenses={statsForSelectedDate.dailyExpenses} 
            expectedFunds={expectedFundsForSelectedDate} 
            pendingHandoversSum={pendingHandoversSum}
          />

          {/* Kassaga topshirish kutilayotgan pullar (kuryerlar tomonidan olingan) */}
          {pendingHandovers.length > 0 && (
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 font-['Outfit']">
                    📥 Kassaga topshirilishi kutilayotgan pullar (Kuryerlarda)
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                    Kuryerlar mijozlardan qabul qilib olgan, lekin hali kassaga topshirmagan mablag'lar
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {pendingHandovers.length} ta kutilmoqda
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingHandovers.map(oh => (
                  <div key={oh.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 flex items-center justify-between gap-3 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-slate-700 dark:text-gray-300">
                          {oh.worker ? oh.worker.fullName : "Noma'lum xodim"}
                        </span>
                        <span className="text-[8px] text-slate-400">({oh.worker ? oh.worker.username : ""})</span>
                      </div>
                      <p className="text-slate-400 text-[8px] font-medium leading-none">
                        Buyurtma: {oh.description || "Tavsif yo'q"}
                      </p>
                      <p className="text-[9px] font-bold text-amber-600 font-['Outfit']">
                        {new Intl.NumberFormat('uz-UZ').format(oh.collectedPrice)} UZS
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmHandover(oh.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[8px] transition cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Qabul qildim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Table Layout (Full Width) */}
          <div className="space-y-4">
            <FinanceFilters 
              search={search} 
              setSearch={setSearch} 
              filterType={filterType} 
              setFilterType={setFilterType} 
              filterCategory={filterCategory} 
              setFilterCategory={setFilterCategory} 
              filterWallet={filterWallet}
              setFilterWallet={setFilterWallet}
              dateRange={dateRange}
              setDateRange={setDateRange}
              customDates={customDates}
              setCustomDates={setCustomDates}
              categories={categories} 
              wallets={wallets}
            />
            <FinanceTable filteredTx={filteredTx} wallets={wallets} />
          </div>
        </div>
      )}

      {activeTab === 'PL' && (
        <PLReport transactions={filteredTx} />
      )}

      {/* Modals */}
      <CreateTxModal 
        isOpen={showTxModal} 
        onClose={() => setShowTxModal(false)} 
        newTx={newTx} 
        setNewTx={setNewTx} 
        onSubmit={handleAddTx} 
        wallets={wallets}
      />



    </div>
  );
};

export default Finance;
