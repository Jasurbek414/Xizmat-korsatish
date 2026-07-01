import React from 'react';
import { Radio, Power } from 'lucide-react';
import sipService from '../services/sipService';

const SipLines = ({ sipLines, lineStatuses, activeLineId, callState, duration }) => {
  return (
    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3.5 select-none flex flex-col h-full min-h-0 transition-colors duration-300">
      <span className="text-[8.5px] font-extrabold tracking-wider text-[var(--text-muted)] uppercase flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 font-outfit">
          <Radio className="w-3 h-3 text-[#4f6efe]" /> Liniyalar ({sipLines.length})
        </span>
      </span>
      <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {sipLines.length === 0 ? (
          <div className="text-center py-2 opacity-40 text-[var(--text-muted)] select-none">
            <span className="text-[9px] font-bold font-mono block">Faol liniyalar yo'q</span>
          </div>
        ) : (
          sipLines.map(line => {
            const status = lineStatuses[line.id] || 'DISCONNECTED';
            const isActive = activeLineId === line.id;
            const isLineCallActive = status === 'BUSY' || (isActive && callState.state !== 'IDLE');
            
            return (
              <div 
                key={line.id}
                onClick={() => status === 'CONNECTED' && sipService.setActiveLine(line.id)}
                className={`p-2 rounded-lg border flex items-center justify-between transition-all duration-300 select-none ${
                  isActive 
                    ? 'border-indigo-500/40 bg-indigo-500/10' 
                    : 'border-[var(--border-color)] bg-[var(--bg-keypad-btn)]/30 hover:border-indigo-500/30'
                } ${status !== 'CONNECTED' ? 'opacity-65 hover:opacity-85' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isLineCallActive 
                      ? 'bg-rose-500 animate-pulse' 
                      : status === 'CONNECTED' 
                      ? 'bg-emerald-500 animate-pulse' 
                      : 'bg-slate-500'
                  }`} />
                  <div className="truncate">
                    <span className="block text-[9.5px] font-bold text-[var(--text-primary)] truncate leading-none mb-0.5">{line.label}</span>
                    <span className="text-[8px] text-[var(--text-muted)] font-mono">ext: {line.extension}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isLineCallActive && (
                    <span className="text-[8px] text-rose-500 font-bold font-mono animate-pulse mr-1">
                      {isActive ? duration : 'BAND'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (status === 'CONNECTED') {
                        sipService.disconnectLine(line.id);
                      } else {
                        sipService.connectLine(line.id);
                      }
                    }}
                    className={`p-1 rounded transition cursor-pointer ${
                      status === 'CONNECTED' 
                        ? 'text-rose-500/60 hover:text-rose-500' 
                        : 'text-[var(--text-muted)] hover:text-emerald-500'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SipLines;
