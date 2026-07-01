import React, { useState } from 'react';
import { Search, Plus, PhoneCall } from 'lucide-react';

const ClientList = ({ clients, onSelectClient, onAddClientClick, onCallClick }) => {
  const [search, setSearch] = useState('');

  // Filter clients
  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-3.5 h-full min-h-0 text-xs font-semibold">
      
      {/* Search and Circular Add Button Row */}
      <div className="flex items-center gap-3 select-none shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ismi yoki telefonidan qidirish..."
            className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition-all duration-200 focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>
        <button
          type="button"
          onClick={onAddClientClick}
          className="w-8.5 h-8.5 rounded-xl bg-[#5850ec] hover:bg-[#4f46e5] text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-lg shadow-indigo-500/15 active:scale-95"
          title="Yangi mijoz qo'shish"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* Customer rows list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin min-h-[140px]">
        {filteredClients.length === 0 ? (
          <div className="text-center py-10 text-[10px] text-slate-550 font-bold uppercase tracking-wider select-none">
            Mijozlar topilmadi
          </div>
        ) : (
          filteredClients.map(c => (
            <div
              key={c.id}
              onClick={() => onSelectClient && onSelectClient(c)}
              className="p-3.5 rounded-xl border border-white/[0.04] bg-[#161c2e]/40 hover:bg-[#1d253d]/60 hover:border-slate-800 transition duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-1 min-w-0 pr-2">
                <span className="block font-extrabold text-slate-200 text-xs leading-none truncate group-hover:text-indigo-400 transition duration-150">
                  {c.full_name}
                </span>
                <span className="block text-[10.5px] text-slate-500 font-mono leading-none">
                  {c.phone}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onCallClick(c); 
                }}
                className="w-7 h-7 rounded-lg bg-[#1c243b] group-hover:bg-[#5850ec] text-slate-400 group-hover:text-white flex items-center justify-center transition duration-150 cursor-pointer shrink-0"
                title="Qo'ng'iroq qilish"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default ClientList;
