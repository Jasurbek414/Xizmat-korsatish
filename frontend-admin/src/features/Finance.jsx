import React, { useState, useEffect } from 'react';
import { Plus, Download, Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { confirmDialog } from '../services/confirmDialog';
import { showToast } from '../services/toast';
import PageLoader from '../components/PageLoader';
import { formatDateTime } from '../utils/format';

// Import modular components
import FinanceStats from './finance/FinanceStats';
import FinanceFilters from './finance/FinanceFilters';
import FinanceTable from './finance/FinanceTable';
import CreateTxModal from './finance/CreateTxModal';
import PLReport from './finance/PLReport';
import DebtManager from './finance/DebtManager';
import BudgetManager from './finance/BudgetManager';

const Finance = ({ tab }) => {
  const { t } = useTranslation();

  // Tabs: 'TRANSACTIONS' | 'PL' | 'DEBTS' | 'BUDGETS'
  const [activeTab, setActiveTab] = useState('TRANSACTIONS');

  // DB States
  const [transactions, setTransactions] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [debts, setDebts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [completedStatusId, setCompletedStatusId] = useState(null);
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
  const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, card: 0 });
  const [selectedHandover, setSelectedHandover] = useState(null);

  // Pending Transactions from Drivers
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingTransactionsSum, setPendingTransactionsSum] = useState(0);

  // Form State
  const [newTx, setNewTx] = useState({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: 'cash', date: '', status: 'CONFIRMED' });

  // Kompaniya o'zi qo'shgan qo'shimcha kirim/chiqim kategoriyalari (standart
  // ro'yxat ustiga) - CreateTxModal.jsx'dagi "+ Yangi kategoriya" orqali boshqariladi.
  const [customCategories, setCustomCategories] = useState({ expense: [], income: [] });

  // Hisoblangan, lekin hali to'lanmagan ish haqi (Salaries.jsx bilan bir xil formula)
  const [pendingPayroll, setPendingPayroll] = useState(0);

  // Loading database items on mount or tab change
  const [pageLoading, setPageLoading] = useState(true);

  const loadData = async () => {
    try {
      // MUHIM: getOrders/getOrderStatuses/getSalaries ALOHIDA .catch bilan
      // o'ralgan - bular "orders" yoki "salaries" huquqini talab qiladi,
      // Buxgalter (orders yo'q) va Dispetcher (salaries yo'q) rollarida bu
      // huquqlar yo'q. Avval bittasi 403 qaytarsa BUTUN Moliya sahifasi
      // (asosiy "finance" huquqi bilan ochilishi kerak bo'lgan qism ham)
      // bo'sh qolardi - jonli aniqlangan, Buxgalter uchun bu yagona ishlaydi
      // deb kutilgan modul edi.
      const [txsData, statsData, ordersData, pendingHandoversData, pendingTxsData, statusesData, debtsData, budgetsData, salariesData, companyData] = await Promise.all([
        api.getTransactions(),
        api.getFinanceStats(),
        api.getOrders({ silent403: true }).catch(() => []),
        api.getPendingHandovers(),
        api.getPendingTransactions(),
        api.getOrderStatuses({ silent403: true }).catch(() => []),
        api.getDebts(),
        api.getBudgets(),
        api.getSalaries({ silent403: true }).catch(() => []),
        api.getCompanySettings({ silent403: true }).catch(() => null)
      ]);

      setCustomCategories({
        expense: (companyData && companyData.customExpenseCategories) || [],
        income: (companyData && companyData.customIncomeCategories) || []
      });

      // Hisoblangan, lekin hali to'lanmagan ish haqi - Buxgalteriyada avval
      // umuman ko'rinmasdi, "qancha pul chiqishi kutilyapti" degan savolga
      // javob yo'q edi. Salaries.jsx bilan AYNAN bir xil formula.
      const pendingPayrollSum = (salariesData || [])
        .filter(s => s.status === 'UNPAID')
        .reduce((sum, s) => sum + s.baseSalary + s.bonus - s.deductions, 0);
      setPendingPayroll(pendingPayrollSum);

      // MUHIM (audit'da topilgan xato, tuzatildi): "Kutilayotgan mablag'lar"
      // (hali yakunlanmagan buyurtmalar summasi) avval qattiq yozilgan, hech
      // qachon haqiqiy ma'lumotlarga mos kelmaydigan mock UUID'ga
      // ("b4444444-...") solishtirilardi - HAQIQIY backend statuslari bu
      // ID bilan hech qachon mos kelmagani uchun BARCHA buyurtmalar (hatto
      // yakunlanganlari ham) "kutilayotgan" deb hisoblanib, ko'rsatkich
      // doim shishirilgan edi. Endi Salaries.jsx bilan bir xil mantiq -
      // kompaniyaning o'zi sozlagan statuslar ro'yxatidagi ENG OXIRGI
      // (sort_order bo'yicha) status "yakunlangan" hisoblanadi.
      const sortedStatuses = [...statusesData].sort((a, b) => a.sortOrder - b.sortOrder);
      const completedStatusId = sortedStatuses.length > 0 ? sortedStatuses.slice(-1)[0].id : null;
      setCompletedStatusId(completedStatusId);

      const mappedDebts = debtsData.map(d => ({
        id: d.id,
        type: d.type,
        person: d.person,
        amount: d.amount,
        description: d.description || '',
        status: d.status,
        created_at: d.createdAt
      }));
      setDebts(mappedDebts);

      const mappedBudgets = budgetsData.map(b => ({
        category: b.category,
        limit: b.limitAmount
      }));
      setBudgets(mappedBudgets);

      const mappedTxs = txsData.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description || '',
        created_at: t.createdAt || t.created_at,
        wallet_id: 'cash',
        payment_method: t.paymentMethod || null,
        cash_amount: t.cashAmount || 0,
        card_amount: t.cardAmount || 0,
        // Faqat ORDER_PAYMENT tranzaksiyalarida to'ldirilgan (buyurtma
        // avtomatik yaratgan kirim) - qo'lda kiritilgan kirim/chiqimlarda null.
        // Tafsilot modalida buyurtma raqami/tarkibini ko'rsatish uchun kerak.
        order: t.order || null
      }));

      setTransactions(mappedTxs);

      // Buyurtma to'lovlarining naqd/karta bo'yicha taqsimoti - faqat
      // kassaga TASDIQLANGAN topshirilgan (ORDER_PAYMENT INCOME) summalar
      // hisobga olinadi, hali kuryerda turgan (pending) pul bu yerga kirmaydi.
      const orderPaymentTxs = mappedTxs.filter(t => t.category === 'ORDER_PAYMENT' && t.type === 'INCOME');
      const cashReceived = orderPaymentTxs.reduce((sum, t) => sum + (t.cash_amount || 0), 0);
      const cardReceived = orderPaymentTxs.reduce((sum, t) => sum + (t.card_amount || 0), 0);
      setPaymentBreakdown({ cash: cashReceived, card: cardReceived });
      setOrdersList(ordersData);
      setPendingHandovers(pendingHandoversData || []);
      setPendingTransactions(pendingTxsData || []);
      
      const pHSum = (pendingHandoversData || []).reduce((sum, o) => sum + (o.collectedPrice || 0), 0);
      setPendingHandoversSum(pHSum);

      const pTxSum = (pendingTxsData || []).reduce((sum, t) => sum + (t.amount || 0), 0);
      setPendingTransactionsSum(pTxSum);

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
        return completedStatusId !== null && statusId !== completedStatusId;
      });
      const pendingSum = pendingOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      setExpectedFunds(pendingSum);

    } catch (err) {
      console.error("Failed to load finance data:", err);
    } finally {
      setPageLoading(false);
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
        description: newTx.description,
        created_at: newTx.date || undefined,
        status: newTx.status === 'PENDING' ? 'PENDING' : undefined
      });

      // PENDING (rejalashtirilgan) yozuv balansga hali qo'shilmaydi - u
      // "Tasdiq kutayotgan tranzaksiyalar" ro'yxatida ko'rinishi kerak,
      // ro'yxatga esa faqat CONFIRMED bo'lganlar qo'shiladi (server ham
      // getTransactions()da faqat CONFIRMED'ni qaytaradi).
      if (saved.status === 'CONFIRMED') {
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

        // Refresh stats
        const statsData = await api.getFinanceStats();
        setTotals({
          income: statsData.totalIncome,
          expense: statsData.totalExpense,
          balance: statsData.balance
        });
      } else {
        setPendingTransactions(prev => [saved, ...prev]);
        setPendingTransactionsSum(prev => prev + saved.amount);
      }

      setShowTxModal(false);
      setNewTx({ type: 'INCOME', amount: '', category: 'ORDER_PAYMENT', description: '', wallet_id: 'cash', date: '', status: 'CONFIRMED' });
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  // Standart ro'yxatga (SALARY, OFFICE_EXPENSE, ...) qo'shimcha, kompaniya
  // o'zi xohlagan yangi kirim/chiqim kategoriyasini qo'shadi - measurementUnits
  // (Sozlamalar > Umumiy) bilan bir xil naqsh: darhol serverga saqlanadi.
  const handleAddCategory = async (txType, rawName) => {
    const name = rawName.trim();
    if (!name) return null;

    const field = txType === 'INCOME' ? 'income' : 'expense';
    const current = customCategories[field];
    if (current.some(c => c.toLowerCase() === name.toLowerCase())) return name;

    const updated = [...current, name];
    const payloadKey = txType === 'INCOME' ? 'customIncomeCategories' : 'customExpenseCategories';
    try {
      await api.updateCompanySettings({ [payloadKey]: updated });
      setCustomCategories(prev => ({ ...prev, [field]: updated }));
      return name;
    } catch (err) {
      showToast(err.message || "Yangi kategoriya qo'shishda xatolik yuz berdi");
      return null;
    }
  };

  // MUHIM: haqiqatan o'chirilgan bo'lsa true, bekor qilingan/xato bo'lsa
  // false qaytaradi - FinanceTable'dagi tafsilot modali shu qiymatga qarab
  // (faqat muvaffaqiyatli o'chirilganda) o'zini yopadi.
  const handleDeleteTx = async (txId) => {
    if (!(await confirmDialog("Ushbu tranzaksiyani butunlay o'chirasizmi? Bu amalni qaytarib bo'lmaydi.", { danger: true }))) return false;
    try {
      await api.deleteTransaction(txId);
      setTransactions(prev => prev.filter(t => t.id !== txId));
      const statsData = await api.getFinanceStats();
      setTotals({
        income: statsData.totalIncome,
        expense: statsData.totalExpense,
        balance: statsData.balance
      });
      return true;
    } catch (err) {
      showToast(err.message || "Tranzaksiyani o'chirishda xatolik yuz berdi");
      return false;
    }
  };

  const handleConfirmHandover = async (orderId, defaultAmount) => {
    const input = window.prompt(
      `Kuryerdan topshirib olinayotgan summani kiriting:`,
      defaultAmount
    );
    if (input === null) return;
    const actualAmount = parseFloat(input);
    if (isNaN(actualAmount) || actualAmount < 0) {
      showToast("Noto'g'ri summa kiritildi!");
      return;
    }
    try {
      await api.confirmHandover(orderId, actualAmount);
      loadData();
    } catch (err) {
      console.error("Failed to confirm cash handover:", err);
      showToast("Xatolik yuz berdi: " + (err.message || err));
    }
  };

  // Debts (Nasiyalar & Qarzlar)
  const handleCreateDebt = async (newDebt) => {
    try {
      const saved = await api.createDebt({
        type: newDebt.type,
        person: newDebt.person,
        amount: newDebt.amount,
        description: newDebt.description
      });
      setDebts(prev => [...prev, {
        id: saved.id,
        type: saved.type,
        person: saved.person,
        amount: saved.amount,
        description: saved.description || '',
        status: saved.status,
        created_at: saved.createdAt
      }]);
    } catch (err) {
      showToast(err.message || "Qarz yozishda xatolik yuz berdi");
    }
  };

  const handlePayDebt = async (debtId) => {
    if (!(await confirmDialog("Ushbu qarzni so'ndirilgan deb belgilaysizmi? Bu amal Moliya balansiga ta'sir qiladi.", { danger: false }))) return;
    try {
      await api.payDebt(debtId);
      setDebts(prev => prev.map(d => d.id === debtId ? { ...d, status: 'PAID' } : d));
      // Qarz to'lovi Moliyada yangi tranzaksiya sifatida yozildi - balansni yangilaymiz.
      const statsData = await api.getFinanceStats();
      setTotals({ income: statsData.totalIncome, expense: statsData.totalExpense, balance: statsData.balance });
      loadData();
    } catch (err) {
      showToast(err.message || "Qarzni to'lashda xatolik yuz berdi");
    }
  };

  // Budgets (Byudjetlar)
  const handleUpdateBudget = async (category, limit) => {
    try {
      await api.updateBudget(category, limit);
      setBudgets(prev => prev.map(b => b.category === category ? { ...b, limit } : b));
    } catch (err) {
      showToast(err.message || "Byudjet limitini saqlashda xatolik yuz berdi");
    }
  };

  const handleConfirmTransaction = async (txId) => {
    if (!(await confirmDialog("Ushbu kuryer tranzaksiyasini tasdiqlab, kassaga qabul qilasizmi?", { danger: false }))) return;
    try {
      await api.confirmTransaction(txId);
      loadData();
    } catch (err) {
      console.error("Failed to confirm transaction:", err);
      showToast("Xatolik yuz berdi: " + (err.message || err));
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
      return completedStatusId !== null && statusId !== completedStatusId;
    });

    return pendingOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  }, [ordersList, selectedDate, completedStatusId]);

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

  if (pageLoading) return <PageLoader />;

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
        <button
          onClick={() => setActiveTab('DEBTS')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'DEBTS' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.debts')}
        </button>
        <button
          onClick={() => setActiveTab('BUDGETS')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg cursor-pointer transition ${activeTab === 'BUDGETS' ? 'bg-white dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'}`}
        >
          {t('finance_page.budget')}
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
            pendingPayroll={pendingPayroll}
            paymentBreakdown={paymentBreakdown}
          />

          {/* Kassaga topshirish kutilayotgan pullar (kuryerlar tomonidan olingan) -
              har bir TO'LOV (buyurtma) uchun alohida karta. Karta ustiga
              bosilganda to'liq tafsilot modal oynada ochiladi (setSelectedHandover). */}
          {pendingHandovers.length > 0 && (() => {
            const cardCount = pendingHandovers.filter(o => o.paymentMethod === 'CARD').length;
            const mixedCount = pendingHandovers.filter(o => o.paymentMethod === 'MIXED').length;
            const cashCount = pendingHandovers.length - cardCount - mixedCount;

            return (
              <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 font-['Outfit']">
                      📥 Kassaga topshirilishi kutilayotgan pullar (Kuryerlarda)
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                      Kuryerlar mijozlardan qabul qilib olgan, lekin hali kassaga topshirmagan mablag'lar - tafsilot uchun kartaga bosing
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                    {pendingHandovers.length} ta kutilmoqda
                    {cashCount > 0 ? ` · ${cashCount} naqd` : ''}
                    {cardCount > 0 ? ` · ${cardCount} karta` : ''}
                    {mixedCount > 0 ? ` · ${mixedCount} aralash` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingHandovers.map(oh => (
                    <button
                      key={oh.id}
                      onClick={() => setSelectedHandover(oh)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer text-left text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-700 dark:text-gray-300 truncate">
                          {oh.worker ? oh.worker.fullName : "Noma'lum xodim"}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono shrink-0">№{oh.id ? oh.id.slice(0, 8).toUpperCase() : '—'}</span>
                      </div>
                      <p className="text-slate-400 text-[8px] font-medium leading-none truncate">
                        {oh.description || "Tavsif yo'q"}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[9px] font-bold text-amber-600 font-['Outfit']">
                          {new Intl.NumberFormat('uz-UZ').format(oh.collectedPrice)} UZS
                        </p>
                        {oh.paymentMethod && (
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            oh.paymentMethod === 'CARD' ? 'bg-blue-500/10 text-blue-600' :
                            oh.paymentMethod === 'MIXED' ? 'bg-purple-500/10 text-purple-600' :
                            'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {oh.paymentMethod === 'CARD' ? 'KARTA' : oh.paymentMethod === 'MIXED' ? 'ARALASH' : 'NAQD'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Bitta to'lovning to'liq tafsiloti - karta bosilganda ochiladigan modal.
              /pending-handovers backend'dan TO'LIQ Order obyektini qaytaradi
              (client, service, items, price bilan) - shu sabab bu yerda
              faqat to'lov emas, buyurtmaning o'zi haqida ham to'liq
              ma'lumot ko'rsatish mumkin (raqami, mijoz, xizmat, gilamlar). */}
          {selectedHandover && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedHandover(null)}>
              <div
                className="glass-card rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 text-xs font-semibold flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">Buyurtma tafsiloti</h3>
                    <p className="text-[9px] text-slate-400 font-mono">
                      Buyurtma № {selectedHandover.id ? selectedHandover.id.slice(0, 8).toUpperCase() : "Noma'lum"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedHandover(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-white/2 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Kuryer</p>
                      <p className="text-slate-800 dark:text-white font-bold">
                        {selectedHandover.worker ? selectedHandover.worker.fullName : "Noma'lum xodim"}
                      </p>
                      {selectedHandover.worker && (
                        <p className="text-[9px] text-slate-400 font-mono">@{selectedHandover.worker.username}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Xizmat turi</p>
                      <p className="text-slate-800 dark:text-white font-bold">
                        {selectedHandover.service ? selectedHandover.service.nameUz : "Noma'lum"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Mijoz</p>
                    <p className="text-slate-800 dark:text-white font-bold">
                      {selectedHandover.client ? selectedHandover.client.fullName : "Noma'lum mijoz"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                      {selectedHandover.client ? selectedHandover.client.phone : ''}
                    </p>
                    {selectedHandover.address && (
                      <p className="text-[10px] text-slate-400 mt-0.5">📍 {selectedHandover.address}</p>
                    )}
                  </div>

                  {selectedHandover.description && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Izoh</p>
                      <p className="text-slate-700 dark:text-gray-300">{selectedHandover.description}</p>
                    </div>
                  )}

                  {selectedHandover.items && selectedHandover.items.length > 0 && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                        Buyurtma tarkibi ({selectedHandover.items.length} ta)
                      </p>
                      <div className="border border-slate-100 dark:border-white/5 rounded-xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden max-h-28 overflow-y-auto">
                        {selectedHandover.items.map(item => (
                          <div key={item.id} className="px-2.5 py-1.5 flex justify-between items-center text-[10px]">
                            <span className="text-slate-600 dark:text-gray-300">
                              {item.name} — {item.quantity} dona ({Number(item.length).toFixed(1)}×{Number(item.width).toFixed(1)} m)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Buyurtma yaratilgan</p>
                      <p className="text-slate-700 dark:text-gray-300 font-mono">{formatDateTime(selectedHandover.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">To'lov qabul qilingan</p>
                      <p className="text-slate-700 dark:text-gray-300 font-mono">{formatDateTime(selectedHandover.updatedAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">To'lov usuli</p>
                    <span className={`inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded ${
                      selectedHandover.paymentMethod === 'CARD' ? 'bg-blue-500/10 text-blue-600' :
                      selectedHandover.paymentMethod === 'MIXED' ? 'bg-purple-500/10 text-purple-600' :
                      'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {selectedHandover.paymentMethod === 'CARD' ? 'KARTA' : selectedHandover.paymentMethod === 'MIXED' ? 'ARALASH' : 'NAQD'}
                    </span>
                  </div>
                  {selectedHandover.paymentMethod === 'MIXED' && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-white/2 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div>
                        <p className="text-slate-400">Naqd qismi</p>
                        <p className="font-bold text-slate-800 dark:text-white">{new Intl.NumberFormat('uz-UZ').format(selectedHandover.cashAmount || 0)} UZS</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Karta qismi</p>
                        <p className="font-bold text-slate-800 dark:text-white">{new Intl.NumberFormat('uz-UZ').format(selectedHandover.cardAmount || 0)} UZS</p>
                      </div>
                    </div>
                  )}

                  {selectedHandover.price !== selectedHandover.collectedPrice && (
                    <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 text-[10px]">
                      <span className="text-slate-400">Buyurtma summasi</span>
                      <span className="font-bold text-slate-600 dark:text-gray-300">{new Intl.NumberFormat('uz-UZ').format(selectedHandover.price)} UZS</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-amber-500/5 px-3 py-2.5 rounded-xl border border-amber-500/10">
                    <span className="font-extrabold text-amber-600 uppercase text-[9px] tracking-wide">Qabul qilingan summa</span>
                    <span className="font-black text-sm text-amber-600 font-['Outfit']">
                      {new Intl.NumberFormat('uz-UZ').format(selectedHandover.collectedPrice)} UZS
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setSelectedHandover(null)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Yopish
                  </button>
                  <button
                    onClick={() => {
                      handleConfirmHandover(selectedHandover.id, selectedHandover.collectedPrice);
                      setSelectedHandover(null);
                    }}
                    className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Qabul qildim
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingTransactions.length > 0 && (
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 font-['Outfit']">
                    💰 Tasdiq kutayotgan tranzaksiyalar (Kuryerlar kiritgan)
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                    Kuryerlar tomonidan qo'shilgan, lekin hali buxgalter tasdiqlamagan kirim va chiqim operatsiyalari
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  {pendingTransactions.length} ta kutilmoqda
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTransactions.map(tx => (
                  <div key={tx.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 flex items-center justify-between gap-3 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-slate-700 dark:text-gray-300">
                          {tx.worker ? tx.worker.fullName : "Kuryer"}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[7px] font-extrabold ${tx.type === 'INCOME' ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'}`}>
                          {tx.type === 'INCOME' ? 'KIRIM' : 'CHIQIM'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[8px] font-medium leading-none">
                        Kategoriya: {tx.category === 'ORDER_PAYMENT' ? 'Buyurtma to\'lovi' : tx.category === 'FUEL' ? 'Yoqilg\'i' : tx.category === 'SALARY' ? 'Ish haqi' : tx.category === 'CAR_REPAIR' ? 'Avto ta\'mirlash' : tx.category}
                      </p>
                      <p className="text-slate-400 text-[8px] font-medium leading-none">
                        Izoh: {tx.description || "Izoh yo'q"}
                      </p>
                      <p className={`text-[9px] font-bold font-['Outfit'] ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{new Intl.NumberFormat('uz-UZ').format(tx.amount)} UZS
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmTransaction(tx.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[8px] transition cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Tasdiqlash
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
            <FinanceTable filteredTx={filteredTx} wallets={wallets} onDeleteTx={handleDeleteTx} />
          </div>
        </div>
      )}

      {activeTab === 'PL' && (
        // MUHIM (audit'da topilgan): `filteredTx` Tranzaksiyalar bo'limidagi
        // qidiruv/filtr holatiga bog'liq va bo'limlar orasida saqlanib qoladi -
        // agar admin "EXPENSE" yoki bitta kategoriya bo'yicha filtrlab, keyin
        // shu yerga o'tsa, hisobot to'liq emas, o'sha filtrlangan qism asosida
        // hisoblanib, soxta (masalan nol daromadli) natija ko'rsatardi.
        // BudgetManager pastda to'liq `transactions`ni oladi - shu bilan izchil.
        <PLReport transactions={transactions} />
      )}

      {activeTab === 'DEBTS' && (
        <DebtManager
          debts={debts}
          wallets={wallets}
          onPayDebt={handlePayDebt}
          onCreateDebt={handleCreateDebt}
        />
      )}

      {activeTab === 'BUDGETS' && (
        <BudgetManager
          budgets={budgets}
          transactions={transactions}
          onUpdateBudget={handleUpdateBudget}
        />
      )}

      {/* Modals */}
      <CreateTxModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        newTx={newTx}
        setNewTx={setNewTx}
        onSubmit={handleAddTx}
        wallets={wallets}
        customCategories={customCategories}
        onAddCategory={handleAddCategory}
      />



    </div>
  );
};

export default Finance;
