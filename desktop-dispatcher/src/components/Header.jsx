import React from 'react';
import { Radio, Settings as SettingsIcon, LogOut } from 'lucide-react';

const Header = ({ auth, sipStatus, onToggleSettings, onLogout }) => {
  return (
    <header className="h-14 border-b border-white/[0.04] bg-[#0c0f1a] flex items-center justify-between px-6 shrink-0 select-none relative z-20 shadow-md">
      {/* Left branding */}
      <span className="text-xs font-black text-slate-100 tracking-widest font-mono uppercase">
        Terminal v1.1
      </span>

      {/* Right profile & control widgets */}
      <div className="flex items-center gap-4">
        {/* Active Operator info */}
        <div className="flex items-center gap-2.5">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.full_name || 'Operator')}&background=5850ec&color=fff&bold=true`}
            alt="Avatar"
            className="w-7 h-7 rounded-full border border-white/5"
          />
          <div className="text-left leading-none">
            <span className="block text-[11px] font-extrabold text-slate-200 leading-tight">
              {auth?.full_name}
            </span>
            <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
              @{auth?.username || 'operator1'}
            </span>
          </div>
        </div>

        {/* Call Connection indicator & Toggle */}
        <div className="flex items-center gap-2.5 border-l border-white/[0.04] pl-4">
          <div
            className={`p-2 rounded-lg border transition flex items-center justify-center ${
              sipStatus === 'CONNECTED' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-[#151b2d] border-white/[0.04] text-slate-450'
            }`}
            title="SIP Status"
          >
            <Radio className={`w-3.5 h-3.5 ${sipStatus === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
          </div>

          <button 
            type="button"
            onClick={onToggleSettings}
            className="p-2 rounded-lg bg-[#151b2d] border border-white/[0.04] text-slate-450 hover:text-slate-200 transition cursor-pointer"
            title="Sozlamalar"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg bg-[#151b2d] border border-white/[0.04] text-slate-450 hover:text-rose-500 transition cursor-pointer"
            title="Tizimdan chiqish"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
