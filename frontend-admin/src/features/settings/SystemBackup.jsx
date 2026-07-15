import React, { useState } from 'react';
import { api } from '../../services/api';
import { Download, Lock, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SystemBackup = ({ currentAuthUser }) => {
  const { t } = useTranslation();
  const [pwState, setPwState] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exporting, setExporting] = useState(false);

  // Serverdagi haqiqiy ma'lumotlarni JSON fayl sifatida yuklab olish (faqat o'qish -
  // hech narsani o'zgartirmaydi, shuning uchun xavfsiz).
  const handleExport = async () => {
    setExporting(true);
    try {
      const [clients, employees, orders, services, statuses, salaries, transactions, company] = await Promise.all([
        api.getClients(),
        api.getEmployees(),
        api.getOrders(),
        api.getServices(),
        api.getOrderStatuses(),
        api.getSalaries(),
        api.getTransactions(),
        api.getCompanySettings()
      ]);

      const backup = { company, clients, employees, orders, services, statuses, salaries, transactions };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `servicecore_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert(err.message || "Zaxira nusxa olishda xatolik yuz berdi");
    } finally {
      setExporting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pwState.new_password !== pwState.confirm_password) {
      setError(t('settings_page.password_mismatch'));
      return;
    }

    try {
      await api.changePassword(pwState.current_password, pwState.new_password);
      setSuccess('Parol muvaffaqiyatli yangilandi!');
      setPwState({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'Joriy parol noto\'g\'ri!');
    }
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

            <div className="grid grid-cols-1 gap-4">
              {/* Export */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white">Eksport qilish</h5>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium">Serverdagi haqiqiy ma'lumotlaringizni (mijozlar, xodimlar, buyurtmalar, moliya) JSON fayl sifatida yuklab oling.</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Yuklanmoqda...' : t('settings_page.db_export')}
                </button>
              </div>
            </div>

            {/* Import / Reset - hali ishlab chiqilmagan */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 space-y-2">
              <div className="flex gap-2 text-slate-500 dark:text-gray-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Import va Tizimni tozalash - hali mavjud emas</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium leading-relaxed">
                Real serverdagi ma'lumotlarni import qilish yoki to'liq tozalash - bu xavfli va
                qaytarib bo'lmaydigan amal bo'lgani uchun hali qo'shilmagan. Kerak bo'lsa, buni
                alohida so'rov sifatida ehtiyotkorlik bilan qo'shib beramiz.
              </p>
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
