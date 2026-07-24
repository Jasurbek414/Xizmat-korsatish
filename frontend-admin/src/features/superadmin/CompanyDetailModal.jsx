import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import CompanyGeneralTab from './CompanyGeneralTab';
import CompanySubscriptionTab from './CompanySubscriptionTab';
import CompanyUsersTab from './CompanyUsersTab';

const CompanyDetailModal = ({ isOpen, onClose, companyId, onCompanyUpdated }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [detail, setDetail] = useState(null);

  const loadDetail = () => {
    if (!companyId) return;
    api.getCompanyDetail(companyId)
      .then(setDetail)
      .catch(err => console.error('Failed to load company detail:', err));
  };

  useEffect(() => {
    if (isOpen && companyId) {
      setActiveTab('general');
      loadDetail();
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleSaved = (savedCompany) => {
    setDetail(prev => prev ? { ...prev, company: savedCompany } : prev);
    onCompanyUpdated(savedCompany);
  };

  const tabs = [
    { id: 'general', label: t('superadmin.tab_general') },
    { id: 'subscription', label: t('superadmin.tab_subscription') },
    { id: 'users', label: t('superadmin.tab_users') }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-xs font-semibold">
      <div className="glass-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5">

        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-1.5 text-indigo-500">
            <Building2 className="w-4 h-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">
              {detail?.company?.name || t('superadmin.detail_title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 border-b border-slate-100 dark:border-white/5 pb-2">
          {tabs.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setActiveTab(tabItem.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                activeTab === tabItem.id
                  ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <CompanyGeneralTab companyId={companyId} detail={detail} onSaved={handleSaved} />
        )}
        {activeTab === 'subscription' && (
          <CompanySubscriptionTab companyId={companyId} />
        )}
        {activeTab === 'users' && (
          <CompanyUsersTab companyId={companyId} />
        )}
      </div>
    </div>
  );
};

export default CompanyDetailModal;
