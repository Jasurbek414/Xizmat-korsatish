import React, { useState, useEffect } from 'react';
import { addNotification } from '../store/mockDb';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

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
  const [completedStatusId, setCompletedStatusId] = useState(null);

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
    const loadData = async () => {
      try {
        const [employeesData, ordersData, statusesData] = await Promise.all([
          api.getEmployees(),
          api.getOrders(),
          api.getOrderStatuses()
        ]);

        const mappedUsers = employeesData.map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName,
          role: u.role,
          phone: u.phone || '',
          status: u.status,
          password: u.password,
          salary: u.salary || '',
          salary_type: u.salaryType || ''
        }));

        const mappedOrders = ordersData.map(o => ({
          id: o.id,
          client_name: o.client ? o.client.fullName : '',
          service_name: o.service ? o.service.nameUz : '',
          worker_name: o.worker ? o.worker.fullName : '',
          price: o.price,
          status_id: o.status ? o.status.id : null
        }));

        // "Yakunlangan" - ro'yxatdagi eng oxirgi bosqich (sort_order bo'yicha).
        const sortedStatuses = [...statusesData].sort((a, b) => a.sortOrder - b.sortOrder);
        const lastStatusId = sortedStatuses.length > 0 ? sortedStatuses.slice(-1)[0].id : null;

        setUsers(mappedUsers);
        setOrders(mappedOrders);
        setCompletedStatusId(lastStatusId);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    };
    loadData();
  }, [tab]);

  // Toggle Employee Status (Faol / Bloklangan)
  const handleToggleStatus = async (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    try {
      await api.updateEmployee(userId, { status: nextStatus });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));

      addNotification(
        `Xodim statusi o'zgardi`,
        `Статус сотрудника изменен`,
        `Employee status changed`,
        `${target.full_name} statusi ${nextStatus === 'ACTIVE' ? 'Faol' : 'Bloklangan'} holatiga o'tkazildi.`,
        `Статус сотрудника ${target.full_name} изменен на ${nextStatus === 'ACTIVE' ? 'Активен' : 'Заблокирован'}.`,
        `Status of ${target.full_name} was changed to ${nextStatus}.`,
        nextStatus === 'ACTIVE' ? 'SUCCESS' : 'WARNING'
      );
    } catch (err) {
      console.error("Failed to toggle employee status:", err);
    }
  };

  // Add or Edit Employee
  const handleSaveEmployee = async (payload) => {
    const isEdit = users.some(u => u.id === payload.id);

    if (isEdit) {
      try {
        const saved = await api.updateEmployee(payload.id, {
          username: payload.username,
          full_name: payload.full_name,
          phone: payload.phone,
          role: payload.role,
          status: payload.status,
          salary: payload.salary,
          salary_type: payload.salary_type
        });

        const updatedUsers = users.map(u => u.id === payload.id ? {
          id: saved.id,
          username: saved.username,
          full_name: saved.fullName,
          role: saved.role,
          phone: saved.phone || '',
          status: saved.status,
          password: saved.password,
          salary: saved.salary || '',
          salary_type: saved.salaryType || ''
        } : u);

        setUsers(updatedUsers);
        setSelectedUserForEdit(null);
      } catch (err) {
        console.error("Failed to update employee:", err);
      }
    } else {
      try {
        const saved = await api.createEmployee({
          username: payload.username,
          password: payload.password || 'admin',
          full_name: payload.full_name,
          phone: payload.phone,
          role: payload.role,
          salary: payload.salary,
          salary_type: payload.salary_type
        });

        const newEmployee = {
          id: saved.id,
          username: saved.username,
          full_name: saved.fullName,
          role: saved.role,
          phone: saved.phone || '',
          status: saved.status,
          password: saved.password,
          salary: saved.salary || '',
          salary_type: saved.salaryType || ''
        };

        setUsers(prev => [...prev, newEmployee]);
        setSelectedUserForEdit(null);

        // Trigger notification
        addNotification(
          `Yangi xodim qo'shildi`,
          `Добавлен новый сотрудник`,
          `New employee added`,
          `Tizimga yangi xodim ${newEmployee.full_name} (${newEmployee.role}) qo'shildi.`,
          `Новый сотрудник ${newEmployee.full_name} (${newEmployee.role}) добавлен в систему.`,
          `New employee ${newEmployee.full_name} (${newEmployee.role}) was added to the system.`,
          'SUCCESS'
        );
      } catch (err) {
        console.error("Failed to save employee:", err);
      }
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (userId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (!window.confirm("Haqiqatan ham ushbu xodimni o'chirib yubormoqchimisiz? Barcha ish haqi va maosh tarixi ham tozalanadi.")) return;

    try {
      await api.deleteEmployee(userId);

      setUsers(prev => prev.filter(u => u.id !== userId));

      addNotification(
        `Xodim o'chirildi`,
        `Сотрудник удален`,
        `Employee deleted`,
        `${targetUser.full_name} tizimdan butunlay o'chirib yuborildi.`,
        `Сотрудник ${targetUser.full_name} был полностью удален из системы.`,
        `Employee ${targetUser.full_name} was completely deleted from the system.`,
        'ERROR'
      );
    } catch (err) {
      console.error("Failed to delete employee:", err);
    }
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
        completedStatusId={completedStatusId}
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
