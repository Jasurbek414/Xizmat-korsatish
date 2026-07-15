import React from 'react';
import { History, Search, Phone } from 'lucide-react';

const CallHistory = ({
  filteredLogs,
  loadingLogs,
  searchQuery,
  setSearchQuery,
  setPhoneNumber,
  setCallStatus
}) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-transparent flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-4 h-4 text-indigo-500" /> Qo'ng'iroqlar tarixi
        </h4>
        
        {/* Search bar */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Raqam yoki nom bo'yicha qidirish"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-8.5 pr-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-semibold">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
              <th className="p-3">Mijoz / Raqam</th>
              <th className="p-3">Turi</th>
              <th className="p-3">Vaqt</th>
              <th className="p-3">Davomiyligi</th>
              <th className="p-3">Operator</th>
              <th className="p-3 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
            {loadingLogs ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold animate-pulse">
                  Yuklanmoqda...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Qo'ng'iroqlar tarixi bo'sh
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                  <td className="p-3">
                    <span className="font-semibold text-slate-800 dark:text-white block">{log.client_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.client_phone}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold inline-block border ${
                      log.direction === 'INBOUND' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/10'
                    }`}>
                      {log.direction === 'INBOUND' ? 'Kiruvchi' : 'Chiquvchi'}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-500 dark:text-gray-400 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-slate-600 dark:text-gray-300 font-mono">
                    {formatDuration(log.duration)}
                  </td>
                  <td className="p-3 font-medium text-slate-600 dark:text-gray-300">
                    {log.dispatcher_name}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneNumber(log.client_phone);
                        setCallStatus('DISCONNECTED');
                      }}
                      className="p-1 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-500 transition cursor-pointer"
                      title="Qayta qo'ng'iroq qilish"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
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

export default CallHistory;
