import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building2, CheckCircle, ShieldAlert, Wallet, ShoppingCart, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PlatformStats = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getSuperadminStats().then(setStats).catch(err => console.error('Failed to load platform stats:', err));
  }, []);

  const s = stats || {
    totalCompanies: 0, activeCompanies: 0, blockedCompanies: 0,
    totalRevenueThisMonth: 0, totalOrders: 0, totalActiveUsers: 0, topCompanies: []
  };

  const tiles = [
    { title: t('superadmin.stat_total_companies'), val: s.totalCompanies, icon: Building2, bg: 'bg-indigo-500/5', color: 'text-indigo-600 dark:text-indigo-400' },
    { title: t('superadmin.stat_active_companies'), val: s.activeCompanies, icon: CheckCircle, bg: 'bg-emerald-500/5', color: 'text-emerald-600 dark:text-emerald-400' },
    { title: t('superadmin.stat_blocked_companies'), val: s.blockedCompanies, icon: ShieldAlert, bg: 'bg-rose-500/5', color: 'text-rose-600 dark:text-rose-400' },
    { title: t('superadmin.stat_revenue_month'), val: `${Number(s.totalRevenueThisMonth).toLocaleString()} UZS`, icon: Wallet, bg: 'bg-amber-500/5', color: 'text-amber-600 dark:text-amber-400' },
    { title: t('superadmin.stat_total_orders'), val: s.totalOrders, icon: ShoppingCart, bg: 'bg-cyan-500/5', color: 'text-cyan-600 dark:text-cyan-400' },
    { title: t('superadmin.stat_active_users'), val: s.totalActiveUsers, icon: Users, bg: 'bg-purple-500/5', color: 'text-purple-600 dark:text-purple-400' }
  ];

  const maxRevenue = Math.max(1, ...(s.topCompanies || []).map(c => Number(c.revenue) || 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('superadmin.analytics_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('superadmin.analytics_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiles.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{tile.title}</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{tile.val}</h3>
              </div>
              <div className={`w-10 h-10 rounded-xl ${tile.bg} flex items-center justify-center ${tile.color}`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl p-6 shadow-sm dark:shadow-none bg-white dark:bg-transparent border border-slate-200 dark:border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">{t('superadmin.top_companies_title')}</h3>
        {(s.topCompanies || []).length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-gray-500 font-semibold">{t('superadmin.top_companies_empty')}</p>
        ) : (
          <div className="space-y-3">
            {s.topCompanies.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-gray-300">{c.name}</span>
                  <span className="text-slate-800 dark:text-white font-bold">{Number(c.revenue).toLocaleString()} UZS</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(Number(c.revenue) / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformStats;
