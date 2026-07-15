import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Check, MessageSquare, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NotificationSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    sms_enabled: true,
    sms_api_token: '',
    sms_template_created: '',
    sms_template_assigned: '',
    sms_template_completed: ''
  });
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getCompanySettings();
        // Xavfsizlik sababli haqiqiy token qiymati serverdan hech qachon qaytarilmaydi -
        // faqat "mavjud/mavjud emas" holati keladi (smsApiTokenConfigured).
        setTokenConfigured(!!data.smsApiTokenConfigured);
        setSettings({
          sms_enabled: data.smsEnabled !== false,
          sms_api_token: '',
          sms_template_created: data.smsTemplateCreated || '',
          sms_template_assigned: data.smsTemplateAssigned || '',
          sms_template_completed: data.smsTemplateCompleted || ''
        });
      } catch (err) {
        console.error("Failed to load SMS settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        smsEnabled: settings.sms_enabled,
        smsTemplateCreated: settings.sms_template_created,
        smsTemplateAssigned: settings.sms_template_assigned,
        smsTemplateCompleted: settings.sms_template_completed
      };
      // Token faqat admin yangi qiymat kiritgandagina yuboriladi - aks holda
      // mavjud tokenni bo'sh qiymat bilan ustidan yozib yubormaslik uchun.
      if (settings.sms_api_token.trim()) {
        payload.smsApiToken = settings.sms_api_token.trim();
      }

      await api.updateCompanySettings(payload);
      if (settings.sms_api_token.trim()) {
        setTokenConfigured(true);
        setSettings(prev => ({ ...prev, sms_api_token: '' }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save SMS settings:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.notifications')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Tizim hodisalari bo'yicha mijozlarga SMS xabarnomalar yuborish qoidalari
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold animate-fade-in shadow-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>{t('settings_page.saved_success')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        {/* Left Column: API settings */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm h-fit">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit']">
            {t('settings_page.sms_settings')}
          </h4>

          <div className="flex items-center justify-between p-3 bg-slate-550/5 dark:bg-white/2 rounded-xl border border-slate-150 dark:border-white/5">
            <div className="space-y-0.5 pr-2">
              <div className="text-slate-850 dark:text-white font-bold">{t('settings_page.sms_enable')}</div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Avtomatik yuborish rejimi</div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, sms_enabled: !settings.sms_enabled })}
              className="text-indigo-500 dark:text-indigo-400 cursor-pointer"
            >
              {settings.sms_enabled ? (
                <ToggleRight className="w-10 h-10" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-350 dark:text-slate-700" />
              )}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
              {t('settings_page.sms_token')}
              {tokenConfigured && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  O'rnatilgan
                </span>
              )}
            </label>
            <input
              type="password"
              value={settings.sms_api_token}
              onChange={(e) => setSettings({ ...settings, sms_api_token: e.target.value })}
              placeholder={tokenConfigured ? "•••••••• (o'zgartirish uchun yangisini kiriting)" : "masalan: bearer_xyz789..."}
              disabled={!settings.sms_enabled}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-3.5 rounded-xl space-y-1.5 text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
            <div className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulyator yoqilgan</span>
            </div>
            <div>SMS yoqilgan bo'lsa, status o'zgarganda ekranda bildirishnoma va konsolda yuboriladigan xabar matni simulyatsiya qilinadi.</div>
          </div>
        </div>

        {/* Right Column: Templates (spans 2 columns) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit']">
            {t('settings_page.sms_templates')}
          </h4>

          <div className="space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl font-medium flex items-start gap-2">
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('settings_page.sms_hint')}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.sms_created')}</label>
                <textarea
                  value={settings.sms_template_created}
                  onChange={(e) => setSettings({ ...settings, sms_template_created: e.target.value })}
                  rows="2"
                  disabled={!settings.sms_enabled}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none disabled:opacity-50 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.sms_assigned')}</label>
                <textarea
                  value={settings.sms_template_assigned}
                  onChange={(e) => setSettings({ ...settings, sms_template_assigned: e.target.value })}
                  rows="2"
                  disabled={!settings.sms_enabled}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none disabled:opacity-50 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.sms_completed')}</label>
                <textarea
                  value={settings.sms_template_completed}
                  onChange={(e) => setSettings({ ...settings, sms_template_completed: e.target.value })}
                  rows="2"
                  disabled={!settings.sms_enabled}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none disabled:opacity-50 resize-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!settings.sms_enabled}
              className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettings;
