import React from 'react';
import { Radio, Settings as SettingsIcon, LogOut, Sun, Moon } from 'lucide-react';

const Header = ({ auth, sipStatus, onToggleSettings, onLogout, theme, onToggleTheme }) => {
  return (
    <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between px-6 shrink-0 select-none relative z-20 shadow-md transition-colors duration-300">
      
      {/* Left branding */}
      <span className="text-xs font-black text-[var(--text-primary)] tracking-widest font-mono uppercase font-outfit">
        Terminal Advanced v1.2
      </span>

      {/* Right profile & control widgets */}
      <div className="flex items-center gap-4">
        {/* Active Operator info */}
        <div className="flex items-center gap-2.5">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth?.full_name || 'Operator')}&background=5850ec&color=fff&bold=true`}
            alt="Avatar"
            className="w-7 h-7 rounded-full border border-[var(--border-color)]"
          />
          <div className="text-left leading-none">
            <span className="block text-[11px] font-extrabold text-[var(--text-primary)] leading-tight">
              {auth?.full_name}
            </span>
            <span className="text-[8.5px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mt-0.5">
              @{auth?.username || 'operator1'}
            </span>
          </div>
        </div>

        {/* Call Connection indicator & Toggle */}
        <div className="flex items-center gap-2.5 border-l border-[var(--border-color)] pl-4">
          <div
            className={`p-2 rounded-lg border transition flex items-center justify-center ${
              sipStatus === 'CONNECTED' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-[var(--bg-keypad-btn)] border-[var(--border-color)] text-[var(--text-secondary)]'
            }`}
            title="SIP Status"
          >
            <Radio className={`w-3.5 h-3.5 ${sipStatus === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
          </div>

          {/* Theme Toggler (Day / Night) */}
          <button 
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-[var(--bg-keypad-btn)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title={theme === 'dark' ? "Kunduzgi rejim (Kunduz)" : "Tungi rejim (Tun)"}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
            )}
          </button>

          <button 
            type="button"
            onClick={onToggleSettings}
            className="p-2 rounded-lg bg-[var(--bg-keypad-btn)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Sozlamalar"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg bg-[var(--bg-keypad-btn)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-rose-500 transition cursor-pointer"
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
