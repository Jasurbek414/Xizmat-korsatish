import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const CompanyUsersTab = ({ companyId }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [resetResult, setResetResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompanyUsers(companyId)
      .then(setUsers)
      .catch(err => console.error('Failed to load company users:', err));
  }, [companyId]);

  const handleResetPassword = async (user) => {
    if (!window.confirm(t('superadmin.reset_password_confirm'))) return;
    setError('');
    try {
      const result = await api.resetCompanyUserPassword(companyId, user.id);
      setResetResult(result);
    } catch (err) {
      setError(err.message || t('superadmin.reset_password_error'));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
          {error}
        </div>
      )}

      {resetResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl p-3 space-y-1 text-xs font-semibold">
          <p className="font-bold">{t('superadmin.new_password_generated')}</p>
          <p>{t('superadmin.username')}: <span className="font-mono">{resetResult.username}</span></p>
          <p>{t('superadmin.password')}: <span className="font-mono">{resetResult.password}</span></p>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">{t('superadmin.full_name')}</th>
                <th className="p-3">{t('superadmin.username')}</th>
                <th className="p-3">{t('superadmin.role')}</th>
                <th className="p-3">{t('common.status')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400 dark:text-gray-500 font-semibold">
                    {t('superadmin.no_users')}
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="p-3 font-semibold text-slate-800 dark:text-white">{u.fullName}</td>
                  <td className="p-3 font-mono text-[11px]">@{u.username}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                      u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleResetPassword(u)}
                      title={t('superadmin.reset_password')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyUsersTab;
