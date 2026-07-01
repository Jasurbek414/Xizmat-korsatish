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
            
            {/* Keypad Card */}
            <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-4.5 flex flex-col justify-between flex-1 min-h-[380px]">
              
              {/* SIP Status Header */}
              <div 
                onClick={handleToggleSip}
                className="px-3.5 py-2.5 bg-[#0b0e17] border border-slate-800/60 rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#131722] transition shrink-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    sipStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : sipStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    {sipStatus === 'CONNECTED' ? 'SIP Ulanish: Faol' : sipStatus === 'CONNECTING' ? 'SIP Ulanmoqda...' : 'SIP Ulanmagan'}
                  </span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              </div>

              {/* Number Display Box */}
              <div className="w-full bg-[#0b0e17] border border-slate-800/60 p-3 rounded-lg flex items-center justify-center min-h-[46px] my-3.5 shrink-0">
                <span className="text-sm font-extrabold text-indigo-400 font-mono tracking-wider">
                  {formatDisplayNumber(number)}
                </span>
              </div>

              {/* Rectangular Grid Keypad */}
              <div className="grid grid-cols-3 gap-2 flex-1 my-1.5">
                {[
                  { d: '1', l: ' ' }, { d: '2', l: 'ABC' }, { d: '3', l: 'DEF' },
                  { d: '4', l: 'GHI' }, { d: '5', l: 'JKL' }, { d: '6', l: 'MNO' },
                  { d: '7', l: 'PQRS' }, { d: '8', l: 'TUV' }, { d: '9', l: 'WXYZ' },
                  { d: '*', l: '' }, { d: '0', l: '+' }, { d: '#', l: '' }
                ].map(btn => (
                  <button
                    key={btn.d}
                    type="button"
                    onClick={() => handleKeyPress(btn.d)}
                    className="bg-[#1c243b] hover:bg-[#232c48] active:bg-[#5850ec]/20 border border-slate-800/40 rounded-lg flex flex-col items-center justify-center cursor-pointer transition select-none py-1.5"
                  >
                    <span className="text-xs font-bold text-slate-200 font-mono leading-none">
                      {btn.d}
                    </span>
                    <span className="text-[5.5px] text-slate-500 font-bold block mt-0.5 leading-none h-1 uppercase">
                      {btn.l}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center gap-6 py-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={number.length === 0}
                  className="w-8 h-8 rounded-full bg-[#1c243b] hover:bg-[#232c48] disabled:opacity-30 text-slate-400 flex items-center justify-center cursor-pointer border border-slate-800/40"
                  title="O'chirish"
                >
                  <PhoneOff className="w-3.5 h-3.5 rotate-180" />
                </button>

                {callState.state !== 'IDLE' ? (
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95 transition"
                    title="Aloqani uzish"
                  >
                    <PhoneOff className="w-4.5 h-4.5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartCall}
                    disabled={number.replace(/\D/g, '').length < 3 || sipStatus !== 'CONNECTED'}
                    className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                    title="Qo'ng'iroq"
                  >
                    <Phone className="w-4.5 h-4.5 fill-white" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={number.length === 0}
                  className="w-8 h-8 rounded-full bg-[#1c243b] hover:bg-[#232c48] disabled:opacity-30 text-slate-400 flex items-center justify-center cursor-pointer border border-slate-800/40"
                  title="Tozalash"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Control Action Bar */}
              <div className="flex justify-between px-2 pt-2.5 border-t border-slate-800/40 text-[9px] font-bold text-slate-400 select-none shrink-0 mt-1">
                <button 
                  type="button"
                  onClick={handleRedial}
                  disabled={sipStatus !== 'CONNECTED' || callState.state !== 'IDLE'}
                  className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer disabled:opacity-40"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Qayta</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer opacity-50 cursor-not-allowed">
                  <Share2 className="w-3.5 h-3.5 rotate-90" />
                  <span>Transfer</span>
                </button>
                <button 
                  type="button"
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
                  type="button"
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

            </div>

            {/* Lines list widget */}
            <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-3.5 mt-3 select-none shrink-0">
              <span className="text-[8.5px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-[#4f6efe]" /> Liniyalar ({sipLines.length})
                </span>
              </span>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-0.5 scrollbar-thin">
                {sipLines.length === 0 ? (
                  <div className="text-center py-2 opacity-40 text-slate-450 select-none">
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
                        className={`p-2 rounded-lg border flex items-center justify-between transition select-none ${
                          isActive 
                            ? 'border-indigo-500/40 bg-indigo-500/10' 
                            : 'border-slate-800/40 bg-[#1c243b]/40 hover:border-slate-800/60'
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
                            <span className="block text-[9.5px] font-bold text-slate-200 truncate leading-none mb-0.5">{line.label}</span>
                            <span className="text-[8px] text-slate-450 font-mono">ext: {line.extension}</span>
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
                                : 'text-slate-500 hover:text-emerald-500'
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

          </div>
        ) : (
          /* TAB 2: CALL LOGS HISTORY & SIMULATOR VIEW */
          <div className="flex-1 flex flex-col justify-between min-h-0 select-none">
            
            {/* Call Logs Container */}
            <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-4.5 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5 shrink-0">
                <span className="font-extrabold text-[10.5px] text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Qo'ng'iroqlar Tarixi
                </span>
                
                <div className="relative w-28">
                  <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                  <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Qidirish..."
                    className="w-full bg-[#0b0e17] border border-slate-800/60 rounded-lg pl-7 pr-2 py-1 text-[9.5px] text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logs scrolling panel - takes up all available tab space dynamically! */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin max-h-[290px] min-h-[160px]">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 font-bold">
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
                            isMissed ? 'text-rose-455' : 'text-slate-500'
                          }`}>
                            {isMissed ? 'Javobsiz' : 'Qabul qilingan'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Statistics Footer grid within history panel */}
              <div className="grid grid-cols-4 border-t border-slate-800/40 bg-[#0b0e17]/40 text-center divide-x divide-slate-800/40 text-[7.5px] font-bold text-slate-450 rounded-lg select-none shrink-0 mt-1">
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
                  <span className="text-xs font-bold text-slate-200 font-mono leading-none">{getUmumiyDuration()}</span>
                  <span className="uppercase tracking-wide text-slate-550 mt-0.5">Umumiy</span>
                </div>
              </div>

            </div>

            {/* Test Simulation Controls card */}
            {sipService.status === 'CONNECTED' && (
              <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-3.5 mt-3 flex flex-col gap-2.5 shrink-0">
                <div className="flex items-start gap-2 text-indigo-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-[8.5px] uppercase tracking-wider block">Demostratsiya Paneli</span>
                    <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                      Kirish qo'ng'irog'ini sinash uchun simulated call jo'natish.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={triggerIncomingSimulation}
                  disabled={callState.state !== 'IDLE'}
                  className="flex items-center justify-center gap-1.5 bg-[#5850ec] hover:bg-[#4f46e5] disabled:opacity-50 text-white font-extrabold py-2 rounded-lg text-[9px] uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-500/10 w-full"
                >
                  <PhoneIncoming className="w-3 h-3 fill-white" />
                  <span>Call Simulyatsiya</span>
                </button>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};

export default Dialer;
