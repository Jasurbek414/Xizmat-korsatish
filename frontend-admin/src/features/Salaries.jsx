import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../store/mockDb';
import { useTranslation } from 'react-i18next';

// Import modular components
import SalariesStats from './salaries/SalariesStats';
import SalariesFilters from './salaries/SalariesFilters';
import SalariesTable from './salaries/SalariesTable';
import PayslipModal from './salaries/PayslipModal';
import AdvanceModal from './salaries/AdvanceModal';

const Salaries = ({ tab }) => {
  const { t } = useTranslation();
  
  // State from LocalStorage
  const [salaries, setSalaries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // UI / Filters State
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('ALL');
  const [periods, setPeriods] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });

  // Selected records for Modals
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);

  // Load database items and calculate dynamic commissions
  useEffect(() => {
    const salaryList = getDbItem('salaries') || [];
    const orderList = getDbItem('orders') || [];
    const walletList = getDbItem('wallets') || [];
    const txList = getDbItem('transactions') || [];

    setOrders(orderList);
    setWallets(walletList);
    setTransactions(txList);

    // Extract unique pay periods for filter dropdown
    const uniquePeriods = [...new Set(salaryList.map(s => s.pay_period))];
    setPeriods(uniquePeriods);

    // Dynamically calculate completed orders commission (10%) and update worker salaries
    const computedSalaries = salaryList.map(sal => {
      // Find completed orders for this worker in this period
      const workerCompletedOrders = orderList.filter(ord => {
        const isWorker = ord.worker_name.toLowerCase() === sal.full_name.toLowerCase();
        const isCompleted = ord.status_id === '4';
        const ordPeriod = ord.created_at ? ord.created_at.slice(0, 7) : ''; // "2026-06"
        return isWorker && isCompleted && ordPeriod === sal.pay_period;
      });

      const totalOrdersAmount = workerCompletedOrders.reduce((sum, ord) => sum + ord.price, 0);
      const commission = Math.round(totalOrdersAmount * 0.1); // 10% commission

      // We assume the initial DB "bonus" field is performance base, and we add commission on top
      // Wait, to prevent compounding commission on every page load, we should calculate relative to a base bonus
      // We can look at the raw database value to ensure we are adding to the static baseline.
      // If we don't store baseline, let's look at the default salaries structure.
      // u1 base_bonus: 450000. u2 base_bonus: 300000.
      const baselineBonus = sal.user_id === 'u1' ? 450000 : 300000;
      
      return {
        ...sal,
        bonus: baselineBonus + commission
      };
    });

    setSalaries(computedSalaries);

    // Calculate Summary Stats
    const total = computedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const paid = computedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const pending = computedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);

    setSummary({ total, paid, pending });
  }, [tab]);

  // Pay single employee salary
  const handlePaySalary = (id) => {
    const salaryToPay = salaries.find(s => s.id === id);
    if (!salaryToPay) return;

    const netSalary = salaryToPay.base_salary + salaryToPay.bonus - salaryToPay.deductions;

    // Check Cash Wallet balance
    const cashWallet = wallets.find(w => w.id === 'cash');
    if (cashWallet && cashWallet.balance < netSalary) {
      alert("Kassa (Naqd pul) hisobida yetarli mablag' mavjud emas! Oylik to'lash uchun kassada yetarli pul bo'lishi kerak.");
      return;
    }

    // Deduct from Cash Wallet
    const updatedWallets = wallets.map(w => {
      if (w.id === 'cash') return { ...w, balance: w.balance - netSalary };
      return w;
    });
    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);

    // Register Transaction
    const newTx = {
      id: 't' + (transactions.length + 1),
      type: 'EXPENSE',
      amount: netSalary,
      category: 'SALARY',
      wallet_id: 'cash',
      description: `${salaryToPay.full_name} uchun ${salaryToPay.pay_period} oylik maoshi to'lovi`,
      created_at: new Date().toISOString()
    };
    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    setDbItem('transactions', updatedTx);

    // Mark paid in Salaries
    const updatedSalaries = salaries.map(s => {
      if (s.id === id) return { ...s, status: 'PAID' };
      return s;
    });
    setSalaries(updatedSalaries);
    setDbItem('salaries', updatedSalaries);

    // Update Summary
    const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    setSummary({ total, paid, pending });
  };

  // Pay all pending salaries in batch
  const handlePayAll = () => {
    const unpaidList = filteredSalaries.filter(s => s.status === 'UNPAID');
    if (unpaidList.length === 0) return;

    const totalPayout = unpaidList.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);

    // Check Cash Wallet
    const cashWallet = wallets.find(w => w.id === 'cash');
    if (cashWallet && cashWallet.balance < totalPayout) {
      alert(`Kassada yetarli mablag' mavjud emas! Jami to'lov: ${totalPayout.toLocaleString()} UZS, Kassadagi pul: ${cashWallet.balance.toLocaleString()} UZS`);
      return;
    }

    if (!window.confirm(`Haqiqatan ham barcha ${unpaidList.length} ta xodimning oyliklarini (Jami: ${totalPayout.toLocaleString()} UZS) kassadan to'lamoqchimisiz?`)) return;

    // Deduct total payout from Cash Wallet
    const updatedWallets = wallets.map(w => {
      if (w.id === 'cash') return { ...w, balance: w.balance - totalPayout };
      return w;
    });
    setWallets(updatedWallets);
    setDbItem('wallets', updatedWallets);

    // Register expense transactions for each unpaid employee
    const newTransactions = [...transactions];
    unpaidList.forEach((salaryToPay, idx) => {
      const netSalary = salaryToPay.base_salary + salaryToPay.bonus - salaryToPay.deductions;
      newTransactions.push({
        id: 't' + (newTransactions.length + 1),
        type: 'EXPENSE',
        amount: netSalary,
        category: 'SALARY',
        wallet_id: 'cash',
        description: `${salaryToPay.full_name} uchun ${salaryToPay.pay_period} oylik maoshi to'lovi (Guruhli)`,
        created_at: new Date().toISOString()
      });
    });
    setTransactions(newTransactions);
    setDbItem('transactions', newTransactions);

    // Mark all as paid
    const updatedSalaries = salaries.map(s => {
      if (unpaidList.some(unp => unp.id === s.id)) {
        return { ...s, status: 'PAID' };
      }
      return s;
    });
    setSalaries(updatedSalaries);
    setDbItem('salaries', updatedSalaries);

    // Update Summary
    const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    setSummary({ total, paid, pending });
  };

  // Submit Advance or Deduction/Fine
  const handleAdvanceFineSubmit = (salaryId, type, amt, desc, walletId) => {
    const updatedSalaries = salaries.map(s => {
      if (s.id === salaryId) {
        return {
          ...s,
          deductions: s.deductions + amt
        };
      }
      return s;
    });

    setSalaries(updatedSalaries);
    setDbItem('salaries', updatedSalaries);

    const targetSalary = salaries.find(s => s.id === salaryId);
    if (!targetSalary) return;

    if (type === 'ADVANCE') {
      // Deduct from selected wallet
      const updatedWallets = wallets.map(w => {
        if (w.id === walletId) return { ...w, balance: w.balance - amt };
        return w;
      });
      setWallets(updatedWallets);
      setDbItem('wallets', updatedWallets);

      // Register Expense Transaction in Cashbook
      const newTx = {
        id: 't' + (transactions.length + 1),
        type: 'EXPENSE',
        amount: amt,
        category: 'SALARY',
        wallet_id: walletId,
        description: `Avans to'lovi: ${desc} (${targetSalary.full_name})`,
        created_at: new Date().toISOString()
      };
      const updatedTx = [...transactions, newTx];
      setTransactions(updatedTx);
      setDbItem('transactions', updatedTx);
    }

    // Update Summary
    const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    setSummary({ total, paid, pending });
  };

  // Filter salaries by search query and pay period
  const filteredSalaries = salaries.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesPeriod = period === 'ALL' || s.pay_period === period;
    return matchesSearch && matchesPeriod;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Statistics Cards */}
      <SalariesStats summary={summary} onPayAll={handlePayAll} />

      {/* Filter panel */}
      <SalariesFilters 
        search={search} 
        setSearch={setSearch} 
        period={period} 
        setPeriod={setPeriod} 
        periods={periods} 
      />

      {/* Salaries Grid Table */}
      <SalariesTable 
        salaries={filteredSalaries} 
        onPaySalary={handlePaySalary}
        onOpenAdvance={setSelectedAdvance}
        onOpenPayslip={setSelectedPayslip}
      />

      {/* Detailed printable payslip modal */}
      <PayslipModal 
        isOpen={!!selectedPayslip} 
        onClose={() => setSelectedPayslip(null)} 
        salary={selectedPayslip} 
        orders={orders}
      />

      {/* Advance payment & deduction setter modal */}
      <AdvanceModal 
        isOpen={!!selectedAdvance} 
        onClose={() => setSelectedAdvance(null)} 
        salary={selectedAdvance} 
        wallets={wallets} 
        onSubmit={handleAdvanceFineSubmit}
      />

    </div>
  );
};

export default Salaries;
