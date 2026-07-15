import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { addNotification } from '../../store/mockDb';
import { api } from '../../services/api';
import { Plus, Trash2, Edit3, ShieldAlert, Check, X, Shield, Lock } from 'lucide-react';

const EMPTY_PERMISSIONS = {
  clients: false,
  employees: false,
  orders: false,
  finance: false,
  salaries: false,
  settings: false,
  map: false,
  mobile_orders: false,
  mobile_gps: false,
  mobile_finance_view: false,
  mobile_team_view: false,
  mobile_chat: false,
  mobile_salary_view: false
};

const RolesPermissions = () => {
  const { t, i18n } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionKeyList, setPermissionKeyList] = useState(Object.keys(EMPTY_PERMISSIONS));
  const [editingRole, setEditingRole] = useState(null);

  // Form state
  const [roleForm, setRoleForm] = useState({
    name_uz: '',
    name_ru: '',
    name_en: '',
    permissions: { ...EMPTY_PERMISSIONS }
  });

  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allRoles, allUsers, keys] = await Promise.all([
        api.getRoles(),
        api.getEmployees(),
        api.getPermissionKeys()
      ]);
      setRoles(allRoles);
      setUsers(allUsers);
      if (keys && keys.length) {
        setPermissionKeyList(keys);
      }
    } catch (err) {
      setError(err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
  };

  const handlePermissionToggle = (key) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const resetForm = () => {
    setRoleForm({
      name_uz: '',
      name_ru: '',
      name_en: '',
      permissions: Object.fromEntries(permissionKeyList.map(k => [k, false]))
    });
    setEditingRole(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!roleForm.name_uz || !roleForm.name_ru || !roleForm.name_en) {
      setError("Iltimos, barcha tillarda rol nomini to'ldiring!");
      return;
    }

    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, {
          name_uz: roleForm.name_uz,
          name_ru: roleForm.name_ru,
          name_en: roleForm.name_en,
          permissions: roleForm.permissions
        });
        addNotification(
          `Rol ma'lumotlari yangilandi`,
          `Роль обновлена`,
          `Role updated`,
          `"${roleForm.name_uz}" roli va ruxsatnomalari yangilandi.`,
          `Права и название роли "${roleForm.name_ru}" были обновлены.`,
          `Permissions and details of role "${roleForm.name_en}" were updated.`,
          'INFO'
        );
      } else {
        await api.createRole({
          name_uz: roleForm.name_uz,
          name_ru: roleForm.name_ru,
          name_en: roleForm.name_en,
          permissions: roleForm.permissions
        });
        addNotification(
          `Yangi rol yaratildi`,
          `Создана новая роль`,
          `New role created`,
          `Tizimga yangi "${roleForm.name_uz}" roli muvaffaqiyatli qo'shildi.`,
          `В систему успешно добавлена новая роль "${roleForm.name_ru}".`,
          `New role "${roleForm.name_en}" was successfully created in the system.`,
          'SUCCESS'
        );
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err.message || 'Rolni saqlashda xatolik yuz berdi');
    }
  };

  const handleEditClick = (role) => {
    if (role.system) {
      alert(t('settings_page.system_role_warning'));
      return;
    }
    setEditingRole(role);
    setRoleForm({
      name_uz: role.nameUz,
      name_ru: role.nameRu,
      name_en: role.nameEn,
      permissions: { ...Object.fromEntries(permissionKeyList.map(k => [k, false])), ...role.permissions }
    });
  };

  const handleDeleteClick = async (role) => {
    if (role.system) {
      alert(t('settings_page.system_role_warning'));
      return;
    }

    // Check if role is currently assigned to any users
    const isAssigned = users.some(u => u.role === role.key);
    if (isAssigned) {
      alert(t('settings_page.role_delete_has_users'));
      return;
    }

    if (!window.confirm(t('settings_page.role_delete_confirm'))) {
      return;
    }

    try {
      await api.deleteRole(role.id);
      await loadData();

      addNotification(
        `Rol o'chirib yuborildi`,
        `Роль удалена`,
        `Role deleted`,
        `"${role.nameUz}" roli tizimdan o'chirildi.`,
        `Роль "${role.nameRu}" была удалена из системы.`,
        `Role "${role.nameEn}" was deleted from the system.`,
        'ERROR'
      );
    } catch (err) {
      alert(err.message || "Rolni o'chirishda xatolik yuz berdi");
    }
  };

  // Helper to count how many users have this role
  const getUserCountForRole = (roleKey) => {
    return users.filter(u => u.role === roleKey).length;
  };

  const permissionKeys = permissionKeyList.map(key => ({
    key,
    label: t(`settings_page.perm_${key}`)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.roles')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          {t('settings_page.roles_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add/Edit Role */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm text-xs font-semibold">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            {editingRole ? (
              <>
                <Edit3 className="w-4 h-4 text-indigo-500" /> {t('settings_page.edit_role')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.add_role')}
              </>
            )}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-650 rounded-xl p-2.5 text-[10px] font-bold">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.role_name_uz')} *</label>
                <input
                  type="text"
                  value={roleForm.name_uz}
                  onChange={(e) => setRoleForm({ ...roleForm, name_uz: e.target.value })}
                  placeholder="Masalan: Dispetcher"
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.role_name_ru')} *</label>
                <input
                  type="text"
                  value={roleForm.name_ru}
                  onChange={(e) => setRoleForm({ ...roleForm, name_ru: e.target.value })}
                  placeholder="Например: Диспетчер"
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.role_name_en')} *</label>
                <input
                  type="text"
                  value={roleForm.name_en}
                  onChange={(e) => setRoleForm({ ...roleForm, name_en: e.target.value })}
                  placeholder="E.g. Dispatcher"
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-2 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100 dark:border-white/5 pb-1">
                {t('settings_page.permissions')}
              </label>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {permissionKeys.map(({ key, label }) => (
                  <label 
                    key={key} 
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <span className="text-slate-700 dark:text-gray-300 font-medium">{label}</span>
                    <input
                      type="checkbox"
                      checked={roleForm.permissions[key]}
                      onChange={() => handlePermissionToggle(key)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="submit"
                className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingRole ? t('common.save') : t('common.add')}
              </button>
              {(editingRole || roleForm.name_uz || roleForm.name_ru || roleForm.name_en) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Panel: Role List Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit'] mb-4">
              {t('settings_page.roles_list')}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(role => {
                const activePermsCount = Object.values(role.permissions).filter(Boolean).length;
                const totalPermsCount = Object.keys(role.permissions).length;
                const userCount = getUserCountForRole(role.key);
                const roleName = role[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || role.nameUz;

                return (
                  <div 
                    key={role.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Role Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit'] leading-tight">
                            {roleName}
                          </h5>
                          <span className="text-[9px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mt-1">
                            {role.key}
                          </span>
                        </div>
                        {role.system ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 text-[9px] font-bold">
                            <Lock className="w-2.5 h-2.5" /> SYSTEM
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/10 text-[9px] font-bold">
                            <Shield className="w-2.5 h-2.5" /> CUSTOM
                          </span>
                        )}
                      </div>

                      {/* Active Permissions Summary */}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-gray-400 font-semibold mb-1.5">
                          <span>{t('settings_page.permissions')}:</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {activePermsCount} / {totalPermsCount}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {permissionKeys.map(({ key, label }) => {
                            const isAllowed = role.permissions[key];
                            return (
                              <span 
                                key={key}
                                className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold transition border ${
                                  isAllowed 
                                    ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/10' 
                                    : 'bg-slate-100 text-slate-400 dark:bg-white/2 dark:text-gray-600 border-transparent line-through'
                                }`}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer Info / Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-150 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400 dark:text-gray-500 text-[10px]">
                        <strong className="text-slate-700 dark:text-gray-300 font-bold">{userCount}</strong> {t('settings_page.role_users_count')}
                      </span>

                      {!role.system && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick(role)}
                            className="p-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition cursor-pointer"
                            title="Tahrirlash"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            className="p-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-450 hover:bg-rose-500/10 transition cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
