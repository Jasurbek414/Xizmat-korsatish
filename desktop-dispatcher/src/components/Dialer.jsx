import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Play, Pause, Search, Clock, ArrowUpRight, ArrowDownRight, AlertCircle, PhoneIncoming, X, Share2, FolderOpen, Radio, Power } from 'lucide-react';
import sipService from '../services/sipService';
import { getDbItem, setDbItem } from '../store/mockDb';

const Dialer = () => {
  const [number, setNumber] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [callState, setCallState] = useState({ state: 'IDLE', number: '', clientName: '', isMuted: false, isHeld: false });
  const [duration, setDuration] = useState('00:00');
  const [sipStatus, setSipStatus] = useState('DISCONNECTED');
  
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

    // Listen to SIP Service events
    const handleStatusChange = (status) => {
      setSipStatus(status);
    };

    const handleCallStateChange = (stateInfo) => {
      setCallState(stateInfo);
      
      // Handle call duration timer
      if (stateInfo.state === 'ACTIVE') {
        if (timerRef.current) clearInterval(timerRef.current);
        const startTime = stateInfo.startTime || Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const secs = (elapsed % 60).toString().padStart(2, '0');
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

    const handleCallEnded = (endedCall) => {
      const logs = getDbItem('dispatcher_call_logs') || [];
      const newLog = {
        id: 'call_' + Date.now(),
        phone: endedCall.number,
        client_name: endedCall.clientName || null,
        type: endedCall.status === 'MISSED' ? 'INCOMING' : 'OUTGOING',
        status: endedCall.status,
        duration: endedCall.duration,
        created_at: new Date().toISOString()
      };
      const updatedLogs = [newLog, ...logs].slice(0, 50);
      setDbItem('dispatcher_call_logs', updatedLogs);
      loadLogs();
    };

    const handleLinesStatusChange = (data) => {
      setLineStatuses({ ...data.lineStatuses });
      setActiveLineId(data.activeLineId);
    };

    const handleStorageChange = () => {
      setSipLines(getDbItem('dispatcher_sip_lines') || []);
    };

    sipService.addEventListener('statusChange', handleStatusChange);
    sipService.addEventListener('callStateChange', handleCallStateChange);
    sipService.addEventListener('callEnded', handleCallEnded);
    sipService.addEventListener('linesStatusChange', handleLinesStatusChange);
    window.addEventListener('storage', handleStorageChange);

    // Initial state check
    setCallState({
      state: sipService.callState,
      number: sipService.callNumber,
      clientName: sipService.callClientName,
      isMuted: sipService.isMuted,
      isHeld: sipService.isHeld
    });
    setLineStatuses({ ...sipService.lineStatuses });
    setActiveLineId(sipService.activeLineId);

    return () => {
      sipService.removeEventListener('statusChange', handleStatusChange);
      sipService.removeEventListener('callStateChange', handleCallStateChange);
      sipService.removeEventListener('callEnded', handleCallEnded);
      sipService.removeEventListener('linesStatusChange', handleLinesStatusChange);
      window.removeEventListener('storage', handleStorageChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format typed number to +998 XX XXX XX XX
  const formatDisplayNumber = (raw) => {
    let digits = raw.replace(/\D/g, '');
    
    // Remove starting 998 if typed
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    
    digits = digits.slice(0, 9);
    
    let formatted = '+998 ';
    for (let i = 0; i < 9; i++) {
      if (i === 2) formatted += ' ';
      if (i === 5) formatted += ' ';
      if (i === 7) formatted += ' ';
      
      if (digits[i]) {
        formatted += digits[i];
      } else {
        formatted += '_';
      }
    }
    return formatted;
  };

  // Keypad button press
  const handleKeyPress = (digit) => {
    sipService.playDtmf(digit);
    if (callState.state === 'IDLE' || callState.state === 'DIALING') {
      let clean = number.replace(/\D/g, '');
      if (clean.startsWith('998')) clean = clean.slice(3);
      
      if (clean.length < 9) {
        setNumber(prev => prev + digit);
      }
    }
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
    <div className="flex flex-col gap-4 items-stretch h-full animate-fade-in text-xs font-semibold select-none">
      
      {/* Top Pane: Phone Keypad Widget */}
      <div className="w-full bg-[#0e121e]/90 border border-white/5 rounded-2xl flex flex-col justify-between select-none shrink-0 min-h-[420px] overflow-hidden shadow-2xl relative">
        
        {/* SIP Status Header */}
        <div 
          onClick={handleToggleSip}
          className="px-4 py-3 bg-white/2 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              sipStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : sipStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] text-slate-350 tracking-wide font-bold">
              {sipStatus === 'CONNECTED' ? 'SIP Faol' : sipStatus === 'CONNECTING' ? 'SIP Ulanmoqda...' : 'SIP Ulanmagan'}
            </span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        </div>

        {/* Core Dialer Layout */}
        <div className="flex-1 p-4 flex flex-col gap-4 justify-start">
          
          {/* Formatted Mask Number Display */}
          <div className="w-full bg-[#131722]/80 border border-white/5 p-3 rounded-xl flex items-center justify-center min-h-[48px]">
            <span className="text-[15px] font-bold text-[#4f6efe] dark:text-indigo-400 font-mono tracking-wider">
              {formatDisplayNumber(number)}
            </span>
          </div>

          {/* Rectangular Grid Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { d: '1', l: ' ' }, { d: '2', l: 'ABC' }, { d: '3', l: 'DEF' },
              { d: '4', l: 'GHI' }, { d: '5', l: 'JKL' }, { d: '6', l: 'MNO' },
              { d: '7', l: 'PQRS' }, { d: '8', l: 'TUV' }, { d: '9', l: 'WXYZ' },
              { d: '*', l: '' }, { d: '0', l: '+' }, { d: '#', l: '' }
            ].map(btn => (
              <button
                key={btn.d}
                onClick={() => handleKeyPress(btn.d)}
                className="bg-[#181d2c] hover:bg-[#20273a] active:bg-indigo-500/20 border border-white/2 py-2.5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition select-none group"
              >
                <span className="text-sm font-bold text-slate-100 group-active:text-[#4f6efe] font-mono leading-none">
                  {btn.d}
                </span>
                <span className="text-[6px] text-slate-400 font-bold block mt-0.5 leading-none h-1.5 uppercase">
                  {btn.l}
                </span>
              </button>
            ))}
          </div>

          {/* Action Row: Backspace, Call/Hangup, Clear */}
          <div className="flex items-center justify-center gap-5 py-1">
            {/* Backspace button */}
            <button
              onClick={handleBackspace}
              disabled={number.length === 0}
              className="w-9 h-9 rounded-full bg-[#181d2c] hover:bg-[#20273a] disabled:opacity-30 text-slate-400 flex items-center justify-center cursor-pointer border border-white/5 active:scale-95 transition"
              title="O'chirish"
            >
              <PhoneOff className="w-3.5 h-3.5 rotate-180" />
            </button>

            {/* Middle Green Call button */}
            {callState.state !== 'IDLE' ? (
              <button
                onClick={handleEndCall}
                className="w-13 h-13 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95 transition"
                title="Aloqani uzish"
              >
                <PhoneOff className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                onClick={handleStartCall}
                disabled={number.replace(/\D/g, '').length < 3 || sipStatus !== 'CONNECTED'}
                className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                title="Qo'ng'iroq"
              >
                <Phone className="w-5 h-5 fill-white" />
              </button>
            )}

            {/* Clear Button */}
            <button
              onClick={handleClear}
              disabled={number.length === 0}
              className="w-9 h-9 rounded-full bg-[#181d2c] hover:bg-[#20273a] disabled:opacity-30 text-slate-400 flex items-center justify-center cursor-pointer border border-white/5 active:scale-95 transition"
              title="Tozalash"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Control Bar */}
          <div className="flex justify-between px-2 pt-2 border-t border-white/5 text-[8px] font-bold text-slate-400 select-none">
            <button 
              onClick={handleRedial}
              disabled={sipStatus !== 'CONNECTED' || callState.state !== 'IDLE'}
              className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer disabled:opacity-40"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Qayta</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer opacity-50 cursor-not-allowed">
              <Share2 className="w-3.5 h-3.5 rotate-90" />
              <span>Transfer</span>
            </button>
            <button 
              onClick={handleToggleHold}
              disabled={callState.state !== 'ACTIVE' && callState.state !== 'HOLD'}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                callState.isHeld ? 'text-amber-500' : 'hover:text-indigo-400 disabled:opacity-40'
              }`}
            >
              {callState.isHeld ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>Kutish</span>
            </button>
            <button 
              onClick={handleToggleMute}
              disabled={callState.state !== 'ACTIVE' && callState.state !== 'HOLD'}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                callState.isMuted ? 'text-rose-500' : 'hover:text-indigo-400 disabled:opacity-40'
              }`}
            >
              {callState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>Mute</span>
            </button>
          </div>

          {/* Liniyalar Card Panel */}
          <div className="mt-1 bg-[#131722]/60 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#4f6efe]" /> Liniyalar ({sipLines.length})
              </span>
              <span className="text-[7px] text-indigo-400 font-medium">Boshqarish uchun bosing</span>
            </span>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-0.5 scrollbar-thin">
              {sipLines.length === 0 ? (
                <div className="text-center py-4 opacity-40 text-slate-450 select-none">
                  <FolderOpen className="w-4 h-4 stroke-1 mx-auto mb-1" />
                  <span className="text-[10px] font-bold font-mono block">Liniyalar yo'q</span>
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
                      className={`p-1.5 rounded-lg border flex items-center justify-between transition select-none ${
                        isActive 
                          ? 'border-indigo-500/40 bg-indigo-500/10' 
                          : 'border-white/2 bg-[#181d2c]/40 hover:border-white/5'
                      } ${status !== 'CONNECTED' ? 'opacity-65 hover:opacity-85' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {/* Status indicator dot */}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isLineCallActive 
                            ? 'bg-rose-500 animate-pulse' 
                            : status === 'CONNECTED' 
                            ? 'bg-emerald-500 animate-pulse' 
                            : status === 'CONNECTING' 
                            ? 'bg-amber-500 animate-pulse' 
                            : 'bg-slate-500'
                        }`} />
                        <div className="truncate">
                          <span className="block text-[11px] font-bold text-slate-200 truncate leading-none">{line.label}</span>
                          <span className="text-[9.5px] text-slate-450 font-mono">ext: {line.extension}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Call Active Indicator */}
                        {isLineCallActive && (
                          <span className="text-[8.5px] text-rose-500 font-bold font-mono animate-pulse mr-1">
                            {isActive ? duration : 'BAND'}
                          </span>
                        )}
                        
                        {/* Quick connection toggle icon */}
                        <button
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
                              : 'text-slate-500 hover:text-emerald-500'
                          }`}
                          title={status === 'CONNECTED' ? "Liniyani o'chirish" : "Liniyani yoqish"}
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

        </div>

        {/* Footer Statistics Row */}
        <div className="grid grid-cols-4 border-t border-white/5 bg-white/1 text-center divide-x divide-white/5 text-[7px] font-bold text-slate-450 select-none shrink-0">
          <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
            <span className="text-xs font-bold text-slate-100 font-mono leading-none">{chiquvchiCount}</span>
            <span className="uppercase tracking-wide text-slate-500">Chiquvchi</span>
          </div>
          <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
            <span className="text-xs font-bold text-slate-100 font-mono leading-none">{kiruvchiCount}</span>
            <span className="uppercase tracking-wide text-slate-500">Kiruvchi</span>
          </div>
          <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
            <span className="text-xs font-bold text-slate-100 font-mono leading-none text-rose-500">{javobsizCount}</span>
            <span className="uppercase tracking-wide text-slate-500">Javobsiz</span>
          </div>
          <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
            <span className="text-xs font-bold text-slate-100 font-mono leading-none">{getUmumiyDuration()}</span>
            <span className="uppercase tracking-wide text-slate-500">Umumiy</span>
          </div>
        </div>

      </div>

      {/* Bottom Pane: Call Logs & Simulator Console */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 items-stretch overflow-hidden">
        
        {/* Call Logs Container */}
        <div className="flex-1 glass-card p-5 rounded-2xl flex flex-col gap-4 overflow-hidden">
          
          <div className="flex justify-between items-center border-b border-slate-250/20 dark:border-white/5 pb-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white font-['Outfit'] m-0 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Qo'ng'iroqlar Tarixi
            </h3>
            
            <div className="relative w-40">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-450 dark:text-gray-550" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tarixdan qidirish..."
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-[9px] text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin max-h-[190px]">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-gray-500 font-medium">
                Qo'ng'iroqlar tarixi bo'sh
              </div>
            ) : (
              filteredLogs.map(log => {
                const isIncoming = log.type === 'INCOMING';
                const isMissed = log.status === 'MISSED';
                
                return (
                  <div 
                    key={log.id}
                    onClick={() => handleQuickCall(log.phone, log.client_name)}
                    className="p-2.5 bg-slate-50/50 dark:bg-white/2 border border-slate-150 dark:border-white/5 hover:border-indigo-500/20 rounded-xl flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {/* Call Icon Status */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isMissed 
                          ? 'bg-rose-500/10 text-rose-600' 
                          : isIncoming 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : 'bg-indigo-500/10 text-indigo-600'
                      }`}>
                        {isIncoming ? (
                          isMissed ? <PhoneOff className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                      </div>

                      {/* Caller Details */}
                      <div className="min-w-0">
                        <span className="block font-bold text-slate-850 dark:text-white text-xs group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition truncate">
                          {log.client_name || 'Noma\'lum raqam'}
                        </span>
                        <span className="block text-[10.5px] text-slate-450 dark:text-gray-500 font-mono mt-0.5 truncate">
                          {log.phone} &nbsp;&bull;&nbsp; {formatTime(log.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {log.duration}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${
                        isMissed ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {isMissed ? 'O\'tkazib yuborilgan' : 'Qabul qilingan'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Demo Call Simulation Control HUD */}
        {sipService.status === 'CONNECTED' && (
          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2 text-indigo-600 dark:text-indigo-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[9px] uppercase tracking-wider block">Demostratsiya Paneli</span>
                <span className="text-[9px] text-slate-500 dark:text-gray-400 font-medium block mt-0.5">
                  SIP ulanishini testlash uchun operatorga simulated kirish qo'ng'irog'i jo'natish.
                </span>
              </div>
            </div>

            <button
              onClick={triggerIncomingSimulation}
              disabled={callState.state !== 'IDLE'}
              className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-[9px] transition cursor-pointer shadow-md shadow-indigo-500/10 shrink-0"
            >
              <PhoneIncoming className="w-3 h-3 fill-white" />
              <span>Kiruvchi Call Simulyatsiya</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default Dialer;

