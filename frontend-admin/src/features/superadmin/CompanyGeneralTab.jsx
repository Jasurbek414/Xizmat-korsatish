import React, { useState, useEffect } from 'react';
import { Check, Save, Users, ShoppingCart, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const CompanyGeneralTab = ({ companyId, detail, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', status: 'ACTIVE' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (detail?.company) {
      setForm({
        name: detail.company.name || '',
        phone: detail.company.phone || '',
        email: detail.company.email || '',
        address: detail.company.address || '',
        status: detail.company.status || 'ACTIVE'
      });
    }
  }, [detail]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await api.updateCompany(companyId, form);
      onSaved(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || t('superadmin.edit_company_error'));
    }
  };

  if (!detail) return null;

  const statTiles = [
    { label: t('superadmin.users_count'), val: detail.userCount, icon: Users },
    { label: t('superadmin.orders_count'), val: detail.orderCount, icon: ShoppingCart },
    { label: t('superadmin.total_revenue'), val: `${Number(detail.totalRevenue).toLocaleString()} UZS`, icon: Wallet }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statTiles.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <div key={idx} className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 rounded-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{tile.label}</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">{tile.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 rounded-xl p-2.5 text-[10px] font-bold flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> {t('superadmin.save_success')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.company_name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.status')}</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ACTIVE">{t('common.active')}</option>
              <option value="BLOCKED">{t('common.blocked')}</option>
              <option value="TRIAL">{t('superadmin.status_trial')}</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.phone')}</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.email')}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.address')}</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" /> {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyGeneralTab;
