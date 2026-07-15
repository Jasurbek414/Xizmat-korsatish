import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SuperadminDashboard from './features/SuperadminDashboard';
import AdminDashboard from './features/AdminDashboard';
import Clients from './features/Clients';
import Employees from './features/Employees';
import Orders from './features/Orders';
import Finance from './features/Finance';
import Salaries from './features/Salaries';
import Settings from './features/Settings';
import LeafletMap from './features/LeafletMap';
import LoginPage from './features/LoginPage';
import Telephony from './features/Telephony';
import { initMockDb, addNotification } from './store/mockDb';
import NotificationCenter from './components/NotificationCenter';
import { api } from './services/api';

const DEFAULT_PERMS = {
  clients: true, employees: true, orders: true, finance: true,
  salaries: true, settings: true, map: true, telephony: true
};

const App = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    initMockDb();
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setAuth(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#030712] flex items-center justify-center text-slate-800 dark:text-white font-semibold">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route 
          path="/login" 
          element={
            auth ? (
              auth.role === 'SUPERADMIN' ? <Navigate to="/spd" replace /> : <Navigate to="/" replace />
            ) : (
              <LoginPage setAuth={setAuth} />
            )
          } 
        />

        {/* Superadmin Route */}
        <Route 
          path="/spd/*" 
          element={
            auth && auth.role === 'SUPERADMIN' ? (
              <SuperadminPortal auth={auth} setAuth={setAuth} theme={theme} toggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Company Admin Route - mobile-only roles (driver/worker/workshop) have no web dashboard access */}
        <Route
          path="/*"
          element={
            auth && !['SUPERADMIN', 'WORKER_DRIVER', 'WORKER', 'WORKER_SEH'].includes(auth.role) ? (
              <AdminPortal auth={auth} setAuth={setAuth} theme={theme} toggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

// Language Selector Component
const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[11px] text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
      >
        <span>{currentLang.flag}</span>
        <span className="font-semibold hidden sm:inline">{currentLang.label}</span>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-lg p-1 z-50 animate-scale-in text-[11px]">
            {languages.map(lng => (
              <button
                key={lng.code}
                onClick={() => {
                  i18n.changeLanguage(lng.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  i18n.language === lng.code
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <span>{lng.flag}</span>
                <span>{lng.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Portal Layout for Superadmin
const SuperadminPortal = ({ auth, setAuth, theme, toggleTheme }) => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setAuth(null);
    navigate('/login');
  };

  return (
    <div className="flex bg-[#f1f5f9] dark:bg-[#030712] min-h-screen text-slate-800 dark:text-gray-100 font-sans w-full transition-colors duration-200">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        role="SUPERADMIN" 
        handleLogout={handleLogout} 
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#111827]/80 backdrop-blur-md px-8 flex items-center justify-between z-30 transition-colors duration-200">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Xush kelibsiz, Super Admin!</h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-500">{t('common.today')}: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1f2937] border border-slate-200 dark:border-[#374151] text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span className="text-slate-800 dark:text-gray-300 font-semibold">SUPERADMIN</span>
            </div>
          </div>
        </header>
        <main className="p-8 flex-1 overflow-y-auto bg-[#f1f5f9] dark:bg-[#030712] transition-colors duration-200">
          {currentTab === 'companies' ? <SuperadminDashboard tab="companies" /> : <SuperadminDashboard tab="dashboard" />}
        </main>
      </div>
    </div>
  );
};

// Portal Layout for Company Admin
const AdminPortal = ({ auth, setAuth, theme, toggleTheme }) => {
  const { t, i18n } = useTranslation();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getRoles()
      .then(setRoles)
      .catch(err => console.error('Failed to load roles:', err));
  }, []);

  // Dynamic permissions check - driven by the real backend Role/Permission model,
  // so an admin renaming a role or toggling a module takes effect without a code change.
  const roleObj = roles.find(r => r.key === auth.role);
  const perms = roleObj ? {
    ...DEFAULT_PERMS,
    ...roleObj.permissions,
    telephony: roleObj.permissions.telephony !== false
  } : DEFAULT_PERMS;
  const roleLabel = roleObj
    ? (roleObj[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || roleObj.nameUz)
    : auth.role;

  // Route / state guard to prevent unauthorized sub-tab access
  useEffect(() => {
    if (currentTab !== 'dashboard' && perms[currentTab] === false) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, perms]);

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setAuth(null);
    navigate('/login');
  };

  const renderAdminTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <AdminDashboard tab="dashboard" />;
      case 'clients':
        return <Clients tab="clients" />;
      case 'employees':
        return <Employees tab="employees" />;
      case 'orders':
        return <Orders tab="orders" />;
      case 'finance':
        return <Finance tab="finance" />;
      case 'salaries':
        return <Salaries tab="salaries" />;
      case 'settings':
        return <Settings tab="settings" auth={auth} />;
      case 'map':
        return <LeafletMap tab="map" />;
      case 'telephony':
        return <Telephony auth={auth} />;
      default:
        return <AdminDashboard tab="dashboard" />;
    }
  };

  return (
    <div className="flex bg-[#f1f5f9] dark:bg-[#030712] min-h-screen text-slate-800 dark:text-gray-100 font-sans w-full transition-colors duration-200">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        role={auth.role}
        roleLabel={roleLabel}
        perms={perms}
        handleLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#111827]/80 backdrop-blur-md px-8 flex items-center justify-between z-30 transition-colors duration-200">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{t('common.welcome')}, {auth.full_name || auth.username}!</h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-500">{t('common.today')}: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Notification Center */}
            <NotificationCenter />

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1f2937] border border-slate-200 dark:border-[#374151] text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${auth.role === 'ADMIN' ? 'bg-green-400' : 'bg-cyan-400'}`}></span>
              <span className="text-slate-800 dark:text-gray-300 font-semibold">{auth.role}</span>
            </div>
          </div>
        </header>
        <main className="p-8 flex-1 overflow-y-auto bg-[#f1f5f9] dark:bg-[#030712] transition-colors duration-200">
          {renderAdminTab()}
        </main>
      </div>
    </div>
  );
};

export default App;
