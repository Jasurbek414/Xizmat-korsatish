import React from 'react';
import { useTranslation } from 'react-i18next';

const CompaniesTable = ({ companies, listError, onOpenDetail, onToggleStatus }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {listError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl p-3 text-xs font-bold">
          {listError}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">{t('superadmin.company')}</th>
                <th className="p-4">{t('superadmin.subdomain')}</th>
                <th className="p-4">{t('common.status')}</th>
                <th className="p-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
              {companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpenDetail(c.id)}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                >
                  <td className="p-4 font-semibold text-slate-800 dark:text-white">{c.name}</td>
                  <td className="p-4 text-indigo-600 dark:text-indigo-400 font-mono">{c.sub_domain}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      c.status === 'TRIAL' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleStatus(c)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        c.status === 'ACTIVE'
                          ? 'border-rose-500/20 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? t('superadmin.block') : t('superadmin.activate')}
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
                    {t('superadmin.no_companies')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompaniesTable;
