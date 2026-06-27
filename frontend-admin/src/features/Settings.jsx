import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Briefcase, CheckCircle, MessageSquare, Shield, Database, Fingerprint } from 'lucide-react';

// Import subcomponents
import GeneralSettings from './settings/GeneralSettings';
import ServicesCatalog from './settings/ServicesCatalog';
import OrderStatuses from './settings/OrderStatuses';
import NotificationSettings from './settings/NotificationSettings';
import AdminUsers from './settings/AdminUsers';
import SystemBackup from './settings/SystemBackup';
import RolesPermissions from './settings/RolesPermissions';

const Settings = ({ auth }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('general');

  const tabs = [
    { id: 'general', label: t('settings_page.general'), icon: Sliders },
    { id: 'services', label: t('settings_page.services'), icon: Briefcase },
    { id: 'statuses', label: t('settings_page.statuses'), icon: CheckCircle },
    { id: 'notifications', label: t('settings_page.notifications'), icon: MessageSquare },
    { id: 'roles', label: t('settings_page.roles'), icon: Fingerprint },
    { id: 'admins', label: t('settings_page.admins'), icon: Shield },
    { id: 'backup', label: t('settings_page.backup'), icon: Database }
  ];

  const renderContent = () => {
    switch (activeSubTab) {
      case 'general':
        return <GeneralSettings />;
      case 'services':
        return <ServicesCatalog />;
      case 'statuses':
        return <OrderStatuses />;
      case 'notifications':
        return <NotificationSettings />;
      case 'roles':
        return <RolesPermissions />;
      case 'admins':
        return <AdminUsers currentAuthUser={auth} />;
      case 'backup':
        return <SystemBackup currentAuthUser={auth} />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-fade-in">
      {/* Settings Navigation Sidebar / Tabs */}
      <div className="w-full lg:w-64 shrink-0 glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white px-3 pb-3 border-b border-slate-100 dark:border-white/5 mb-3 font-['Outfit']">
          {t('menu.settings')}
        </h2>
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition duration-200 ${
                  isActive
                    ? 'bg-indigo-650/10 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 lg:border-l-2 border-indigo-500 pl-3.5 shadow-sm'
                    : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Settings Panel Content */}
      <div className="flex-1 w-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
