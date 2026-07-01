import React from 'react';
import { Clock, Search, PhoneOff, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const CallLogs = ({
  filteredLogs,
  search,
  onSearchChange,
  onQuickCall,
  chiquvchiCount,
  kiruvchiCount,
  javobsizCount,
  umumiyDuration,
  formatTime
}) => {
  return (
    <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-4.5 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      
      <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5 shrink-0">
        <span className="font-extrabold text-[10.5px] text-slate-350 uppercase tracking-wider flex items-center gap-1.5 font-outfit">
          <Clock className="w-3.5 h-3.5 text-indigo-400" /> Qo'ng'iroqlar Tarixi
        </span>
        
        <div className="relative w-28">
          <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Qidirish..."
            className="w-full bg-[#0b0e17] border border-slate-800/60 rounded-lg pl-7 pr-2 py-1 text-[9.5px] text-slate-100 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Logs scrolling panel */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin min-h-[160px]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            Qo'ng'iroqlar tarixi bo'sh
          </div>
        ) : (
          filteredLogs.map(log => {
            const isIncoming = log.type === 'INCOMING';
            const isMissed = log.status === 'MISSED';
            
            return (
              <div 
                key={log.id}
                onClick={() => onQuickCall(log.phone, log.client_name)}
                className="p-2.5 bg-[#1c243b]/40 hover:bg-[#232c48]/60 border border-slate-800/40 rounded-lg flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isMissed 
                      ? 'bg-rose-500/10 text-rose-500' 
                      : isIncoming 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {isIncoming ? (
                      isMissed ? <PhoneOff className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3" />
                    )}
                  </div>

                  <div className="min-w-0 leading-tight">
                    <span className="block font-bold text-slate-200 text-[10.5px] group-hover:text-indigo-400 transition truncate">
                      {log.client_name || 'Noma\'lum raqam'}
                    </span>
                    <span className="block text-[8.5px] text-slate-550 font-mono mt-0.5 truncate">
                      {log.phone} &bull; {formatTime(log.created_at)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[8px] text-slate-500 font-mono">
                    {log.duration}
                  </span>
                  <span className={`text-[7.5px] uppercase font-bold tracking-wider block mt-0.5 ${
                    isMissed ? 'text-rose-500' : 'text-slate-500'
                  }`}>
                    {isMissed ? 'Javobsiz' : 'Qabul qilingan'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Statistics Footer */}
      <div className="grid grid-cols-4 border-t border-slate-800/40 bg-[#0b0e17]/40 text-center divide-x divide-slate-800/40 text-[7.5px] font-bold text-slate-450 rounded-lg select-none shrink-0 mt-1 font-outfit">
        <div className="py-2 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-200 font-mono leading-none">{chiquvchiCount}</span>
          <span className="uppercase tracking-wide text-slate-550 mt-0.5">Chiquvchi</span>
        </div>
        <div className="py-2 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-200 font-mono leading-none">{kiruvchiCount}</span>
          <span className="uppercase tracking-wide text-slate-550 mt-0.5">Kiruvchi</span>
        </div>
        <div className="py-2 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-rose-500 font-mono leading-none">{javobsizCount}</span>
          <span className="uppercase tracking-wide text-slate-550 mt-0.5">Javobsiz</span>
        </div>
        <div className="py-2 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-200 font-mono leading-none">{umumiyDuration}</span>
          <span className="uppercase tracking-wide text-slate-550 mt-0.5">Umumiy</span>
        </div>
      </div>

    </div>
  );
};

export default CallLogs;
