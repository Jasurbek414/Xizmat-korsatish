import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addNotification } from '../../store/mockDb';
import { api } from '../../services/api';
import {
  Plus, Trash2, Copy, Check, X, Shield, Lock, Search, Save,
  LayoutDashboard, Smartphone, Zap, MoreHorizontal, Users, AlertTriangle, KeyRound
} from 'lucide-react';

/**
 * Huquqlar tematik guruhlarga bo'linadi - avval 20 ta kalit bitta uzun ro'yxatda
 * aralash turardi va admin "mobile_gps" bilan "record_income" o'rtasidagi farqni
 * faqat nomidan taxmin qilardi. Guruhlar faqat KO'RINISH uchun: backend'ga baribir
 * tekis (flat) permissions xaritasi yuboriladi.
 */
const PERMISSION_GROUPS = [
  {
    id: 'access',
    icon: KeyRound,
    accent: 'rose',
    keys: ['web_login']
  },
  {
    id: 'panel',
    icon: LayoutDashboard,
    accent: 'indigo',
    keys: ['clients', 'employees', 'orders', 'finance', 'salaries', 'settings', 'map', 'telephony']
  },
  {
    id: 'mobile',
    icon: Smartphone,
    accent: 'sky',
    keys: ['mobile_orders', 'mobile_gps', 'mobile_finance_view', 'mobile_team_view', 'mobile_chat', 'mobile_salary_view']
  },
  {
    id: 'actions',
    icon: Zap,
    accent: 'amber',
    keys: ['assign_measurement_unit', 'update_order_status', 'write_order_notes', 'set_order_price', 'record_income', 'record_expense']
  }
];

const ACCENTS = {
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/15',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/15',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/15',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/15',
  slate: 'text-slate-600 dark:text-gray-400 bg-slate-500/10 border-slate-500/15'
};

const NEW_ROLE = '__new__';

const emptyDraft = (keys) => ({
  name_uz: '',
  name_ru: '',
  name_en: '',
  permissions: Object.fromEntries(keys.map(k => [k, false]))
});

/** Yoqilgan/o'chirilgan holat bir qarashda ko'rinishi uchun oddiy checkbox emas, switch. */
const Toggle = ({ on, disabled }) => (
  <span
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition duration-200 ${
      on ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/10'
    } ${disabled ? 'opacity-40' : ''}`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ${
        on ? 'translate-x-[19px]' : 'translate-x-[3px]'
      }`}
    />
  </span>
);

