import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PlatformStats from './superadmin/PlatformStats';
import CompaniesTable from './superadmin/CompaniesTable';
import CreateCompanyModal from './superadmin/CreateCompanyModal';
import CompanyDetailModal from './superadmin/CompanyDetailModal';

const SuperadminDashboard = ({ tab }) => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [listError, setListError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const loadCompanies = async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(data.map(c => ({
        id: c.id,
        name: c.name,
        sub_domain: c.subDomain,
        status: c.status
      })));
      setListError('');
    } catch (err) {
      console.error('Failed to load companies:', err);
      setListError(err.message || t('superadmin.list_load_error'));
    }
  };

  useEffect(() => {
    if (tab === 'companies') loadCompanies();
  }, [tab]);

  const toggleCompanyStatus = async (company) => {
    const nextStatus = company.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.updateCompanyStatus(company.id, nextStatus);
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: nextStatus } : c));
    } catch (err) {
      console.error('Failed to toggle company status:', err);
      alert(err.message || t('superadmin.status_update_error'));
    }
  };

  const handleCompanyUpdated = (savedCompany) => {
    setCompanies(prev => prev.map(c => c.id === savedCompany.id ? {
      id: savedCompany.id,
      name: savedCompany.name,
      sub_domain: savedCompany.subDomain,
      status: savedCompany.status
    } : c));
  };

  if (tab === 'dashboard') {
    return <PlatformStats />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('superadmin.companies_list_title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('superadmin.companies_list_desc')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('superadmin.add_company')}
        </button>
      </div>

      <CompaniesTable
        companies={companies}
        listError={listError}
        onOpenDetail={setSelectedCompanyId}
        onToggleStatus={toggleCompanyStatus}
      />

      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadCompanies}
      />

      <CompanyDetailModal
        isOpen={!!selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
        companyId={selectedCompanyId}
        onCompanyUpdated={handleCompanyUpdated}
      />
    </div>
  );
};

export default SuperadminDashboard;
