import React, { useState, useEffect } from 'react';
import { getDbItem } from '../store/mockDb';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

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
  const [completedStatusId, setCompletedStatusId] = useState(null);

  // Load database items and calculate dynamic commissions
  const loadData = async () => {
    try {
      const [salariesData, ordersData, statusesData] = await Promise.all([
        api.getSalaries(),
        api.getOrders(),
        api.getOrderStatuses()
      ]);

      // "Yakunlangan" - ro'yxatdagi eng oxirgi bosqich (sort_order bo'yicha),
      // chunki har bir kompaniya statuslarni o'zi moslashtirib sozlaydi.
      const sortedStatuses = [...statusesData].sort((a, b) => a.sortOrder - b.sortOrder);
      const completedStatusId = sortedStatuses.length > 0 ? sortedStatuses.slice(-1)[0].id : null;

      const mappedOrders = ordersData.map(o => ({
        id: o.id,
        worker_name: o.worker ? o.worker.fullName : '',
        price: o.price,
        status_id: o.status ? o.status.id : null,
        created_at: o.createdAt
      }));

      const computedSalaries = salariesData.map(sal => {
        const payPeriodStr = sal.payPeriod.substring(0, 7); // e.g. "2026-06"

        // Find completed orders for this worker in this period
        const workerCompletedOrders = mappedOrders.filter(ord => {
          const isWorker = ord.worker_name.toLowerCase() === sal.user.fullName.toLowerCase();
          const isCompleted = completedStatusId !== null && ord.status_id === completedStatusId;
          const ordPeriod = ord.created_at ? ord.created_at.slice(0, 7) : '';
          return isWorker && isCompleted && ordPeriod === payPeriodStr;
        });

        const totalOrdersAmount = workerCompletedOrders.reduce((sum, ord) => sum + ord.price, 0);
        const commission = Math.round(totalOrdersAmount * 0.1); // 10% commission

        return {
          id: sal.id,
          user_id: sal.user.id,
          full_name: sal.user.fullName,
          base_salary: sal.baseSalary,
          bonus: sal.bonus + commission,
          deductions: sal.deductions,
          status: sal.status,
          pay_period: payPeriodStr
        };
      });

      setSalaries(computedSalaries);
      setOrders(mappedOrders);
      setCompletedStatusId(completedStatusId);

      // Extract unique periods
      const uniquePeriods = [...new Set(computedSalaries.map(s => s.pay_period))];
      setPeriods(uniquePeriods);

      // Calculate Summary Stats
      const total = computedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const paid = computedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const pending = computedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);

      setSummary({ total, paid, pending });
    } catch (err) {
      console.error("Failed to load salaries:", err);
    }
  };

  useEffect(() => {
    loadData();
    setWallets(getDbItem('wallets') || []);
  }, [tab]);

  // Joriy oy uchun oyligi sozlangan barcha faol xodimlarga oylik hisobini yaratadi
  // (avval yaratilganlar qayta o'tkazib yuboriladi - dublikat bo'lmaydi).
  const handleGeneratePayroll = async () => {
    if (!window.confirm("Joriy oy uchun barcha xodimlarga oylik hisobi yaratilsinmi?")) return;
    try {
      const result = await api.generatePayroll();
      alert(result.message || "Oylik hisoblari yaratildi");
      await loadData();
    } catch (err) {
      alert(err.message || "Oylik hisobini yaratishda xatolik yuz berdi");
    }
  };

  // Pay single employee salary
  const handlePaySalary = async (id) => {
    try {
      await api.paySalary(id);

      const updatedSalaries = salaries.map(s => {
        if (s.id === id) return { ...s, status: 'PAID' };
        return s;
      });
      setSalaries(updatedSalaries);

      // Update Summary
      const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      setSummary({ total, paid, pending });
    } catch (err) {
      alert(err.message || "Maosh to'lashda xatolik yuz berdi");
    }
  };

  // Pay all pending salaries in batch - backend allaqachon har bir to'lov uchun
  // xarajat tranzaksiyasini avtomatik yaratadi (SalaryController.paySalary), shu
  // sabab bu yerda alohida "kassa"/tranzaksiya simulyatsiyasi kerak emas.
  const handlePayAll = async () => {
    const unpaidList = filteredSalaries.filter(s => s.status === 'UNPAID');
    if (unpaidList.length === 0) return;

    const totalPayout = unpaidList.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
    if (!window.confirm(`Haqiqatan ham barcha ${unpaidList.length} ta xodimning oyliklarini (Jami: ${totalPayout.toLocaleString()} UZS) to'lamoqchimisiz?`)) return;

    try {
      for (const salaryToPay of unpaidList) {
        await api.paySalary(salaryToPay.id);
      }

      const updatedSalaries = salaries.map(s =>
        unpaidList.some(unp => unp.id === s.id) ? { ...s, status: 'PAID' } : s
      );
      setSalaries(updatedSalaries);

      const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      setSummary({ total, paid, pending });
    } catch (err) {
      alert(err.message || "Guruhli to'lovda xatolik yuz berdi");
    }
  };

  // Submit Advance or Deduction/Fine
  const handleAdvanceFineSubmit = async (salaryId, type, amt, desc, walletId) => {
    try {
      await api.addSalaryDeduction(salaryId, amt);

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

      // Update Summary
      const total = updatedSalaries.reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.base_salary + s.bonus - s.deductions, 0);
      setSummary({ total, paid, pending });
    } catch (err) {
      alert(err.message || "Avans/Jarima saqlashda xatolik yuz berdi");
    }
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
      <SalariesStats summary={summary} onPayAll={handlePayAll} onGeneratePayroll={handleGeneratePayroll} />

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
        completedStatusId={completedStatusId}
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
