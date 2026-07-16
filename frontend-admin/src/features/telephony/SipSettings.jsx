import React from 'react';
import { Settings, Save, Trash2 } from 'lucide-react';

const SipSettings = ({ sipSettings, setSipSettings, handleSaveSettings, handleDeleteSettings }) => {
  return (
    <div className="glass-card p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2 font-['Outfit']">
        <Settings className="w-4 h-4 text-indigo-500" /> SIP Sozlamalari
      </h3>

      <form onSubmit={handleSaveSettings} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">SIP Server</label>
            <input 
              type="text"
              value={sipSettings.server_ip}
              onChange={(e) => setSipSettings({ ...sipSettings, server_ip: e.target.value })}
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">SIP Port</label>
            <input 
              type="text"
              value={sipSettings.local_port}
              onChange={(e) => setSipSettings({ ...sipSettings, local_port: e.target.value })}
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">SIP Username</label>
            <input 
              type="text"
              value={sipSettings.username}
              onChange={(e) => setSipSettings({ ...sipSettings, username: e.target.value })}
              placeholder="Masalan: 99871XXXXXX"
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">SIP Password</label>
            <input 
              type="password"
              value={sipSettings.password}
              onChange={(e) => setSipSettings({ ...sipSettings, password: e.target.value })}
              className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-500 dark:text-gray-400 mb-1">Authorization Username (Optional)</label>
          <input 
            type="text"
            value={sipSettings.auth_username || ''}
            onChange={(e) => setSipSettings({ ...sipSettings, auth_username: e.target.value })}
            placeholder="Bo'sh qolsa, SIP Username ishlatiladi"
            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex justify-end items-center gap-2 pt-2">
          {sipSettings.id && handleDeleteSettings && (
            <button
              type="button"
              onClick={handleDeleteSettings}
              className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer hover:bg-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> O'chirish
            </button>
          )}
          <button
            type="submit"
            className="premium-btn text-white px-3.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer border border-transparent"
          >
            <Save className="w-3.5 h-3.5" /> Saqlash
          </button>
        </div>
      </form>
    </div>
  );
};

export default SipSettings;
