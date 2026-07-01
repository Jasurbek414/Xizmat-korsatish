import React from 'react';
import { Phone, Clock } from 'lucide-react';

const RecentCallerInfo = ({ activeClient, auth }) => {
  // Use active client if present, else fallback to Operator profile as shown in mockup
  const displayName = activeClient ? activeClient.full_name : (auth ? auth.full_name : 'Malika Ashmedova');
  const displayUser = activeClient ? 'Mijoz' : (auth ? `@${auth.username}` : '@OPERATOR1');
  const displayPhone = activeClient ? activeClient.phone : '+998 99 888 77 66';
  
  // Initials for avatar bubble
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Mock order IDs matching mockup
  const lastOrderIds = ['104', '102', '103'];

  return (
    <div className="bg-[#111522] border border-white/[0.04] rounded-2xl p-5 select-none text-xs font-semibold text-slate-200 shadow-2xl">
      
      {/* Header */}
      <div className="border-b border-white/[0.04] pb-3 mb-3.5 flex items-center justify-between">
        <span className="font-extrabold text-[9px] text-slate-100 uppercase tracking-widest font-outfit">
          RECENT CALLER INFO <span className="ml-1 text-slate-500 font-bold">(Auto Populates)</span>
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
      </div>

      {/* Operator/Caller Profile card */}
      <div className="flex items-center gap-3 bg-[#0a0d16] border border-white/[0.06] p-3.5 rounded-xl">
        {/* Initials Avatar Bubble */}
        <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-outfit text-sm">
          {getInitials(displayName)}
        </div>

        {/* Name and Tag */}
        <div className="min-w-0 flex-1">
          <span className="block font-black text-slate-100 text-xs truncate font-outfit leading-none">
            {displayName}
          </span>
          <span className="block text-[8.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            {displayUser}
          </span>
        </div>
      </div>

      {/* Phone number row */}
      <div className="flex items-center gap-2 mt-3.5 text-slate-350 font-mono text-[10.5px]">
        <Phone className="w-3.5 h-3.5 text-slate-500" />
        <span>{displayPhone}</span>
      </div>

      {/* Last 3 Order IDs */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.04]">
        <span className="block text-[8.5px] font-extrabold uppercase tracking-wider text-slate-450 font-outfit mb-2">
          LAST 3 ORDER IDS
        </span>
        <div className="flex gap-2">
          {lastOrderIds.map(id => (
            <div 
              key={id}
              className="px-3.5 py-1.5 bg-[#1c243b] hover:bg-[#232c48] border border-white/[0.04] rounded-lg text-slate-200 font-mono text-center font-bold text-[10.5px] cursor-pointer transition select-none flex-1"
            >
              {id}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default RecentCallerInfo;
