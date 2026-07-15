import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Check, Info } from 'lucide-react';

const GeneralSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    company_name: '',
    company_phone: '',
    company_address: '',
    company_email: '',
    currency: 'so\'m',
    min_order_price: 15000,
    driver_kpi_percent: 10,
    work_start_time: '08:00',
    work_end_time: '22:00',
    measurement_units: ['dona', 'kv. metr', 'kg', 'litr', 'metr']
  });
  const [saved, setSaved] = useState(false);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getCompanySettings();
        setSettings({
          company_name: data.name || '',
          company_phone: data.phone || '',
          company_address: data.address || '',
          company_email: data.email || '',
          currency: 'so\'m',
          min_order_price: data.minOrderPrice || 15000,
          driver_kpi_percent: data.driverKpiPercent || 10,
          work_start_time: data.workStartTime || '08:00',
          work_end_time: data.workEndTime || '22:00',
          measurement_units: ['dona', 'kv. metr', 'kg', 'litr', 'metr']
        });
      } catch (err) {
        console.error("Failed to load company settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateCompanySettings({
        name: settings.company_name,
        phone: settings.company_phone,
        address: settings.company_address,
        email: settings.company_email,
        minOrderPrice: settings.min_order_price,
        driverKpiPercent: settings.driver_kpi_percent,
        workStartTime: settings.work_start_time,
        workEndTime: settings.work_end_time
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update company settings:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
          {t('settings_page.general')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          {t('dashboard.analytics_desc')}
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold animate-fade-in shadow-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>{t('settings_page.saved_success')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-semibold">
        {/* Left Card: Company Profile */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit']">
            {t('settings_page.company_details')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.company_name')}</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.company_phone')}</label>
                <input
                  type="text"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.company_email')}</label>
                <input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.company_address')}</label>
              <textarea
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                rows="2"
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none resize-none"
                required
              />
            </div>

            {/* Measurement Units */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2 select-none">
              <label className="block text-slate-550 dark:text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                Kompaniya O'lchov Birliklari (Units)
              </label>
              
              <div className="flex flex-wrap gap-1.5 py-1">
                {(settings.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr']).map((unit, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                  >
                    <span>{unit}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const updated = (settings.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr']).filter((_, i) => i !== index);
                        setSettings({ ...settings, measurement_units: updated });
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer font-bold ml-0.5 text-[8px]"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Yangi o'lchov birligi, masalan: litr" 
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="flex-1 glass-input rounded-xl px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none text-[11px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newUnit.trim();
                      if (val) {
                        const current = settings.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr'];
                        if (!current.includes(val)) {
                          setSettings({ ...settings, measurement_units: [...current, val] });
                        }
                        setNewUnit('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newUnit.trim();
                    if (val) {
                      const current = settings.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr'];
                      if (!current.includes(val)) {
                        setSettings({ ...settings, measurement_units: [...current, val] });
                      }
                      setNewUnit('');
                    }
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer text-[10px]"
                >
                  Qo'shish
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Card: Business Rules & Constraints */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5 font-['Outfit']">
              {t('settings_page.business_rules')}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.driver_kpi')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.driver_kpi_percent}
                  onChange={(e) => setSettings({ ...settings, driver_kpi_percent: parseInt(e.target.value) || 0 })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.currency')}</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.min_order_price')}</label>
                <input
                  type="number"
                  min="0"
                  value={settings.min_order_price}
                  onChange={(e) => setSettings({ ...settings, min_order_price: parseFloat(e.target.value) || 0 })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('settings_page.work_hours')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.work_start_time}
                    onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                    className="w-full glass-input rounded-xl px-2 py-2 text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                  <span className="text-slate-400 font-semibold">-</span>
                  <input
                    type="time"
                    value={settings.work_end_time}
                    onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                    className="w-full glass-input rounded-xl px-2 py-2 text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-3 rounded-xl flex gap-2 text-slate-600 dark:text-gray-400 mt-2 font-medium">
              <Info className="w-4.5 h-4.5 shrink-0 text-indigo-500" />
              <span>Ish vaqti drayverlar uchun buyurtmalarni monitoring qilishda va avtomatik taqsimlashda qo'llaniladi. KPI ulushi esa oyliklarni hisoblashga bevosita ta'sir qiladi.</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm mt-4 lg:mt-0"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneralSettings;
