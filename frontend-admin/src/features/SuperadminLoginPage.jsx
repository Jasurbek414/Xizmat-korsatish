import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

const SuperadminLoginPage = ({ setAuth }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await api.login(username, password);
      const user = data.user;

      if (user.role !== 'SUPERADMIN') {
        setError(t('superadmin.login_wrong_portal'));
        return;
      }

      setAuth(user);
      navigate('/spd');
    } catch (err) {
      setError(err.message || t('login_page.login_error'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300">
      {/* Dynamic blurred glowing shapes */}
      <div className="absolute w-[350px] h-[350px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] top-[-50px] left-[-50px] pointer-events-none" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-violet-500/5 dark:bg-violet-500/10 blur-[120px] bottom-[-50px] right-[-50px] pointer-events-none" />

      <div className="w-full max-w-sm glass-card rounded-2xl p-8 shadow-2xl relative z-10 space-y-6 bg-white dark:bg-[#111827]/80">
        {/* Logo and title */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-500/20 mx-auto text-lg">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-white tracking-tight font-['Outfit'] mt-4">
            Service<span className="text-indigo-600 dark:text-indigo-400">Core</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">{t('superadmin.login_desc')}</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400">{t('login_page.username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin"
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400">{t('login_page.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
          >
            {t('login_page.login_btn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperadminLoginPage;
