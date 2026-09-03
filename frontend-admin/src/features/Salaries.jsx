import React, { useState, useEffect } from 'react';
import { getDbItem } from '../store/mockDb';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { confirmDialog } from '../services/confirmDialog';
import { showToast } from '../services/toast';
import PageLoader from '../components/PageLoader';

// Import modular components
import SalariesStats from './salaries/SalariesStats';
import SalariesFilters from './salaries/SalariesFilters';
import SalariesTable from './salaries/SalariesTable';
import PayslipModal from './salaries/PayslipModal';
import AdvanceModal from './salaries/AdvanceModal';
import AttendanceModal from './salaries/AttendanceModal';

// Net oylik: asosiy oylik + bonus - qo'lda kiritilgan chegirma - davomat
// (kelmagan kunlar) chegirmasi. Backend (SalaryController) bilan bir xil
// formula - ekranda ko'rsatilgan summa haqiqiy to'lov bilan mos kelishi uchun.
const netOf = (s) => s.base_salary + s.bonus - s.deductions - (s.attendance_deduction || 0);

const Salaries = ({ tab }) => {
  const { t } = useTranslation();

  // State from LocalStorage
  const [salaries, setSalaries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);

  // UI / Filters State
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('ALL');
  const [periods, setPeriods] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });

  // Selected records for Modals
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [completedStatusId, setCompletedStatusId] = useState(null);

  // Load database items and calculate dynamic commissions
  const [pageLoading, setPageLoading] = useState(true);

  const loadData = async () => {
    try {
      // MUHIM: getOrders/getOrderStatuses ALOHIDA .catch bilan o'ralgan -
      // bular "orders" huquqini talab qiladi, Buxgalter rolida bu huquq
      // yo'q (faqat "salaries" bor). Avval bittasi 403 qaytarsa BUTUN
      // Oyliklar sahifasi bo'sh qolardi - jonli aniqlangan, Buxgalter uchun
      // bu ikkinchi (va oxirgi) ishlashi kerak bo'lgan modul edi.
      const [salariesData, ordersData, statusesData, employeesData] = await Promise.all([
        api.getSalaries(),
        api.getOrders({ silent403: true }).catch(() => []),
        api.getOrderStatuses({ silent403: true }).catch(() => []),
        api.getEmployees({ silent403: true }).catch(() => [])
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

      // MUHIM (audit'da topilgan xato, tuzatildi): komissiya avval bu yerda
      // qattiq yozilgan "10%" bilan HAR SAFAR qayta hisoblanardi - kompaniyaning
      // Sozlamalar > Umumiy'da o'zi belgilagan "Haydovchi KPI foizi"ni butunlay
      // e'tiborsiz qoldirib, va HAQIQIY to'lovda (SalaryController.paySalary)
      // ishtirok etmasdi (faqat ko'rinish uchun soxta raqam edi - Payslip'da
      // chop etilgan summa bilan Moliyada qayd etilgan haqiqiy to'lov mos
      // kelmasdi). Endi backend (/salaries/generate) buni to'g'ri foiz bilan
      // hisoblab, Salary.bonus'ga bir marta yozadi - shu yerda faqat backend
      // qaytargan qiymat ko'rsatiladi.
      const computedSalaries = salariesData.map(sal => {
        const payPeriodStr = sal.payPeriod.substring(0, 7); // e.g. "2026-06"

        return {
          id: sal.id,
          user_id: sal.user.id,
          full_name: sal.user.fullName,
          hire_date: sal.user.hireDate || '',
          base_salary: sal.baseSalary,
          bonus: sal.bonus,
          deductions: sal.deductions,
          working_days: sal.workingDays || null,
          absent_days: sal.absentDays || 0,
          attendance_deduction: sal.attendanceDeduction || 0,
          status: sal.status,
          pay_period: payPeriodStr
        };
      });

      setSalaries(computedSalaries);
      setOrders(mappedOrders);
      setEmployees((employeesData || []).map(e => ({
        id: e.id,
        full_name: e.fullName,
        status: e.status
      })));
      setCompletedStatusId(completedStatusId);

      // Extract unique periods
      const uniquePeriods = [...new Set(computedSalaries.map(s => s.pay_period))];
      setPeriods(uniquePeriods);

      // Calculate Summary Stats
      const total = computedSalaries.reduce((sum, s) => sum + netOf(s), 0);
      const paid = computedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + netOf(s), 0);
      const pending = computedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + netOf(s), 0);

      setSummary({ total, paid, pending });
    } catch (err) {
      console.error("Failed to load salaries:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setWallets(getDbItem('wallets') || []);
  }, [tab]);

  // Joriy oy uchun oyligi sozlangan barcha faol xodimlarga oylik hisobini yaratadi
  // (avval yaratilganlar qayta o'tkazib yuboriladi - dublikat bo'lmaydi).
  const handleGeneratePayroll = async () => {
    if (!(await confirmDialog("Joriy oy uchun barcha xodimlarga oylik hisobi yaratilsinmi?", { danger: false }))) return;
    try {
      const result = await api.generatePayroll();
      showToast(result.message || "Oylik hisoblari yaratildi", 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || "Oylik hisobini yaratishda xatolik yuz berdi");
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
      const total = updatedSalaries.reduce((sum, s) => sum + netOf(s), 0);
      const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + netOf(s), 0);
      const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + netOf(s), 0);
      setSummary({ total, paid, pending });
    } catch (err) {
      showToast(err.message || "Maosh to'lashda xatolik yuz berdi");
    }
  };

  // Xato bilan "To'landi" deb belgilangan hisobni bekor qilish - status
  // UNPAID'ga qaytadi va tegishli xarajat tranzaksiyasi Moliyadan o'chiriladi
  // (summa balansga qaytadi). loadData() bilan qayta yuklanadi - shu bilan
  // Moliya sahifasidagi hisobotlar ham darhol to'g'ri holatga keladi.
  const handleUnpaySalary = async (id) => {
    if (!(await confirmDialog("Ushbu \"to'landi\" belgisini bekor qilib, maoshni qaytadan to'lanmagan holatga o'tkazasizmi? Tegishli xarajat yozuvi Moliyadan o'chiriladi.", { danger: true }))) return;
    try {
      await api.unpaySalary(id);
      showToast("To'lov bekor qilindi, summa balansga qaytarildi", 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || "To'lovni bekor qilishda xatolik yuz berdi");
    }
  };

  // Pay all pending salaries in batch - backend allaqachon har bir to'lov uchun
  // xarajat tranzaksiyasini avtomatik yaratadi (SalaryController.paySalary), shu
  // sabab bu yerda alohida "kassa"/tranzaksiya simulyatsiyasi kerak emas.
  //
  // MUHIM (audit'da topilgan xato, tuzatildi): avval bitta try/catch ICHIDA
  // ketma-ket so'rov yuborilardi - ro'yxat o'rtasida (masalan 10 tadan
  // 3-chisida) tarmoq xatosi chiqsa, BUTUN sikl to'xtab qolar va qolgan 7
  // kishiga umuman to'lov yuborilmasdi. Ustiga, allaqachon muvaffaqiyatli
  // to'langan 1-2 kishi ham ekranda hamon "to'lanmagan" bo'lib qolardi
  // (state faqat siklning oxirida, TO'LIQ tugagach yangilanardi) - admin
  // buni ko'rib tugmani qayta bossa, backend har bir alohida to'lovni
  // "allaqachon to'langan" tekshiruvi bilan himoyalagani uchun (paySalary,
  // status=PAID bo'lsa 400) ikki marta pul KETMAYDI, lekin sikl aynan o'sha
  // birinchi "allaqachon to'langan" xatosida yana to'xtab, ORQADAGI hali
  // to'lanmagan xodimlarga navbat YETIB BORMAY qolishi mumkin edi. Endi har
  // bir to'lov ALOHIDA xato ushlanadi (bittasi yiqilsa ham qolganlari
  // davom etadi) va oxirida ekran backend'dagi HAQIQIY holat bilan qayta
  // sinxronlanadi (lokal taxminga ishonilmaydi).
  const handlePayAll = async () => {
    const unpaidList = filteredSalaries.filter(s => s.status === 'UNPAID');
    if (unpaidList.length === 0) return;

    const totalPayout = unpaidList.reduce((sum, s) => sum + netOf(s), 0);
    if (!(await confirmDialog(`Haqiqatan ham barcha ${unpaidList.length} ta xodimning oyliklarini (Jami: ${totalPayout.toLocaleString()} UZS) to'lamoqchimisiz?`, { danger: false }))) return;

    let successCount = 0;
    let failCount = 0;
    for (const salaryToPay of unpaidList) {
      try {
        await api.paySalary(salaryToPay.id);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    await loadData();

    if (failCount === 0) {
      showToast(`${successCount} ta xodimning oyligi muvaffaqiyatli to'landi`, 'success');
    } else {
      showToast(`${successCount} ta to'landi, ${failCount} tasida xatolik yuz berdi - ro'yxatni tekshirib qayta urinib ko'ring`);
    }
  };

  // Submit Advance/Fine (chegirma) yoki Bonus qo'shish/olib tashlash
  const handleAdvanceFineSubmit = async (salaryId, type, amt, desc, walletId) => {
    try {
      if (type === 'BONUS_ADD') {
        await api.addSalaryBonus(salaryId, amt);
      } else if (type === 'BONUS_REMOVE') {
        await api.removeSalaryBonus(salaryId, amt);
      } else if (type === 'DEDUCTION_REMOVE') {
        await api.removeSalaryDeduction(salaryId, amt);
      } else {
        await api.addSalaryDeduction(salaryId, amt);
      }

      const updatedSalaries = salaries.map(s => {
        if (s.id !== salaryId) return s;
        if (type === 'BONUS_ADD') return { ...s, bonus: s.bonus + amt };
        if (type === 'BONUS_REMOVE') return { ...s, bonus: s.bonus - amt };
        if (type === 'DEDUCTION_REMOVE') return { ...s, deductions: s.deductions - amt };
        return { ...s, deductions: s.deductions + amt };
      });

      setSalaries(updatedSalaries);

      // Update Summary
      const total = updatedSalaries.reduce((sum, s) => sum + netOf(s), 0);
      const paid = updatedSalaries.filter(s => s.status === 'PAID').reduce((sum, s) => sum + netOf(s), 0);
      const pending = updatedSalaries.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + netOf(s), 0);
      setSummary({ total, paid, pending });
    } catch (err) {
      showToast(err.message || "Amalni bajarishda xatolik yuz berdi");
    }
  };

  // Filter salaries by search query and pay period
  const filteredSalaries = salaries.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesPeriod = period === 'ALL' || s.pay_period === period;
    return matchesSearch && matchesPeriod;
  });

  if (pageLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Statistics Cards */}
      <SalariesStats
        summary={summary}
        onPayAll={handlePayAll}
        onGeneratePayroll={handleGeneratePayroll}
        onOpenAttendance={() => setShowAttendance(true)}
      />

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
        onUnpaySalary={handleUnpaySalary}
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

      {/* Attendance (davomat) - ishga kelmagan kunlarni belgilash */}
      <AttendanceModal
        isOpen={showAttendance}
        onClose={() => setShowAttendance(false)}
        employees={employees}
      />

    </div>
  );
};

export default Salaries;
