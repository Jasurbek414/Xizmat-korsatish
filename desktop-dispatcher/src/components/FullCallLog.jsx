import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getDbItem } from '../store/mockDb';

const FullCallLog = ({ onQuickCall }) => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');

  const loadLogs = () => {
    const callLogs = getDbItem('dispatcher_call_logs') || [];
    setLogs(callLogs);
  };

  useEffect(() => {
    loadLogs();
    
    // Set up storage change listener to keep logs synced
    const handleStorageChange = () => {
      loadLogs();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filteredLogs = logs.filter(log => 
    log.phone.includes(search) || 
    (log.client_name && log.client_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getCallTypeStyle = (type, status) => {
    if (status === 'MISSED') return 'text-rose-500 font-bold';
    if (type === 'INCOMING') return 'text-emerald-500 font-bold';
    return 'text-indigo-400 font-bold';
  };

  const getCallTypeText = (type, status) => {
    if (status === 'MISSED') return 'Missed';
    if (type === 'INCOMING') return 'In';
    return 'Out';
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#111522] border border-white/[0.04] rounded-2xl p-5 w-full h-full flex flex-col justify-between select-none text-xs font-semibold text-slate-200 shadow-2xl">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-white/[0.04] pb-3 shrink-0">
        <span className="font-extrabold text-[11px] text-slate-100 uppercase tracking-widest font-outfit">
          FULL CALL LOG <span className="ml-1 text-slate-500">(Barcha Qo'ng'iroqlar)</span>
        </span>
        
        {/* Search */}
        <div className="relative w-40">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tarixdan qidirish..."
            className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-lg pl-7.5 pr-2 py-1 text-[9.5px] text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Table scroll container */}
      <div className="flex-1 overflow-y-auto mt-3 pr-0.5 scrollbar-thin min-h-[140px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.04] text-[8.5px] text-slate-500 uppercase tracking-wider font-extrabold font-outfit">
              <th className="pb-2 font-bold">Time</th>
              <th className="pb-2 font-bold">Caller Name</th>
              <th className="pb-2 font-bold">Call Type</th>
              <th className="pb-2 font-bold">Duration</th>
              <th className="pb-2 font-bold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-550 font-bold uppercase tracking-wider text-[9px]">
                  Qo'ng'iroqlar topilmadi
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr 
                  key={log.id}
                  onClick={() => onQuickCall && onQuickCall(log.phone, log.client_name)}
                  className="hover:bg-white/[0.02] transition duration-150 cursor-pointer group text-[10.5px]"
                >
                  <td className="py-2.5 font-mono text-slate-450">{formatTime(log.created_at)}</td>
                  <td className="py-2.5 font-bold text-slate-200 group-hover:text-indigo-400 transition">
                    {log.client_name || log.phone}
                  </td>
                  <td className={`py-2.5 ${getCallTypeStyle(log.type, log.status)}`}>
                    {getCallTypeText(log.type, log.status)}
                  </td>
                  <td className="py-2.5 font-mono text-slate-350">{log.duration || '00:00'}</td>
                  <td className="py-2.5 text-slate-500 truncate max-w-[120px]" title="Gilam Yuvish, Dastur xizmati">
                    {log.client_name ? "Gilam Yuvish, Dast..." : "Noma'lum raqam"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FullCallLog;
