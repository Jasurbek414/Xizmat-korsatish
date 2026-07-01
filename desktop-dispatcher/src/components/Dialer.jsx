import React, { useState, useEffect, useRef } from 'react';
import sipService from '../services/sipService';
import { getDbItem, setDbItem } from '../store/mockDb';

import Keypad from './Keypad';
import SipLines from './SipLines';
import CallLogs from './CallLogs';
import DemoPanel from './DemoPanel';

const Dialer = () => {
  const [number, setNumber] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [callState, setCallState] = useState({ state: 'IDLE', number: '', clientName: '', isMuted: false, isHeld: false });
  const [duration, setDuration] = useState('00:00');
  const [sipStatus, setSipStatus] = useState('DISCONNECTED');
  
  // Segment view state
  const [activeView, setActiveView] = useState('dialer'); // 'dialer' or 'logs'

  // Multi-line specific states
  const [sipLines, setSipLines] = useState(() => getDbItem('dispatcher_sip_lines') || []);
  const [lineStatuses, setLineStatuses] = useState(sipService.lineStatuses);
  const [activeLineId, setActiveLineId] = useState(sipService.activeLineId);

  const timerRef = useRef(null);

  // Initialize and load call logs
  const loadLogs = () => {
    const logs = getDbItem('dispatcher_call_logs') || [];
    setCallLogs(logs);
  };

  useEffect(() => {
    loadLogs();
    setSipStatus(sipService.status);

    const handleStatusChange = (status) => {
      setSipStatus(status);
    };

    const handleCallStateChange = (state) => {
      setCallState({ ...state });
      
      // Auto switch to dialer tab if call becomes active or ringing
      if (state.state !== 'IDLE') {
        setActiveView('dialer');
      }

      if (state.state === 'ACTIVE') {
        // Start duration timer
        if (timerRef.current) clearInterval(timerRef.current);
        const start = state.startTime || Date.now();
        
        timerRef.current = setInterval(() => {
          const diff = Math.floor((Date.now() - start) / 1000);
          const mins = Math.floor(diff / 60).toString().padStart(2, '0');
          const secs = (diff % 60).toString().padStart(2, '0');
          setDuration(`${mins}:${secs}`);
        }, 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setDuration('00:00');
      }
    };

    const handleLogsChange = () => {
      loadLogs();
    };

    const handleLinesStatusChange = (data) => {
      setLineStatuses({ ...data.lineStatuses });
      setActiveLineId(data.activeLineId);
    };

    const handleStorageChange = () => {
      const updatedLines = getDbItem('dispatcher_sip_lines') || [];
      setSipLines(updatedLines);
      sipService.loadLines();
    };

    sipService.addEventListener('statusChange', handleStatusChange);
    sipService.addEventListener('callStateChange', handleCallStateChange);
    sipService.addEventListener('logsChange', handleLogsChange);
    sipService.addEventListener('linesStatusChange', handleLinesStatusChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      sipService.removeEventListener('statusChange', handleStatusChange);
      sipService.removeEventListener('callStateChange', handleCallStateChange);
      sipService.removeEventListener('logsChange', handleLogsChange);
      sipService.removeEventListener('linesStatusChange', handleLinesStatusChange);
      window.removeEventListener('storage', handleStorageChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Formatter for display
  const formatDisplayNumber = (raw) => {
    let clean = raw.replace(/\D/g, '');
    if (clean.startsWith('998')) {
      clean = clean.substring(3);
    }
    
    let formatted = '+998 ';
    if (clean.length > 0) {
      formatted += '(' + clean.substring(0, 2);
    } else {
      formatted += '(__';
    }
    
    if (clean.length > 2) {
      formatted += ') ' + clean.substring(2, 5);
    } else {
      formatted += ') ___';
    }
    
    if (clean.length > 5) {
      formatted += '-' + clean.substring(5, 7);
    } else {
      formatted += '-__';
    }
    
    if (clean.length > 7) {
      formatted += '-' + clean.substring(7, 9);
    } else {
      formatted += '-__';
    }
    
    return formatted;
  };

  const handleKeyPress = (digit) => {
    if (number.length >= 12) return;
    setNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setNumber('');
  };

  const handleStartCall = () => {
    let clean = number.replace(/\D/g, '');
    if (!clean.startsWith('998')) clean = '998' + clean;
    if (clean.length < 7 || sipStatus !== 'CONNECTED') return;
    
    const displayPhone = '+' + clean;
    
    // Check if matches client in DB
    const clients = getDbItem('dispatcher_clients') || [];
    const client = clients.find(c => c.phone.replace(/\s+/g, '') === displayPhone.replace(/\s+/g, ''));
    
    sipService.makeCall(displayPhone, client ? client.full_name : null);
  };

  const handleEndCall = () => {
    sipService.hangUp();
  };

  const handleToggleMute = () => {
    sipService.toggleMute();
  };

  const handleToggleHold = () => {
    sipService.toggleHold();
  };

  const handleRedial = () => {
    if (sipStatus !== 'CONNECTED' || callState.state !== 'IDLE') return;
    const logs = getDbItem('dispatcher_call_logs') || [];
    const lastOutgoing = logs.find(log => log.type === 'OUTGOING');
    if (lastOutgoing) {
      setNumber(lastOutgoing.phone);
      sipService.makeCall(lastOutgoing.phone, lastOutgoing.client_name);
    }
  };

  const handleQuickCall = (phone, name) => {
    if (sipStatus !== 'CONNECTED' || callState.state !== 'IDLE') return;
    setNumber(phone);
    sipService.makeCall(phone, name);
  };

  const handleToggleSip = () => {
    if (activeLineId) {
      const isConnected = lineStatuses[activeLineId] === 'CONNECTED';
      if (isConnected) {
        sipService.disconnectLine(activeLineId);
      } else {
        sipService.connectLine(activeLineId);
      }
    }
  };

  const triggerIncomingSimulation = () => {
    if (sipStatus !== 'CONNECTED' || callState.state !== 'IDLE') return;
    
    const clients = getDbItem('dispatcher_clients') || [];
    const pool = [
      ...clients,
      { full_name: 'Noma\'lum Mijoz', phone: '+998 97 555 44 33' },
      { full_name: 'Farkhod Karimov', phone: '+998 90 999 11 22' }
    ];

    const pick = pool[Math.floor(Math.random() * pool.length)];
    sipService.simulateIncomingCall(pick.phone, pick.full_name);
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Filter logs list
  const filteredLogs = callLogs.filter(log => 
    log.phone.includes(search) || 
    (log.client_name && log.client_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Dynamic Statistics
  const chiquvchiCount = callLogs.filter(log => log.type === 'OUTGOING').length;
  const kiruvchiCount = callLogs.filter(log => log.type === 'INCOMING' && log.status !== 'MISSED').length;
  const javobsizCount = callLogs.filter(log => log.status === 'MISSED').length;
  
  const getUmumiyDuration = () => {
    let totalSecs = 0;
    callLogs.forEach(log => {
      if (log.duration && log.duration !== '--') {
        const parts = log.duration.split(' ');
        let min = 0, sec = 0;
        parts.forEach(p => {
          if (p.endsWith('m')) min = parseInt(p) || 0;
          if (p.endsWith('s')) sec = parseInt(p) || 0;
        });
        totalSecs += min * 60 + sec;
      }
    });
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full text-xs font-semibold select-none text-slate-200">
      
      {/* Segmented View Switcher Header */}
      <div className="flex bg-[#161e31]/80 border border-slate-800/60 p-1 rounded-xl shrink-0 mb-4">
        <button
          type="button"
          onClick={() => setActiveView('dialer')}
          className={`flex-1 py-2 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider transition cursor-pointer text-center ${
            activeView === 'dialer'
              ? 'bg-[#5850ec] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Klaviatura
        </button>
        <button
          type="button"
          onClick={() => setActiveView('logs')}
          className={`flex-1 py-2 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider transition cursor-pointer text-center ${
            activeView === 'logs'
              ? 'bg-[#5850ec] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tarix & Testlar
        </button>
      </div>

      {/* Main Tab Render Container */}
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        
        {activeView === 'dialer' ? (
          /* TAB 1: softphone dialer KEYPAD VIEW */
          <div className="flex-1 flex flex-col justify-between min-h-0">
            <Keypad
              number={number}
              sipStatus={sipStatus}
              callState={callState}
              duration={duration}
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              onRedial={handleRedial}
              onToggleHold={handleToggleHold}
              onToggleMute={handleToggleMute}
              onToggleSip={handleToggleSip}
              formatDisplayNumber={formatDisplayNumber}
            />

            <SipLines
              sipLines={sipLines}
              lineStatuses={lineStatuses}
              activeLineId={activeLineId}
              callState={callState}
              duration={duration}
            />
          </div>
        ) : (
          /* TAB 2: CALL LOGS HISTORY & SIMULATOR VIEW */
          <div className="flex-1 flex flex-col justify-between min-h-0 select-none">
            <CallLogs
              filteredLogs={filteredLogs}
              search={search}
              onSearchChange={setSearch}
              onQuickCall={handleQuickCall}
              chiquvchiCount={chiquvchiCount}
              kiruvchiCount={kiruvchiCount}
              javobsizCount={javobsizCount}
              umumiyDuration={getUmumiyDuration()}
              formatTime={formatTime}
            />

            <DemoPanel
              callState={callState}
              onSimulate={triggerIncomingSimulation}
            />
          </div>
        )}

      </div>

    </div>
  );
};

export default Dialer;
