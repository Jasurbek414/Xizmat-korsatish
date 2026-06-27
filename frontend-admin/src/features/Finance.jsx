import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../store/mockDb';
import { Plus, Download, Activity, ArrowRightLeft, Landmark, Wallet, Percent, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import modular components
import FinanceStats from './finance/FinanceStats';
import FinanceFilters from './finance/FinanceFilters';
import FinanceTable from './finance/FinanceTable';
import CategoryBreakdown from './finance/CategoryBreakdown';
import CreateTxModal from './finance/CreateTxModal';
import TransferModal from './finance/TransferModal';
import PLReport from './finance/PLReport';
import BudgetManager from './finance/BudgetManager';
import DebtManager from './finance/DebtManager';

const Finance = ({ tab }) => {
  const { t } = useTranslation();
  
  // Tabs: 'TRANSACTIONS' | 'PL' | 'BUDGETS' | 'DEBTS'
  const [activeTab, setActiveTab] = useState('TRANSACTIONS');

  // DB States
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [debts, setDebts] = useState([]);

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

  // Form State
  const [newTx, setNewTx] = useState({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: 'cash' });

  // Loading database items on mount or tab change
  useEffect(() => {
    const txList = getDbItem('transactions') || [];
    const walletList = getDbItem('wallets') || [];
    const budgetList = getDbItem('budgets') || [];
    const debtList = getDbItem('debts') || [];

    setTransactions(txList);
    setWallets(walletList);
    setBudgets(budgetList);
    setDebts(debtList);

    // Compute Totals (Excluding internal wallet transfers from actual income/expense totals)
    const income = txList
      .filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txList
      .filter(t => t.type === 'EXPENSE' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    
    setTotals({
      income,
      expense,
      balance: income - expense
    });
  }, [tab]);

  // Add Transaction
  const handleAddTx = (e) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description || !newTx.wallet_id) return;

    const amountNum = parseFloat(newTx.amount);
    const targetWallet = wallets.find(w => w.id === newTx.wallet_id);

    // If expense, check wallet balance
    if (newTx.type === 'EXPENSE' && targetWallet && targetWallet.balance < amountNum) {
      alert("Hisobda yetarli mablag' mavjud emas!");
      return;
    }

    const tx = {
      ...newTx,
      id: 't' + (transactions.length + 1),
      amount: amountNum,
      created_at: new Date().toISOString()
    };

    // Update wallet balance
    const updatedWallets = wallets.map(w => {
      if (w.id === newTx.wallet_id) {
        return {
          ...w,
          balance: newTx.type === 'INCOME' ? w.balance + amountNum : w.balance - amountNum
        };
      }
      return w;
    });

    const updatedTx = [...transactions, tx];

    setTransactions(updatedTx);
    setDbItem('transactions', updatedTx);

    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);

    setShowTxModal(false);
    
    // Recalculate totals
    const income = updatedTx
      .filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = updatedTx
      .filter(t => t.type === 'EXPENSE' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    setTotals({ income, expense, balance: income - expense });

    // Reset Form
    setNewTx({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: wallets[0]?.id || 'cash' });
  };

  // Delete/Revert Transaction
  const handleDeleteTx = (txId) => {
    if (!window.confirm("Haqiqatan ham ushbu tranzaksiyani o'chirmoqchimisiz? Hisob balansi qayta tiklanadi.")) return;

    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;

    // Revert wallet balance
    const updatedWallets = wallets.map(w => {
      if (w.id === txToDelete.wallet_id) {
        return {
          ...w,
          balance: txToDelete.type === 'INCOME' ? w.balance - txToDelete.amount : w.balance + txToDelete.amount
        };
      }
      return w;
    });

    const updatedTx = transactions.filter(t => t.id !== txId);

    setTransactions(updatedTx);
    setDbItem('transactions', updatedTx);

    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);

    // Recalculate totals
    const income = updatedTx
      .filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = updatedTx
      .filter(t => t.type === 'EXPENSE' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    setTotals({ income, expense, balance: income - expense });
  };

  // Handle Transfer between Wallets
  const handleTransfer = (fromId, toId, amountNum) => {
    const fromWallet = wallets.find(w => w.id === fromId);
    const toWallet = wallets.find(w => w.id === toId);

    if (!fromWallet || !toWallet) return;

    // Create dual transactions for clear cash flow tracking
    const txExpense = {
      id: 't' + (transactions.length + 1),
      type: 'EXPENSE',
      amount: amountNum,
      category: 'TRANSFER',
      description: `O'tkazma: ${toWallet.name_uz || toWallet.name_en} hisobiga`,
      wallet_id: fromId,
      created_at: new Date().toISOString()
    };

    const txIncome = {
      id: 't' + (transactions.length + 2),
      type: 'INCOME',
      amount: amountNum,
      category: 'TRANSFER',
      description: `O'tkazma: ${fromWallet.name_uz || fromWallet.name_en} hisobidan`,
      wallet_id: toId,
      created_at: new Date().toISOString()
    };

    // Update wallet balances
    const updatedWallets = wallets.map(w => {
      if (w.id === fromId) return { ...w, balance: w.balance - amountNum };
      if (w.id === toId) return { ...w, balance: w.balance + amountNum };
      return w;
    });

    const updatedTx = [...transactions, txExpense, txIncome];

    setTransactions(updatedTx);
    setDbItem('transactions', updatedTx);

    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);
  };

  // Handle Pay Debt
  const handlePayDebt = (debtId, walletId) => {
    const debt = debts.find(d => d.id === debtId);
    const wallet = wallets.find(w => w.id === walletId);

    if (!debt || !wallet) return;

    // If payable, check balance
    if (debt.type === 'PAYABLE' && wallet.balance < debt.amount) {
      alert("Hisobda yetarli mablag' mavjud emas!");
      return;
    }

    // Register transaction
    const tx = {
      id: 't' + (transactions.length + 1),
      type: debt.type === 'RECEIVABLE' ? 'INCOME' : 'EXPENSE',
      amount: debt.amount,
      category: debt.type === 'RECEIVABLE' ? 'DEBT_PAYMENT' : 'SUPPLIER_DEBT_PAYMENT',
      description: debt.type === 'RECEIVABLE' 
        ? `Mijoz ${debt.person} qarzi so'ndirildi: ${debt.description}`
        : `Hamkor ${debt.person} oldidagi qarz to'landi: ${debt.description}`,
      wallet_id: walletId,
      created_at: new Date().toISOString()
    };

    // Update wallet balance
    const updatedWallets = wallets.map(w => {
      if (w.id === walletId) {
        return {
          ...w,
          balance: debt.type === 'RECEIVABLE' ? w.balance + debt.amount : w.balance - debt.amount
        };
      }
      return w;
    });

    // Mark debt as Paid
    const updatedDebts = debts.map(d => d.id === debtId ? { ...d, status: 'PAID' } : d);

    const updatedTx = [...transactions, tx];

    setTransactions(updatedTx);
    setDbItem('transactions', updatedTx);

    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);

    setDebts(updatedDebts);
    setDbItem('debts', updatedDebts);

    // Recalculate totals
    const income = updatedTx
      .filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = updatedTx
      .filter(t => t.type === 'EXPENSE' && t.category !== 'TRANSFER')
      .reduce((sum, t) => sum + t.amount, 0);
    setTotals({ income, expense, balance: income - expense });
  };

  // Handle Create Debt
  const handleCreateDebt = (newDebt) => {
    const updatedDebts = [...debts, newDebt];
    setDebts(updatedDebts);
    setDbItem('debts', updatedDebts);
  };

  // Handle Update Budget Limit
  const handleUpdateBudget = (category, limit) => {
    const updatedBudgets = budgets.map(b => b.category === category ? { ...b, limit } : b);
    
    // If category didn't exist in budgets, add it
    if (!budgets.some(b => b.category === category)) {
      updatedBudgets.push({ category, limit });
    }

    setBudgets(updatedBudgets);
    setDbItem('budgets', updatedBudgets);
  };

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

    if (dateRange === 'TODAY') {
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

        <div className="flex items-center gap-2">
          {/* Export & Add Tx toolbar */}
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
          {t('finance_page.reports')} (P&L)
        </button>
        <button 
          onClick={() => setActiveTab('BUDGETS')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'BUDGETS' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.budget')}
        </button>
        <button 
          onClick={() => setActiveTab('DEBTS')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'DEBTS' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.debts')}
        </button>
      </div>

      {/* Render Active Tab content */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Wallets & Stats Cards */}
          <FinanceStats totals={totals} wallets={wallets} onOpenTransfer={() => setShowTransferModal(true)} />

          {/* SVG Cash Flow cumulative trend charts (Income vs Expense) */}
          <div className="glass-card p-5 rounded-2xl bg-white dark:bg-transparent shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">Moliyaviy Oqim Trendi (Income vs Expense Flow)</h4>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Kirim va Chiqimlarning jami kumulyativ o'zgarishi</p>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Kirim Oqimi</span>
                <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500 block"></span> Chiqim Oqimi</span>
              </div>
            </div>

            {/* SVG Double Area Chart */}
            <div className="relative w-full h-[120px]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1"/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                
                {/* Reference Grid lines */}
                <line x1="15" y1="50" x2="485" y2="50" stroke="currentColor" className="text-slate-100 dark:text-white/3" strokeDasharray="3 3" />
                <line x1="15" y1="85" x2="485" y2="85" stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                
                {/* Area fills */}
                {transactions.length > 1 && (
                  <>
                    <path d={`M15,85 L${chartPaths.income} L485,85 Z`} fill="url(#incGrad)" />
                    <path d={`M15,85 L${chartPaths.expense} L485,85 Z`} fill="url(#expGrad)" />
                  </>
                )}
                
                {/* Paths */}
                <polyline fill="none" stroke="#10b981" strokeWidth="2" points={chartPaths.income} strokeLinecap="round" strokeLinejoin="round" />
                <polyline fill="none" stroke="#ef4444" strokeWidth="2" points={chartPaths.expense} strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Dots for last point */}
                {chartPaths.income.split(' ').length > 0 && (
                  <>
                    {(() => {
                      const incPts = chartPaths.income.split(' ');
                      const expPts = chartPaths.expense.split(' ');
                      const lastInc = incPts[incPts.length - 1]?.split(',');
                      const lastExp = expPts[expPts.length - 1]?.split(',');
                      
                      return (
                        <>
                          {lastInc && lastInc.length === 2 && (
                            <circle cx={lastInc[0]} cy={lastInc[1]} r="4" fill="#10b981" className="stroke-white dark:stroke-[#111827] stroke-2" />
                          )}
                          {lastExp && lastExp.length === 2 && (
                            <circle cx={lastExp[0]} cy={lastExp[1]} r="4" fill="#ef4444" className="stroke-white dark:stroke-[#111827] stroke-2" />
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* Grid Layout: Filters & Table + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
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
              <FinanceTable filteredTx={filteredTx} wallets={wallets} onDeleteTx={handleDeleteTx} />
            </div>
            
            <CategoryBreakdown transactions={transactions} />
          </div>
        </div>
      )}

      {activeTab === 'PL' && (
        <PLReport transactions={transactions} />
      )}

      {activeTab === 'BUDGETS' && (
        <BudgetManager budgets={budgets} transactions={transactions} onUpdateBudget={handleUpdateBudget} />
      )}

      {activeTab === 'DEBTS' && (
        <DebtManager debts={debts} wallets={wallets} onPayDebt={handlePayDebt} onCreateDebt={handleCreateDebt} />
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

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        wallets={wallets}
        onTransfer={handleTransfer}
      />

    </div>
  );
};

export default Finance;
