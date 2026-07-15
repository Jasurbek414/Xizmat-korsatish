import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, Building2, Users, UserCog, ShoppingCart, 
  DollarSign, Wallet, Settings2, Map, Languages, LogOut, PhoneCall
} from 'lucide-react';

const Sidebar = ({ currentTab, setCurrentTab, role, roleLabel, perms = {}, handleLogout }) => {
  const { t } = useTranslation();

  const menuItems = role === 'SUPERADMIN'
    ? [
      { id: 'dashboard', label: t('menu.dashboard'), icon: LayoutDashboard },
      { id: 'companies', label: 'Kompaniyalar', icon: Building2 },
    ]
    : (() => {
      const items = [
        { id: 'dashboard', label: t('menu.dashboard'), icon: LayoutDashboard }
      ];
      if (perms.clients) items.push({ id: 'clients', label: t('menu.clients'), icon: Users });
      if (perms.orders) items.push({ id: 'orders', label: t('menu.orders'), icon: ShoppingCart });
      if (perms.finance) items.push({ id: 'finance', label: t('menu.finance'), icon: DollarSign });
      if (perms.employees) items.push({ id: 'employees', label: t('menu.employees'), icon: UserCog });
      if (perms.salaries) items.push({ id: 'salaries', label: t('menu.salaries'), icon: Wallet });
      if (perms.map) items.push({ id: 'map', label: t('menu.map'), icon: Map });
      if (perms.telephony) items.push({ id: 'telephony', label: 'Telefoniya', icon: PhoneCall });
      if (perms.settings) items.push({ id: 'settings', label: t('menu.settings'), icon: Settings2 });
      return items;
    })();

  return (
    <aside className="w-64 bg-white dark:bg-[#111827]/80 border-r border-slate-200 dark:border-white/5 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-40 transition-colors duration-200 shadow-sm dark:shadow-none">
      <div>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit'] m-0 leading-none">
              Service<span className="text-indigo-500 dark:text-indigo-400">Core</span>
            </h1>
            <span className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold tracking-wider uppercase mt-1 block">
              {role === 'SUPERADMIN' ? 'Super Admin' : (roleLabel || role)}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500 pl-3.5 shadow-sm' 
                    : 'text-slate-500 dark:text-gray-400 sidebar-btn'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Controls */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> {t('common.logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
