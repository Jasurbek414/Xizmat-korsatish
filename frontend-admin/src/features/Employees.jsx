import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem, addNotification } from '../store/mockDb';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import modular sub-components
import EmployeesStats from './employees/EmployeesStats';
import EmployeesFilters from './employees/EmployeesFilters';
import EmployeesTable from './employees/EmployeesTable';
import EmployeeDetailsModal from './employees/EmployeeDetailsModal';
import CreateEmployeeModal from './employees/CreateEmployeeModal';

const Employees = ({ tab }) => {
  const { t } = useTranslation();
  
  // DB States
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  // Load database items on mount
  useEffect(() => {
    setUsers(getDbItem('users') || []);
    setOrders(getDbItem('orders') || []);
  }, [tab]);

  // Toggle Employee Status (Faol / Bloklangan)
  const handleToggleStatus = (userId) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        
        // Trigger notification
        addNotification(
          `Xodim statusi o'zgardi`,
          `Статус сотрудника изменен`,
          `Employee status changed`,
          `${u.full_name} statusi ${nextStatus === 'ACTIVE' ? 'Faol' : 'Bloklangan'} holatiga o'tkazildi.`,
          `Статус сотрудника ${u.full_name} изменен на ${nextStatus === 'ACTIVE' ? 'Активен' : 'Заблокирован'}.`,
          `Status of ${u.full_name} was changed to ${nextStatus}.`,
          nextStatus === 'ACTIVE' ? 'SUCCESS' : 'WARNING'
        );
        
        return { ...u, status: nextStatus };
      }
      return u;
    });

    setUsers(updated);
    setDbItem('users', updated);
  };

  // Add or Edit Employee
  const handleSaveEmployee = (payload) => {
    const isEdit = users.some(u => u.id === payload.id);
    let updatedUsers = [];

    if (isEdit) {
      // Edit mode
      updatedUsers = users.map(u => u.id === payload.id ? payload : u);
      
      // Update name in Salaries table as well for consistency
      const salaries = getDbItem('salaries') || [];
      const updatedSalaries = salaries.map(s => {
        if (s.user_id === payload.id) {
          return { ...s, full_name: payload.full_name };
        }
        return s;
      });
      setDbItem('salaries', updatedSalaries);

      // Trigger notification
      addNotification(
        `Xodim ma'lumotlari tahrirlandi`,
        `Данные сотрудника изменены`,
        `Employee details edited`,
        `${payload.full_name} ma'lumotlari muvaffaqiyatli yangilandi.`,
        `Данные сотрудника ${payload.full_name} успешно обновлены.`,
        `Details of employee ${payload.full_name} were successfully updated.`,
        'INFO'
      );
    } else {
      // Create mode
      updatedUsers = [...users, payload];

      // Automatically register the new employee in the Salaries (Payroll) database
      const salaries = getDbItem('salaries') || [];
      const newSalary = {
        id: 's' + Date.now(),
        user_id: payload.id,
        full_name: payload.full_name,
        base_salary: 3000000, // Default base salary 3,000,000 UZS
        bonus: 0,
        deductions: 0,
        status: 'UNPAID',
        pay_period: new Date().toISOString().slice(0, 7) // e.g. "2026-06"
      };
      setDbItem('salaries', [...salaries, newSalary]);

      // Trigger notification
      addNotification(
        `Yangi xodim qo'shildi`,
        `Добавлен новый сотрудник`,
        `New employee added`,
        `Tizimga yeni xodim ${payload.full_name} (${payload.role}) qo'shildi.`,
        `Новый сотрудник ${payload.full_name} (${payload.role}) добавлен в систему.`,
        `New employee ${payload.full_name} (${payload.role}) was added to the system.`,
        'SUCCESS'
      );
    }

    setUsers(updatedUsers);
    setDbItem('users', updatedUsers);
    setSelectedUserForEdit(null);
  };

  // Delete Employee
  const handleDeleteEmployee = (userId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (!window.confirm("Haqiqatan ham ushbu xodimni o'chirib yubormoqchimisiz? Barcha ish haqi va maosh tarixi ham tozalanadi.")) return;

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    setDbItem('users', updated);

    // Clean up Salaries database for deleted employee
    const salaries = getDbItem('salaries') || [];
    const updatedSalaries = salaries.filter(s => s.user_id !== userId);
    setDbItem('salaries', updatedSalaries);

    // Trigger notification
    addNotification(
      `Xodim o'chirildi`,
      `Сотрудник удален`,
      `Employee deleted`,
      `${targetUser.full_name} tizimdan butunlay o'chirib yuborildi.`,
      `Сотрудник ${targetUser.full_name} был полностью удален из системы.`,
      `Employee ${targetUser.full_name} was completely deleted from the system.`,
      'ERROR'
    );
  };

  // Apply filters on the users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(search.toLowerCase()) || 
      u.phone.includes(search) || 
      u.username.toLowerCase().includes(search.toLowerCase());

    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('employees_page.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('employees_page.desc')}</p>
        </div>

        <button 
          onClick={() => { setSelectedUserForEdit(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer w-fit shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('employees_page.add_employee')}
        </button>
      </div>

      {/* Stats overview cards */}
      <EmployeesStats users={users} />

      {/* Filters and search section */}
      <EmployeesFilters 
        search={search}
        setSearch={setSearch}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {/* Main employees list grid table */}
      <EmployeesTable 
        users={filteredUsers}
        onToggleStatus={handleToggleStatus}
        onOpenDetails={setSelectedUserForDetails}
        onOpenEdit={(user) => { setSelectedUserForEdit(user); setShowCreateModal(true); }}
        onDelete={handleDeleteEmployee}
      />

      {/* Employee Details / OSM track modal */}
      <EmployeeDetailsModal 
        isOpen={!!selectedUserForDetails}
        onClose={() => setSelectedUserForDetails(null)}
        user={selectedUserForDetails}
        orders={orders}
      />

      {/* Add / Edit Employee modal form */}
      <CreateEmployeeModal 
        isOpen={showCreateModal || !!selectedUserForEdit}
        onClose={() => { setShowCreateModal(false); setSelectedUserForEdit(null); }}
        employee={selectedUserForEdit}
        onSubmit={handleSaveEmployee}
      />

    </div>
  );
};

export default Employees;
