import React, { useState, useEffect } from 'react';
import { Plus, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const emptyForm = { planName: '', startDate: '', endDate: '', price: '' };

const CompanySubscriptionTab = ({ companyId }) => {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadSubscriptions = () => {
    api.getCompanySubscriptions(companyId)
      .then(setSubscriptions)
      .catch(err => console.error('Failed to load subscriptions:', err));
  };

  useEffect(() => { loadSubscriptions(); }, [companyId]);

  const latest = subscriptions[0];
  const daysLeft = latest ? Math.ceil((new Date(latest.endDate) - new Date()) / 86400000) : null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createCompanySubscription(companyId, form);
      setForm(emptyForm);
      setShowForm(false);
      loadSubscriptions();
    } catch (err) {
      setError(err.message || t('superadmin.subscription_saved_error'));
    }
  };

  const handleStatusChange = async (sub, status) => {
    try {
      await api.updateCompanySubscription(companyId, sub.id, { status });
      loadSubscriptions();
    } catch (err) {
      console.error('Failed to update subscription status:', err);
    }
  };

  return (
    <div className="space-y-4">
      {latest && (
        <div className={`rounded-xl p-3 flex items-center gap-2 text-xs font-bold ${
          daysLeft < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}>
          {daysLeft < 0 ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {daysLeft < 0 ? t('superadmin.expired') : `${daysLeft} ${t('superadmin.days_left')}`}
          <span className="font-normal opacity-70">({latest.planName})</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{t('superadmin.subscriptions_title')}</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 premium-btn text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t('superadmin.add_subscription')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 rounded-xl p-4 space-y-3">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.plan_name')}</label>
              <input
                type="text"
                value={form.planName}
                onChange={(e) => setForm({ ...form, planName: e.target.value })}
                placeholder="BASIC / PREMIUM / ENTERPRISE"
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.start_date')}</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.end_date')}</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.price')}</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer">
              {t('common.cancel')}
            </button>
            <button type="submit" className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer">
              {t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">{t('superadmin.plan_name')}</th>
                <th className="p-3">{t('superadmin.start_date')}</th>
                <th className="p-3">{t('superadmin.end_date')}</th>
                <th className="p-3">{t('superadmin.price')}</th>
                <th className="p-3">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400 dark:text-gray-500 font-semibold">
                    {t('superadmin.no_subscriptions')}
                  </td>
                </tr>
              ) : subscriptions.map(sub => (
                <tr key={sub.id}>
                  <td className="p-3 font-semibold text-slate-800 dark:text-white">{sub.planName}</td>
                  <td className="p-3">{sub.startDate}</td>
                  <td className="p-3">{sub.endDate}</td>
                  <td className="p-3">{Number(sub.price).toLocaleString()} UZS</td>
                  <td className="p-3">
                    <select
                      value={sub.status}
                      onChange={(e) => handleStatusChange(sub, e.target.value)}
                      className="glass-input rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
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

export default CompanySubscriptionTab;
