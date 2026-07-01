import React, { useState, useEffect } from 'react';
import { Clock, Phone, PhoneOff, ArrowUpRight, Check, Minus } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const SonggiQongiroqlar = ({ onQuickCall, onSelectClient }) => {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'INCOMING', 'OUTGOING', 'MISSED'

  const loadLogs = () => {
    const list = getDbItem('dispatcher_call_logs') || [];
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
    
    const handleStorageChange = () => {
      loadLogs();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleRemoveLog = (id, e) => {
    e.stopPropagation();
    const updated = logs.filter(log => log.id !== id);
    setLogs(updated);
    setDbItem('dispatcher_call_logs', updated);
  };

  const handleRowClick = (log) => {
    if (onSelectClient) {
      const clients = getDbItem('dispatcher_clients') || [];
      const client = clients.find(c => c.phone.replace(/\s+/g, '') === log.phone.replace(/\s+/g, ''));
      onSelectClient({
        full_name: client ? client.full_name : 'Noma\'lum',
        phone: log.phone,
        address: client ? client.address : ''
      });
    }
  };

  const getFilteredLogs = () => {
    if (activeTab === 'INCOMING') {
      return logs.filter(log => log.type === 'INCOMING' && log.status !== 'MISSED');
    }
    if (activeTab === 'OUTGOING') {
      return logs.filter(log => log.type === 'OUTGOING');
    }
    if (activeTab === 'MISSED') {
      return logs.filter(log => log.status === 'MISSED');
    }
    return logs;
  };

  const formatLogDate = (isoString) => {
    const d = new Date(isoString);
    const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${date} • ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 w-full h-full flex flex-col gap-4 text-xs font-semibold text-[var(--text-primary)] shadow-2xl transition-colors duration-300 min-h-0">
      
      {/* Header title */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3.5 shrink-0 select-none">
        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">So'nggi Qo'ng'iroqlar</span>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 shrink-0 select-none">
        {[
          { id: 'ALL', label: 'Barchasi' },
          { id: 'INCOMING', label: 'Kiruvchi' },
          { id: 'OUTGOING', label: 'Chiquvchi' },
          { id: 'MISSED', label: 'Olinmagan' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
              activeTab === tab.id
                ? 'bg-[var(--bg-keypad-btn-hover)] text-[var(--text-primary)] border border-indigo-500/25 shadow-md'
                : 'bg-[var(--bg-keypad-btn)]/30 border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs Scroll container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin min-h-[140px]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-[9.5px] text-[var(--text-muted)] font-bold uppercase tracking-wider select-none">
            Qo'ng'iroqlar tarixi bo'sh
          </div>
        ) : (
          filteredLogs.map(log => {
            const isIncoming = log.type === 'INCOMING';
            const isMissed = log.status === 'MISSED';
            
            return (
              <div
                key={log.id}
                onClick={() => handleRowClick(log)}
                className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)]/80 transition-all duration-200 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className="shrink-0">
                    {isMissed ? (
                      <PhoneOff className="w-4 h-4 text-rose-500" />
                    ) : isIncoming ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                      </div>
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="block font-black text-[var(--text-primary)] text-xs leading-none truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition">
                      {log.phone}
                    </span>
                    <span className="block text-[9.5px] text-[var(--text-muted)] font-mono mt-1.5 leading-none">
                      {formatLogDate(log.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleRemoveLog(log.id, e)}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-keypad-btn)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-550 flex items-center justify-center transition cursor-pointer border border-[var(--border-color)]"
                    title="O'chirish"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickCall(log.phone, log.client_name);
                    }}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-keypad-btn)] group-hover:bg-[#5850ec] text-[var(--text-muted)] group-hover:text-white flex items-center justify-center transition cursor-pointer border border-[var(--border-color)]"
                    title="Qo'ng'iroq qilish"
                  >
                    <Phone className="w-3.5 h-3.5" />
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

export default SonggiQongiroqlar;
