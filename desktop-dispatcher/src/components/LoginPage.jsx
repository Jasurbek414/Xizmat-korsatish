import React, { useState } from 'react';
import { Lock, User, ShieldAlert, PhoneCall } from 'lucide-react';
import { getDbItem } from '../store/mockDb';

const LoginPage = ({ setAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const operators = getDbItem('dispatcher_operators') || [];
    const found = operators.find(op => op.username === username.trim().toLowerCase() && op.password === password);

    if (found) {
      const authUser = {
        id: found.id,
        username: found.username,
        full_name: found.full_name,
        extension: found.extension
      };
      localStorage.setItem('dispatcher_auth', JSON.stringify(authUser));
      setAuth(authUser);
    } else {
      setError('Foydalanuvchi nomi yoki parol xato!');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090d16] flex items-center justify-center p-6 relative overflow-hidden transition-all duration-300">
      {/* Decorative Minimal background blur shapes */}
      <div className="absolute w-[280px] h-[280px] rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-[280px] h-[280px] rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-[340px] border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-[#111622]/60 backdrop-blur-md rounded-2xl p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Logo and title */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto shadow-md">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-850 dark:text-white tracking-tight font-['Outfit'] m-0">
              ServiceCore <span className="text-indigo-650 dark:text-indigo-400">Dispatcher</span>
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 block font-medium uppercase tracking-wider">
              Operator Terminali
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-[10px] font-bold flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="text-slate-400 dark:text-gray-500 block">Operator Logini</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-450 dark:text-gray-550" />
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masalan: operator1"
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 dark:text-gray-550 block">Kirish Paroli</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-450 dark:text-gray-550" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition font-semibold"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:opacity-90 text-white font-bold py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-sm mt-2"
          >
            Tizimga Kirish
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-white/5">
          <p className="text-[9px] text-slate-450 dark:text-gray-550 leading-relaxed font-mono">
            Demolar: <br/>
            operator1 / admin &nbsp;&bull;&nbsp; admin / admin
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
