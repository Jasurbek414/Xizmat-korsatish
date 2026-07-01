import React, { useState, useEffect, useRef } from 'react';
import sipService from '../services/sipService';
import { getDbItem, setDbItem } from '../store/mockDb';

import Keypad from './Keypad';
import SipLines from './SipLines';

const Dialer = () => {
  const [number, setNumber] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [callState, setCallState] = useState({ state: 'IDLE', number: '', clientName: '', isMuted: false, isHeld: false });
  const [duration, setDuration] = useState('00:00');
  const [sipStatus, setSipStatus] = useState('DISCONNECTED');
  
  // Multi-line specific states
  const [sipLines, setSipLines] = useState(() => getDbItem('dispatcher_sip_lines') || []);
  const [lineStatuses, setLineStatuses] = useState(sipService.lineStatuses);
  const [activeLineId, setActiveLineId] = useState(sipService.activeLineId);

  const timerRef = useRef(null);

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
      
      if (state.state === 'ACTIVE') {
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
    <div className="flex flex-col h-full text-xs font-semibold select-none text-slate-200 justify-between">
      
      {/* 1. Keypad Card */}
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

      {/* 2. Sip Lines Panel (flex-1 expands lines down) */}
      <div className="flex-1 min-h-0 mt-3.5">
        <SipLines
          sipLines={sipLines}
          lineStatuses={lineStatuses}
          activeLineId={activeLineId}
          callState={callState}
          duration={duration}
        />
      </div>

      {/* 3. Footer Statistics Row (pinned at bottom) */}
      <div className="grid grid-cols-4 border border-[var(--border-color)] bg-[var(--bg-keypad-btn-hover)] text-center divide-x divide-[var(--border-color)] text-[7px] font-bold rounded-xl select-none shrink-0 mt-3.5 font-outfit">
        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs font-bold text-[var(--text-primary)] font-mono leading-none">{chiquvchiCount}</span>
          <span className="uppercase tracking-wide text-[var(--text-muted)]">Chiquvchi</span>
        </div>
        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs font-bold text-[var(--text-primary)] font-mono leading-none">{kiruvchiCount}</span>
          <span className="uppercase tracking-wide text-[var(--text-muted)]">Kiruvchi</span>
        </div>
        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs font-bold text-rose-500 font-mono leading-none">{javobsizCount}</span>
          <span className="uppercase tracking-wide text-[var(--text-muted)]">Javobsiz</span>
        </div>
        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs font-bold text-[var(--text-primary)] font-mono leading-none">{getUmumiyDuration()}</span>
          <span className="uppercase tracking-wide text-[var(--text-muted)]">Umumiy</span>
        </div>
      </div>

    </div>
  );
};

export default Dialer;
