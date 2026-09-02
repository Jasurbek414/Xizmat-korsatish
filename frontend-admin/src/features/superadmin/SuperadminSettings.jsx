import React, { useState } from 'react';
import { api } from '../../services/api';
import { Lock, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Superadmin uchun o'z parolini o'zgartirish - avval bunga UMUMAN imkon
 * yo'q edi (sidebar'da faqat "Boshqaruv paneli" va "Kompaniyalar" bor edi),
 * parolni faqat bazaga to'g'ridan-to'g'ri yozib tiklash mumkin edi.
 */
const SuperadminSettings = () => {
  const { t } = useTranslation();
  const [pwState, setPwState] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pwState.new_password !== pwState.confirm_password) {
      setError(t('settings_page.password_mismatch'));
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(pwState.current_password, pwState.new_password);
      setSuccess('Parol muvaffaqiyatli yangilandi!');
      setPwState({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || "Joriy parol noto'g'ri!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('superadmin.menu_settings')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Superadmin hisobingiz sozlamalari.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit'] flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              {t('settings_page.change_password')}
            </h4>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
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
              disabled={saving}
              className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? '...' : t('common.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperadminSettings;
