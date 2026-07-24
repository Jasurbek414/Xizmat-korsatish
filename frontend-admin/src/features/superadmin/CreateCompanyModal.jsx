import React, { useState } from 'react';
import { X, Building2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const CreateCompanyModal = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [newCompany, setNewCompany] = useState({ name: '', sub_domain: '' });
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setNewCompany({ name: '', sub_domain: '' });
    setCreatedCredentials(null);
    setError('');
    onClose();
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCompany.name || !newCompany.sub_domain) return;

    try {
      const result = await api.createCompany({
        name: newCompany.name,
        sub_domain: newCompany.sub_domain
      });
      setCreatedCredentials({
        subdomain: result.company.subDomain,
        username: result.adminUsername,
        password: result.adminPassword
      });
      onCreated(result.company);
    } catch (err) {
      setError(err.message || t('superadmin.create_company_error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-xs font-semibold">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5">

        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-indigo-500">
            <Building2 className="w-4 h-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">
              {t('superadmin.create_company_title')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdCredentials ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl p-3 space-y-2">
              <p className="font-bold">{t('superadmin.credentials_saved_warning')}</p>
              <p>{t('superadmin.subdomain')}: <span className="font-mono">{createdCredentials.subdomain}</span></p>
              <p>{t('superadmin.login')}: <span className="font-mono">{createdCredentials.username}</span></p>
              <p>{t('superadmin.password')}: <span className="font-mono">{createdCredentials.password}</span></p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCompany} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.company_name')}</label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('superadmin.subdomain')}</label>
              <input
                type="text"
                value={newCompany.sub_domain}
                onChange={(e) => setNewCompany({ ...newCompany, sub_domain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                placeholder="masalan: expressmail"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('common.create')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateCompanyModal;
