import React, { useState } from 'react';
import { getDbItem, setDbItem, initMockDb } from '../../store/mockDb';
import { Download, Upload, RotateCcw, Lock, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SystemBackup = ({ currentAuthUser }) => {
  const { t } = useTranslation();
  const [pwState, setPwState] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);

  // Backup keys
  const DB_KEYS = [
    'companies', 'order_statuses', 'services', 'users', 'clients',
    'transactions', 'salaries', 'orders', 'wallets', 'budgets', 'debts', 'company_settings'
  ];

  const handleExport = () => {
    const backup = {};
    DB_KEYS.forEach(key => {
      backup[key] = JSON.parse(localStorage.getItem(key)) || [];
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `servicecore_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Validation check
        let valid = true;
        DB_KEYS.forEach(key => {
          if (importedData[key] === undefined) {
            valid = false;
          }
        });

        if (!valid) {
          alert('Xatolik: Yuklangan JSON fayl formati mos emas yoki to\'liq emas!');
          return;
        }

        // Save keys
        DB_KEYS.forEach(key => {
          localStorage.setItem(key, JSON.stringify(importedData[key]));
        });

        alert(t('settings_page.db_imported'));
        window.location.reload();
      } catch (err) {
        alert('JSON faylini o\'qishda xatolik yuz berdi!');
      }
    };
    fileReader.readAsText(file);
  };

  const handleResetDb = () => {
    DB_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
    initMockDb();
    alert(t('settings_page.db_reset_done'));
    window.location.reload();
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pwState.new_password !== pwState.confirm_password) {
      setError(t('settings_page.password_mismatch'));
      return;
    }

    const allUsers = getDbItem('users') || [];
    const userIndex = allUsers.findIndex(u => u.username === currentAuthUser.username);

    if (userIndex === -1) {
      setError('Foydalanuvchi topilmadi!');
      return;
    }

    const user = allUsers[userIndex];
    if (user.password !== pwState.current_password) {
      setError('Joriy parol noto\'g\'ri!');
      return;
    }

    // Update password
    allUsers[userIndex].password = pwState.new_password;
    setDbItem('users', allUsers);
    
    // Also update logged-in user storage if necessary
    const authUser = JSON.parse(localStorage.getItem('auth_user'));
    if (authUser) {
      authUser.password = pwState.new_password;
      localStorage.setItem('auth_user', JSON.stringify(authUser));
    }

    setSuccess('Parol muvaffaqiyatli yangilandi!');
    setPwState({ current_password: '', new_password: '', confirm_password: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.backup')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Tizim ma'lumotlarini zaxiralash, import qilish va xavfsizlik sozlamalari.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-semibold">
        {/* Left Card: Backup & Restore */}
        <div className="glass-card p-6 rounded-2xl space-y-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit']">
              {t('settings_page.db_backup')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white">Eksport qilish</h5>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium">Barcha ma'lumotlarni JSON fayl sifatida saqlab oling.</p>
                </div>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {t('settings_page.db_export')}
                </button>
              </div>

              {/* Import */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white">Import qilish</h5>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium">Avval saqlangan JSON zaxira faylini tiklang.</p>
                </div>
                <label className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  {t('settings_page.db_import')}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Dangerous Zone */}
            <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 space-y-3">
              <div className="flex gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Xavfli hudud (Danger Zone)</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium leading-relaxed">
                Tizimni tozalash barcha buyurtmalar, oyliklar, tranzaksiyalar va sozlamalarni o'chirib yuboradi va dastlabki holatiga qaytaradi.
              </p>
              
              {resetConfirm ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{t('settings_page.db_reset_confirm')}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetDb}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Ha, tozalash
                    </button>
                    <button
                      onClick={() => setResetConfirm(false)}
                      className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-300 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-450 border border-rose-500/10 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('settings_page.db_reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Change Password Form */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm flex flex-col justify-between">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit'] flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              {t('settings_page.change_password')}
            </h4>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.current_password')}</label>
              <input
                type="password"
                value={pwState.current_password}
                onChange={(e) => setPwState({ ...pwState, current_password: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.new_password')}</label>
              <input
                type="password"
                value={pwState.new_password}
                onChange={(e) => setPwState({ ...pwState, new_password: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
                placeholder="Kamida 4 ta belgi"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.confirm_password')}</label>
              <input
                type="password"
                value={pwState.confirm_password}
                onChange={(e) => setPwState({ ...pwState, confirm_password: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm"
            >
              {t('common.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SystemBackup;
