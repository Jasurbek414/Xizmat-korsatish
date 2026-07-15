import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Plus, Trash2, Edit3, ShieldAlert, Lock, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminUsers = ({ currentAuthUser }) => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  
  // Modals & Editing
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', phone: '', role: '', password: '', status: 'ACTIVE' });
  const [showPasswordModal, setShowPasswordModal] = useState(null); // stores user to reset password for
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  // Mobil-ilova rollari (haydovchi/ishchi/sex hodimi) alohida "Xodimlar" sahifasida
  // boshqariladi - bu sahifa faqat web-admin panelga kira oladigan xodimlar uchun.
  const MOBILE_ONLY_ROLE_KEYS = ['WORKER_DRIVER', 'WORKER', 'WORKER_SEH'];

  const loadUsers = async () => {
    try {
      const [allUsers, allRoles] = await Promise.all([
        api.getEmployees(),
        api.getRoles()
      ]);

      const mappedUsers = allUsers.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        phone: u.phone || '',
        role: u.role,
        status: u.status
      }));
      setUsers(mappedUsers);

      const dashboardStaff = mappedUsers.filter(u => !MOBILE_ONLY_ROLE_KEYS.includes(u.role));
      setAdminsList(dashboardStaff);

      const dashboardRoles = allRoles
        .filter(r => !MOBILE_ONLY_ROLE_KEYS.includes(r.key))
        .map(r => ({
          id: r.key,
          name_uz: r.nameUz,
          name_ru: r.nameRu,
          name_en: r.nameEn
        }));
      setRoles(dashboardRoles);

      setNewUser(prev => ({
        ...prev,
        role: prev.role || dashboardRoles[0]?.id || ''
      }));
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.full_name || !newUser.password) return;

    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      alert('Ushbu logindagi foydalanuvchi tizimda mavjud!');
      return;
    }

    try {
      await api.createEmployee({
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        phone: newUser.phone,
        role: newUser.role
      });
      loadUsers();
      setNewUser({ username: '', full_name: '', phone: '', role: roles[0]?.id || '', password: '', status: 'ACTIVE' });
    } catch (err) {
      console.error("Failed to create admin:", err);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingUser.username || !editingUser.full_name) return;

    try {
      await api.updateEmployee(editingUser.id, {
        username: editingUser.username,
        full_name: editingUser.full_name,
        phone: editingUser.phone,
        role: editingUser.role,
        status: editingUser.status
      });
      loadUsers();
      setEditingUser(null);
    } catch (err) {
      console.error("Failed to update admin:", err);
    }
  };

  const handleDelete = async (id) => {
    const target = users.find(u => u.id === id);
    if (currentAuthUser && currentAuthUser.username === target?.username) {
      alert('O\'zingizning hisobingizni o\'chira olmaysiz!');
      return;
    }
    if (!window.confirm("Haqiqatan ham ushbu foydalanuvchini o'chirmoqchimisiz?")) return;

    try {
      await api.deleteEmployee(id);
      loadUsers();
    } catch (err) {
      console.error("Failed to delete admin:", err);
    }
  };

  const toggleStatus = async (user) => {
    if (currentAuthUser && currentAuthUser.username === user.username) {
      alert('O\'zingizning hisobingiz holatini o\'zgartira olmaysiz!');
      return;
    }

    const updatedStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.updateEmployee(user.id, {
        status: updatedStatus
      });
      loadUsers();
    } catch (err) {
      console.error("Failed to toggle admin status:", err);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    try {
      await api.resetEmployeePassword(showPasswordModal.id, newPassword);
      loadUsers();
      setShowPasswordModal(null);
      setNewPassword('');
      alert('Parol muvaffaqiyatli o\'zgartirildi!');
    } catch (err) {
      console.error("Failed to reset password:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.admins')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Dashboard ma'murlari, dispetcherlar va operatorlar ro'yxati va ruxsatnomalari.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add/Edit Staff Form */}
        <div className="glass-card p-6 rounded-2xl space-y-4 h-fit border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 font-['Outfit']">
            {editingUser ? (
              <>
                <Edit3 className="w-4 h-4 text-indigo-500" /> Tahrirlash: {editingUser.full_name}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-500" /> {t('settings_page.add_admin')}
              </>
            )}
          </h4>

          <form onSubmit={editingUser ? handleUpdateAdmin : handleAddAdmin} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.admin_fullname')}</label>
              <input
                type="text"
                value={editingUser ? editingUser.full_name : newUser.full_name}
                onChange={(e) => editingUser 
                  ? setEditingUser({ ...editingUser, full_name: e.target.value })
                  : setNewUser({ ...newUser, full_name: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.admin_username')}</label>
              <input
                type="text"
                value={editingUser ? editingUser.username : newUser.username}
                onChange={(e) => editingUser 
                  ? setEditingUser({ ...editingUser, username: e.target.value })
                  : setNewUser({ ...newUser, username: e.target.value })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.phone')}</label>
                <input
                  type="text"
                  value={editingUser ? editingUser.phone : newUser.phone}
                  onChange={(e) => editingUser 
                    ? setEditingUser({ ...editingUser, phone: e.target.value })
                    : setNewUser({ ...newUser, phone: e.target.value })
                  }
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="+998 90..."
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.admin_role')}</label>
                <select
                  value={editingUser ? editingUser.role : newUser.role}
                  onChange={(e) => editingUser 
                    ? setEditingUser({ ...editingUser, role: e.target.value })
                    : setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-850 dark:text-white focus:outline-none font-semibold cursor-pointer"
                >
                  {roles.map(r => {
                    const rName = r[`name_${i18n.language}`] || r.name_uz;
                    return (
                      <option key={r.id} value={r.id}>{rName}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.admin_password')}</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
              >
                {editingUser ? t('common.save') : t('common.add')}
              </button>
              {editingUser && (
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Staff Table */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit'] mb-4">Mavjud Xodimlar</h4>
          <div className="overflow-hidden border border-slate-200 dark:border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">{t('settings_page.admin_fullname')}</th>
                  <th className="p-4">{t('settings_page.admin_username')}</th>
                  <th className="p-4">{t('settings_page.admin_role')}</th>
                  <th className="p-4">{t('common.status')}</th>
                  <th className="p-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
                {adminsList.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-white">{user.full_name}</div>
                      <div className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">{user.phone || 'Telefon yo\'q'}</div>
                    </td>
                    <td className="p-4 font-mono text-[10px]">{user.username}</td>
                    <td className="p-4">
                      {(() => {
                        const roleObj = roles.find(r => r.id === user.role);
                        const roleName = roleObj ? (roleObj[`name_${i18n.language}`] || roleObj.name_uz) : user.role;
                        const badgeColor = user.role === 'ADMIN'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                          : user.role === 'DISPATCHER'
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/10'
                          : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/10';
                        return (
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                            {roleName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(user)}
                        className="flex items-center gap-1 hover:opacity-85 cursor-pointer text-slate-500 dark:text-gray-400 transition"
                      >
                        {user.status === 'ACTIVE' ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">FAOL</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-slate-350 dark:text-slate-700" />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550">BLOKLANGAN</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setShowPasswordModal(user)}
                        className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                        title="Parolni almashtirish"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827] shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">Parolni o'zgartirish</h4>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">{showPasswordModal.full_name} uchun yangi parol o'rnating</p>
              </div>
              <button 
                onClick={() => setShowPasswordModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Yangi Parol</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  O'zgartirish
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
