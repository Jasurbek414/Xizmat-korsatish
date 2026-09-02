import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Send, Check, AlertTriangle, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Yangi mobil versiya chiqqanda BARCHA kompaniyalar bo'ylab o'rnatilgan
 * ilovalarga push bildirishnoma yuborish - avval bu faqat qo'lda
 * (brauzer konsolidan fetch chaqirib) qilinardi.
 */
const BroadcastPanel = () => {
  const { t } = useTranslation();
  const [liveVersion, setLiveVersion] = useState(null);
  const [form, setForm] = useState({ version: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/downloads/version.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setLiveVersion(data);
          setForm(f => ({ ...f, version: data.version || '' }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      await api.broadcastAppUpdate(form.version.trim(), form.message.trim());
      setSuccess("Bildirishnoma barcha qurilmalarga yuborildi.");
    } catch (err) {
      setError(err.message || "Bildirishnoma yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('superadmin.menu_broadcast')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Yangi mobil versiya chiqqanda barcha kompaniyalardagi o'rnatilgan ilovalarga bir zumda push bildirishnoma yuboring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <form onSubmit={handleSend} className="space-y-4 text-xs font-semibold">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit'] flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-500" />
              Yangilanish bildirishnomasi
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
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Versiya (masalan 2.8.4)</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                placeholder="2.8.4"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Xabar matni</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none min-h-[90px]"
                placeholder="Ilovaning yangi versiyasi chiqdi..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Yuborilmoqda...' : 'Barchaga yuborish'}
            </button>

            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium leading-relaxed">
              Eslatma: bu faqat bildirishnoma (foreground/background push) - haqiqiy yangi versiya avval
              APK sifatida qurilib, {`downloads/`} papkasiga joylashtirilgan va{' '}
              <code className="text-slate-500 dark:text-gray-400">version.json</code> yangilangan bo'lishi kerak.
            </p>
          </form>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit'] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            Joriy yuklab olinadigan versiya
          </h4>
          {liveVersion ? (
            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Versiya</span>
                <span className="text-slate-800 dark:text-white">{liveVersion.version} (build {liveVersion.versionCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Majburiy yangilanish</span>
                <span className="text-slate-800 dark:text-white">{liveVersion.forceUpdate ? 'Ha' : "Yo'q"}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-gray-400 block mb-1">Xabar</span>
                <p className="text-slate-700 dark:text-gray-300 font-medium">{liveVersion.message}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-gray-500 font-medium">version.json topilmadi</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPanel;
