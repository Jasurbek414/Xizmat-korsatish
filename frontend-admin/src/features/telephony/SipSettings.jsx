import React from 'react';
import { Settings, Save } from 'lucide-react';

const SipSettings = ({ sipSettings, setSipSettings, handleSaveSettings }) => {
  return (
    <div className="glass-card p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2 font-['Outfit']">
        <Settings className="w-4 h-4 text-indigo-500" /> SIP Sozlamalari
      </h3>

      <form onSubmit={handleSaveSettings} className="space-y-3">
        <div>
          <label className="block text-slate-500 dark:text-gray-400 mb-1">WebSocket Gateway Server (WSS / WS)</label>
          <input 
            type="text"
            value={sipSettings.ws_server || ''}
            onChange={(e) => setSipSettings({ ...sipSettings, ws_server: e.target.value })}
            placeholder="ws://127.0.0.1:8089"
            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none"
            required
          />
        </div>

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

        <div className="flex justify-between items-center pt-2">
          <div>
            <label className="text-[10px] text-slate-400 block">Driver WebSocket Port</label>
            <span className="font-mono text-slate-500 text-[10px]">ws://127.0.0.1:{sipSettings.ws_port || '8089'}</span>
          </div>
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