const RolesPermissions = () => {
  const { t, i18n } = useTranslation();

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (selectAfter) => {
    try {
      const [allRoles, allUsers, keys] = await Promise.all([
        api.getRoles(),
        api.getEmployees(),
        api.getPermissionKeys()
      ]);
      setRoles(allRoles || []);
      setUsers(allUsers || []);
      setPermissionKeys(keys && keys.length ? keys : []);

      // Sahifa ochilganda o'ng panel bo'sh turmasligi uchun birinchi rolni tanlaymiz.
      const target = selectAfter || selectedId;
      const exists = (allRoles || []).some(r => r.id === target);
      const pick = exists ? target : (allRoles && allRoles.length ? allRoles[0].id : null);
      if (pick) openRole((allRoles || []).find(r => r.id === pick), keys);
      else setSelectedId(null);
    } catch (err) {
      setError(err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
  };

  const roleName = (role) => {
    const lang = (i18n.language || 'uz').slice(0, 2);
    if (lang === 'ru') return role.nameRu || role.nameUz;
    if (lang === 'en') return role.nameEn || role.nameUz;
    return role.nameUz;
  };

  const openRole = (role, keys) => {
    if (!role) return;
    const keyList = keys && keys.length ? keys : permissionKeys;
    setSelectedId(role.id);
    setDraft({
      name_uz: role.nameUz || '',
      name_ru: role.nameRu || '',
      name_en: role.nameEn || '',
      // Eski rollarda yangi qo'shilgan kalitlar umuman bo'lmasligi mumkin -
      // avval hammasini false qilib, keyin saqlanganini ustidan yozamiz.
      permissions: { ...Object.fromEntries(keyList.map(k => [k, false])), ...(role.permissions || {}) }
    });
    setError('');
    setConfirmDelete(false);
  };

  const startNewRole = (source) => {
    setSelectedId(NEW_ROLE);
    setError('');
    setConfirmDelete(false);
    if (source) {
      const suffix = t('settings_page.role_duplicate_suffix');
      setDraft({
        name_uz: `${source.nameUz} ${suffix}`,
        name_ru: `${source.nameRu} ${suffix}`,
        name_en: `${source.nameEn} ${suffix}`,
        permissions: { ...Object.fromEntries(permissionKeys.map(k => [k, false])), ...(source.permissions || {}) }
      });
    } else {
      setDraft(emptyDraft(permissionKeys));
    }
  };

  const selectedRole = selectedId && selectedId !== NEW_ROLE
    ? roles.find(r => r.id === selectedId)
    : null;
  const isNew = selectedId === NEW_ROLE;
  const readOnly = !!(selectedRole && selectedRole.system);

  const userCount = (roleKey) => users.filter(u => u.role === roleKey).length;

  /**
   * Backend yangi kalit qo'shsa-yu, u yuqoridagi guruhlarga kiritilmagan bo'lsa
   * ham UI'dan yo'qolib qolmasligi kerak - qolganlari "boshqa" guruhiga tushadi.
   */
  const groups = useMemo(() => {
    const grouped = PERMISSION_GROUPS.map(g => ({
      ...g,
      keys: g.keys.filter(k => permissionKeys.includes(k))
    })).filter(g => g.keys.length);

    const used = new Set(grouped.flatMap(g => g.keys));
    const rest = permissionKeys.filter(k => !used.has(k));
    if (rest.length) {
      grouped.push({ id: 'other', icon: MoreHorizontal, accent: 'slate', keys: rest });
    }
    return grouped;
  }, [permissionKeys]);

  const query = search.trim().toLowerCase();
  const matches = (key) =>
    !query ||
    t(`settings_page.perm_${key}`).toLowerCase().includes(query) ||
    t(`settings_page.perm_${key}_desc`).toLowerCase().includes(query) ||
    key.toLowerCase().includes(query);

  const visibleGroups = groups
    .map(g => ({ ...g, visibleKeys: g.keys.filter(matches) }))
    .filter(g => g.visibleKeys.length);

  const activeCount = draft
    ? permissionKeys.filter(k => draft.permissions[k]).length
    : 0;

  const togglePermission = (key) => {
    if (readOnly) return;
    setDraft(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

  const setGroup = (keys, value) => {
    if (readOnly) return;
    setDraft(prev => ({
      ...prev,
      permissions: { ...prev.permissions, ...Object.fromEntries(keys.map(k => [k, value])) }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!draft.name_uz.trim() || !draft.name_ru.trim() || !draft.name_en.trim()) {
      setError("Iltimos, rol nomini uchala tilda ham to'ldiring!");
      return;
    }

    const payload = {
      name_uz: draft.name_uz.trim(),
      name_ru: draft.name_ru.trim(),
      name_en: draft.name_en.trim(),
      permissions: draft.permissions
    };

    setSaving(true);
    try {
      if (isNew) {
        const created = await api.createRole(payload);
        addNotification(
          'Yangi rol yaratildi',
          'Создана новая роль',
          'New role created',
          `Tizimga yangi "${payload.name_uz}" roli muvaffaqiyatli qo'shildi.`,
          `В систему успешно добавлена новая роль "${payload.name_ru}".`,
          `New role "${payload.name_en}" was successfully created in the system.`,
          'SUCCESS'
        );
        await loadData(created && created.id);
      } else {
        await api.updateRole(selectedRole.id, payload);
        addNotification(
          "Rol ma'lumotlari yangilandi",
          'Роль обновлена',
          'Role updated',
          `"${payload.name_uz}" roli va ruxsatnomalari yangilandi.`,
          `Права и название роли "${payload.name_ru}" были обновлены.`,
          `Permissions and details of role "${payload.name_en}" were updated.`,
          'INFO'
        );
        await loadData(selectedRole.id);
      }
    } catch (err) {
      setError(err.message || 'Rolni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.system) return;

    if (userCount(selectedRole.key) > 0) {
      setConfirmDelete(false);
      setError(t('settings_page.role_delete_has_users'));
      return;
    }

    try {
      await api.deleteRole(selectedRole.id);
      addNotification(
        "Rol o'chirib yuborildi",
        'Роль удалена',
        'Role deleted',
        `"${selectedRole.nameUz}" roli tizimdan o'chirildi.`,
        `Роль "${selectedRole.nameRu}" была удалена из системы.`,
        `Role "${selectedRole.nameEn}" was deleted from the system.`,
        'ERROR'
      );
      setConfirmDelete(false);
      setSelectedId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Rolni o'chirishda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-5">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
            {t('settings_page.roles')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium max-w-2xl">
            {t('settings_page.roles_desc')}
          </p>
        </div>
        <button
          onClick={() => startNewRole(null)}
          className="premium-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('settings_page.add_role')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* CHAP: rollar ro'yxati */}
        <div className="w-full lg:w-72 shrink-0 glass-card rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm p-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 px-2 pb-2">
            {t('settings_page.roles_list')} · {roles.length}
          </h4>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {isNew && (
              <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('settings_page.role_new_title')}</span>
              </div>
            )}

            {roles.map(role => {
              const isActive = role.id === selectedId;
              const count = userCount(role.key);
              const granted = permissionKeys.filter(k => role.permissions && role.permissions[k]).length;

              return (
                <button
                  key={role.id}
                  onClick={() => openRole(role)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition duration-200 cursor-pointer border ${
                    isActive
                      ? 'bg-indigo-500/10 border-indigo-500/25'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold truncate ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-gray-200'
                    }`}>
                      {roleName(role)}
                    </span>
                    {role.system
                      ? <Lock className="w-3 h-3 shrink-0 text-slate-400 dark:text-gray-500" />
                      : <Shield className="w-3 h-3 shrink-0 text-indigo-400/70" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-slate-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {count > 0 ? `${count} ${t('settings_page.role_users_count')}` : t('settings_page.role_users_none')}
                    </span>
                    <span className="opacity-40">·</span>
                    <span>{granted}/{permissionKeys.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* O'NG: tanlangan rol tafsiloti */}
        <div className="flex-1 w-full min-w-0">
          {!draft ? (
            <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm p-12 text-center">
              <Shield className="w-8 h-8 mx-auto text-slate-300 dark:text-gray-700 mb-3" />
              <p className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                {t('settings_page.role_empty_hint')}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSave}
              className="glass-card rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm"
            >
              {/* Rol sarlavhasi va amallar */}
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit'] truncate">
                        {isNew ? t('settings_page.role_new_title') : roleName(selectedRole)}
                      </h4>
                      {!isNew && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold ${
                          readOnly
                            ? 'bg-slate-500/10 text-slate-500 dark:text-gray-400 border-slate-500/15'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/15'
                        }`}>
                          {readOnly ? <Lock className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                          {readOnly ? t('settings_page.role_system_badge') : t('settings_page.role_custom_badge')}
                        </span>
                      )}
                    </div>
                    {!isNew && (
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 mt-1">
                        {t('settings_page.role_key_label')}: <code className="font-mono">{selectedRole.key}</code>
                        <span className="mx-1.5 opacity-40">·</span>
                        {userCount(selectedRole.key)} {t('settings_page.role_users_count')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isNew && (
                      <button
                        type="button"
                        onClick={() => startNewRole(selectedRole)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        title={t('settings_page.role_duplicate')}
                      >
                        <Copy className="w-3.5 h-3.5" /> {t('settings_page.role_duplicate')}
                      </button>
                    )}

                    {isNew && (
                      <button
                        type="button"
                        onClick={() => { setSelectedId(null); setDraft(null); }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                        title={t('common.cancel')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!readOnly && !isNew && (
                      confirmDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition cursor-pointer"
                          >
                            {t('settings_page.role_delete_confirm_yes')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setError(''); setConfirmDelete(true); }}
                          className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}

                    {!readOnly && (
                      <button
                        type="submit"
                        disabled={saving}
                        className="premium-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white cursor-pointer shadow-sm disabled:opacity-60"
                      >
                        <Save className="w-3.5 h-3.5" /> {isNew ? t('common.create') : t('common.save')}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl p-2.5 text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
                  </div>
                )}

                {readOnly && (
                  <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl p-2.5 text-[11px] font-semibold">
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('settings_page.role_system_note')}
                  </div>
                )}
              </div>

              {/* Rol nomlari */}
              {!readOnly && (
                <div className="p-5 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-baseline justify-between gap-3 mb-2.5">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                      {t('settings_page.role_names_title')}
                    </h5>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium truncate">
                      {t('settings_page.role_names_hint')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { field: 'name_uz', label: t('settings_page.role_name_uz'), ph: 'Dispetcher' },
                      { field: 'name_ru', label: t('settings_page.role_name_ru'), ph: 'Диспетчер' },
                      { field: 'name_en', label: t('settings_page.role_name_en'), ph: 'Dispatcher' }
                    ].map(({ field, label, ph }) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                          {label} *
                        </label>
                        <input
                          type="text"
                          value={draft[field]}
                          onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                          placeholder={ph}
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Huquqlar */}
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">
                      {t('settings_page.permissions')}
                    </h5>
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {t('settings_page.perm_granted_of', { active: activeCount, total: permissionKeys.length })}
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('settings_page.perm_search')}
                      className="w-full glass-input rounded-xl pl-8 pr-3 py-2 text-[11px] font-semibold text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {visibleGroups.length === 0 && (
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-gray-500 py-6 text-center">
                    {t('settings_page.perm_none_found')}
                  </p>
                )}

                {visibleGroups.map(group => {
                  const Icon = group.icon;
                  const groupActive = group.keys.filter(k => draft.permissions[k]).length;
                  const allOn = groupActive === group.keys.length;

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden"
                    >
                      {/* Guruh sarlavhasi */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`p-1.5 rounded-lg border ${ACCENTS[group.accent]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {t(`settings_page.perm_group_${group.id}`)}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-gray-400 truncate">
                              {t(`settings_page.perm_group_${group.id}_desc`)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 tabular-nums">
                            {groupActive}/{group.keys.length}
                          </span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => setGroup(group.keys, !allOn)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                            >
                              {allOn ? t('settings_page.perm_group_none') : t('settings_page.perm_group_all')}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Guruh ichidagi huquqlar */}
                      <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {group.visibleKeys.map(key => {
                          const on = !!draft.permissions[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={readOnly}
                              onClick={() => togglePermission(key)}
                              className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition ${
                                readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/2'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className={`text-xs font-bold ${
                                  on ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400'
                                }`}>
                                  {t(`settings_page.perm_${key}`)}
                                </p>
                                <p className="text-[10px] font-medium text-slate-500 dark:text-gray-500 mt-0.5">
                                  {t(`settings_page.perm_${key}_desc`)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold ${
                                  on ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-600'
                                }`}>
                                  {on ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  {on ? t('settings_page.perm_on') : t('settings_page.perm_off')}
                                </span>
                                <Toggle on={on} disabled={readOnly} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
