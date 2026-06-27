import React, { useState, useEffect } from 'react';
import { Save, Radio, Shield, Globe, Monitor, Volume2, Mic, Settings as ConfigIcon, User, Network, ShieldCheck, Check, Plus, Trash2, Edit3, Power, X } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';
import sipService from '../services/sipService';

const Settings = ({ auth }) => {
  const [activeTab, setActiveTab] = useState('sip');

  // SIP accounts list
  const [sipLines, setSipLines] = useState(() => getDbItem('dispatcher_sip_lines') || []);
  const [lineStatuses, setLineStatuses] = useState(sipService.lineStatuses);
  const [activeLineId, setActiveLineId] = useState(sipService.activeLineId);

  // Edit / Add States
  const [isAdding, setIsAdding] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [newForm, setNewForm] = useState({
    label: '',
    domain: 'sip.servicecore.uz',
    port: '5060',
    extension: '',
    password: ''
  });

  // Sync lines and statuses
  useEffect(() => {
    const handleLinesStatusChange = (data) => {
      setLineStatuses({ ...data.lineStatuses });
      setActiveLineId(data.activeLineId);
    };

    sipService.addEventListener('linesStatusChange', handleLinesStatusChange);

    // Initial sync
    setLineStatuses({ ...sipService.lineStatuses });
    setActiveLineId(sipService.activeLineId);
    setSipLines(getDbItem('dispatcher_sip_lines') || []);

    return () => {
      sipService.removeEventListener('linesStatusChange', handleLinesStatusChange);
    };
  }, []);

  // Advanced VoIP configs
  const [voipConfig, setVoipConfig] = useState(() => getDbItem('dispatcher_voip_advanced') || {
    transport: 'UDP',
    stun: 'stun.l.google.com:19302',
    srtp: true,
    codecs: ['PCMA', 'PCMU', 'Opus']
  });

  // Audio configs
  const [audioConfig, setAudioConfig] = useState(() => getDbItem('dispatcher_audio_config') || {
    inputDevice: 'default_mic',
    outputDevice: 'default_speaker',
    ringVolume: 80,
    micSensitivity: 70,
    ringtone: 'classic'
  });

  // Application configs
  const [appConfig, setAppConfig] = useState(() => getDbItem('dispatcher_app_config') || {
    autoAnswer: false,
    dtmfTones: true,
    language: 'uz'
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAll = (e) => {
    if (e) e.preventDefault();
    setDbItem('dispatcher_voip_advanced', voipConfig);
    setDbItem('dispatcher_audio_config', audioConfig);
    setDbItem('dispatcher_app_config', appConfig);

    // Save language in local storage
    localStorage.setItem('dispatcher_lang', appConfig.language);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCodecToggle = (codec) => {
    let current = [...voipConfig.codecs];
    if (current.includes(codec)) {
      current = current.filter(c => c !== codec);
    } else {
      current.push(codec);
    }
    setVoipConfig({ ...voipConfig, codecs: current });
  };

  // SIP accounts management handlers
  const handleToggleLineConnection = (lineId) => {
    const isConnected = lineStatuses[lineId] === 'CONNECTED';
    if (isConnected) {
      sipService.disconnectLine(lineId);
    } else {
      sipService.connectLine(lineId);
    }
  };

  const handleSetActiveLine = (lineId) => {
    sipService.setActiveLine(lineId);
  };

  const handleDeleteLine = (lineId) => {
    const isConfirm = window.confirm("Rostdan ham ushbu SIP liniyani o'chirmoqchimisiz?");
    if (!isConfirm) return;

    sipService.disconnectLine(lineId);
    const updated = sipLines.filter(l => l.id !== lineId);
    setSipLines(updated);
    setDbItem('dispatcher_sip_lines', updated);
    
    // If the active line was deleted, select another one
    if (activeLineId === lineId) {
      if (updated.length > 0) {
        sipService.setActiveLine(updated[0].id);
      } else {
        localStorage.removeItem('dispatcher_sip_config');
      }
    }
    sipService.loadLines();
  };

  const handleSaveLineForm = (e) => {
    e.preventDefault();
    if (isAdding) {
      const newLine = {
        id: 'sip_line_' + Date.now(),
        label: newForm.label,
        domain: newForm.domain,
        port: newForm.port,
        extension: newForm.extension,
        password: newForm.password,
        connected: false,
        isActive: sipLines.length === 0 // make active if first line
      };
      const updated = [...sipLines, newLine];
      setSipLines(updated);
      setDbItem('dispatcher_sip_lines', updated);
      
      // Load and set active if it's the only one
      sipService.loadLines();
      if (newLine.isActive) {
        sipService.setActiveLine(newLine.id);
      }

      setIsAdding(false);
      setNewForm({
        label: '',
        domain: 'sip.servicecore.uz',
        port: '5060',
        extension: '',
        password: ''
      });
    } else if (editingLine) {
      const updated = sipLines.map(l => l.id === editingLine.id ? { 
        ...l, 
        label: editingLine.label, 
        domain: editingLine.domain, 
        port: editingLine.port, 
        extension: editingLine.extension, 
        password: editingLine.password 
      } : l);
      setSipLines(updated);
      setDbItem('dispatcher_sip_lines', updated);
      
      sipService.loadLines();
      setEditingLine(null);
    }
  };

  return (
    <div className="flex flex-col h-full text-xs font-semibold text-slate-800 dark:text-gray-150 select-none">
      
      {/* Modal Title Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-tight m-0 font-['Outfit']">Sozlamalar</h2>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium mt-0.5">SIP/VoIP ulanishi va operator konsoli sozlamalarini boshqarish</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/15 text-emerald-600 rounded-xl p-2.5 text-[9px] font-bold mt-3">
          Barcha sozlamalar saqlandi va ulanish yangilandi.
        </div>
      )}

      {/* Main Settings Content Tabbed Grid */}
      <div className="flex-1 flex gap-4 mt-4 min-h-0">
        
        {/* Left Side Tab Navigation */}
        <div className="w-40 border-r border-slate-200 dark:border-white/5 pr-3 flex flex-col gap-1.5 shrink-0">
          {[
            { id: 'sip', name: 'SIP Sozlamalari', icon: Radio },
            { id: 'audio', name: 'Ovoz & Qurilmalar', icon: Volume2 },
            { id: 'network', name: 'Tarmoq & Kodeklar', icon: Network },
            { id: 'profile', name: 'Dastur & Profil', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[10px] font-bold text-left cursor-pointer transition ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-500 font-extrabold' 
                    : 'text-slate-450 hover:bg-slate-50 dark:hover:bg-white/2'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side Form Content */}
        <div className="flex-1 overflow-y-auto pr-1 pl-1 scrollbar-thin">
          
          {/* Tab 1: SIP Server Sozlamalari */}
          {activeTab === 'sip' && (
            <div className="space-y-4 animate-scale-in">
              {/* Account manager list */}
              {!isAdding && !editingLine ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" /> SIP Hisoblar Ro'yxati ({sipLines.length})
                    </h4>
                    <button
                      onClick={() => setIsAdding(true)}
                      className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-[9px] font-bold px-2 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Yangi liniya
                    </button>
                  </div>

                  {sipLines.length === 0 ? (
                    <div className="text-center py-8 bg-[#131722]/10 border border-white/2 rounded-xl text-slate-400">
                      SIP liniyalar qo'shilmagan. Yuqoridagi tugma orqali yangi liniya qo'shing.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sipLines.map(line => {
                        const status = lineStatuses[line.id] || 'DISCONNECTED';
                        const isActive = activeLineId === line.id;
                        
                        return (
                          <div 
                            key={line.id}
                            className={`p-3 bg-[#131722]/30 border rounded-xl flex items-center justify-between transition ${
                              isActive ? 'border-indigo-500/40 bg-indigo-500/2' : 'border-white/2 hover:border-white/5'
                            }`}
                          >
                            {/* Line Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{line.label}</span>
                                {isActive && (
                                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[7px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                    Asosiy Outgoing
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] text-slate-450 block font-mono">
                                ext: {line.extension} &bull; {line.domain}:{line.port}
                              </span>
                            </div>

                            {/* Line Actions */}
                            <div className="flex items-center gap-2">
                              {/* Connection Status Badge */}
                              <span className="flex items-center gap-1.5 mr-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  status === 'CONNECTED' 
                                    ? 'bg-emerald-500 animate-pulse' 
                                    : status === 'CONNECTING' 
                                    ? 'bg-amber-500 animate-pulse' 
                                    : status === 'BUSY'
                                    ? 'bg-rose-500 animate-pulse'
                                    : 'bg-slate-500'
                                }`} />
                                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">
                                  {status === 'CONNECTED' ? 'Online' : status === 'CONNECTING' ? 'Ulanmoqda' : status === 'BUSY' ? 'Band' : 'Oflayn'}
                                </span>
                              </span>

                              {/* Toggle connection button */}
                              <button
                                onClick={() => handleToggleLineConnection(line.id)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  status === 'CONNECTED'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                                }`}
                                title={status === 'CONNECTED' ? 'Liniyani o\'chirish' : 'Liniyani yoqish'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Active switcher */}
                              {!isActive && status === 'CONNECTED' && (
                                <button
                                  onClick={() => handleSetActiveLine(line.id)}
                                  className="px-2 py-1 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[8px] font-bold transition cursor-pointer"
                                >
                                  Faol qilish
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                onClick={() => setEditingLine(line)}
                                className="p-1.5 rounded-lg hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white transition cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteLine(line.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 border border-white/5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* STUN Server Configuration always visible at bottom */}
                  <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl mt-4">
                    <label className="text-slate-455 text-[9px] block mb-1">STUN Server Address (Tarmoq bypass)</label>
                    <input 
                      type="text" 
                      value={voipConfig.stun} 
                      onChange={(e) => setVoipConfig({ ...voipConfig, stun: e.target.value })} 
                      placeholder="stun.l.google.com:19302"
                      className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              ) : (
                /* Add / Edit Form */
                <form onSubmit={handleSaveLineForm} className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold">
                      {isAdding ? "Yangi SIP liniya qo'shish" : `${editingLine.label} tahrirlash`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setEditingLine(null); }}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-slate-400 text-[9px] block">Liniya nomi (Label)</label>
                      <input 
                        type="text" 
                        value={isAdding ? newForm.label : editingLine.label} 
                        onChange={(e) => isAdding ? setNewForm({ ...newForm, label: e.target.value }) : setEditingLine({ ...editingLine, label: e.target.value })} 
                        placeholder="Masalan: Toshkent Liniyasi 1"
                        className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-slate-400 text-[9px] block">SIP Server / Domain</label>
                        <input 
                          type="text" 
                          value={isAdding ? newForm.domain : editingLine.domain} 
                          onChange={(e) => isAdding ? setNewForm({ ...newForm, domain: e.target.value }) : setEditingLine({ ...editingLine, domain: e.target.value })} 
                          className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 text-[9px] block">Port</label>
                        <input 
                          type="text" 
                          value={isAdding ? newForm.port : editingLine.port} 
                          onChange={(e) => isAdding ? setNewForm({ ...newForm, port: e.target.value }) : setEditingLine({ ...editingLine, port: e.target.value })} 
                          className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none font-mono focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-400 text-[9px] block">Extension (Liniya raqami)</label>
                        <input 
                          type="text" 
                          value={isAdding ? newForm.extension : editingLine.extension} 
                          onChange={(e) => isAdding ? setNewForm({ ...newForm, extension: e.target.value }) : setEditingLine({ ...editingLine, extension: e.target.value })} 
                          placeholder="101"
                          className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none font-mono focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 text-[9px] block">SIP Parol</label>
                        <input 
                          type="password" 
                          value={isAdding ? newForm.password : editingLine.password} 
                          onChange={(e) => isAdding ? setNewForm({ ...newForm, password: e.target.value }) : setEditingLine({ ...editingLine, password: e.target.value })} 
                          className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setEditingLine(null); }}
                      className="px-3 py-1.5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-[10px] font-bold transition cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Saqlash
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Ovoz & Qurilmalar */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-scale-in">
              <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl space-y-3.5">
                <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" /> Audio Qurilmalari
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-550 text-[9px] block">Mikrofon (Input Device)</label>
                    <select 
                      value={audioConfig.inputDevice}
                      onChange={(e) => setAudioConfig({ ...audioConfig, inputDevice: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0e121e] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="default_mic">Tizim bo'yicha (Default Microphone)</option>
                      <option value="realtek_mic">Realtek High Definition Mic</option>
                      <option value="usb_headset_mic">USB Headset Microphone (VoIP)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-555 text-[9px] block">Eshitish vositasi (Output Device)</label>
                    <select 
                      value={audioConfig.outputDevice}
                      onChange={(e) => setAudioConfig({ ...audioConfig, outputDevice: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0e121e] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="default_speaker">Tizim bo'yicha (Default Speakers)</option>
                      <option value="realtek_speaker">Realtek High Definition Audio Out</option>
                      <option value="usb_headset_speaker">USB Headset Earphone (VoIP)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-405 dark:text-gray-500 text-[9px] mb-0.5">
                      <span>Qo'ng'iroq ovozi balandligi</span>
                      <span className="font-mono text-slate-700 dark:text-slate-350">{audioConfig.ringVolume}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={audioConfig.ringVolume}
                      onChange={(e) => setAudioConfig({ ...audioConfig, ringVolume: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-250 dark:bg-white/5 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-405 dark:text-gray-500 text-[9px] mb-0.5">
                      <span>Mikrofon sezgirligi</span>
                      <span className="font-mono text-slate-700 dark:text-slate-350">{audioConfig.micSensitivity}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={audioConfig.micSensitivity}
                        onChange={(e) => setAudioConfig({ ...audioConfig, micSensitivity: parseInt(e.target.value) })}
                        className="flex-1 accent-indigo-500 cursor-pointer h-1 bg-slate-250 dark:bg-white/5 rounded-lg appearance-none"
                      />
                      <div className="w-10 h-1.5 bg-slate-250 dark:bg-white/5 rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-emerald-500 animate-pulse" style={{ width: `${audioConfig.micSensitivity}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-550 text-[9px] block">Qo'ng'iroq signali (Ringtone)</label>
                    <select 
                      value={audioConfig.ringtone}
                      onChange={(e) => setAudioConfig({ ...audioConfig, ringtone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0e121e] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="classic">Classic Telephone Ring</option>
                      <option value="digital">Modern Digital Chime</option>
                      <option value="bell">Soft Bell Notification</option>
                      <option value="minimal">Minimalist Beep</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Tarmoq & Kodeklar */}
          {activeTab === 'network' && (
            <div className="space-y-4 animate-scale-in">
              <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl space-y-3.5">
                <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5" /> VoIP Protokol & Kodeklar
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-550 text-[9px] block">SIP Transport Protocol</label>
                    <select 
                      value={voipConfig.transport}
                      onChange={(e) => setVoipConfig({ ...voipConfig, transport: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0e121e] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="UDP">UDP (Standard/Fast)</option>
                      <option value="TCP">TCP (Reliable Connection)</option>
                      <option value="TLS">TLS (Encrypted/Secure)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <span className="text-slate-400 dark:text-gray-555 text-[9px] block">Kodek ustuvorliklari (Codec Priorities)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['PCMA (G.711a)', 'PCMU (G.711u)', 'Opus (HD)', 'G.729 (Low-Band)'].map(codec => {
                        const codeKey = codec.split(' ')[0];
                        const isChecked = voipConfig.codecs.includes(codeKey);
                        return (
                          <div 
                            key={codec}
                            onClick={() => handleCodecToggle(codeKey)}
                            className="p-2 border border-slate-200 dark:border-white/5 rounded-lg bg-slate-50 dark:bg-white/2 flex items-center justify-between cursor-pointer hover:border-indigo-500/20 transition"
                          >
                            <span className="text-[10px] font-mono text-slate-750 dark:text-slate-350">{codec}</span>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                              isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-white/10'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-100/50 dark:bg-white/1 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between mt-1">
                    <div>
                      <span className="text-[10px] text-slate-800 dark:text-slate-200 block">SRTP Ovoz Shifrlash</span>
                      <span className="text-[8px] text-slate-405 block mt-0.5">Secure Real-time Transport Protocol</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoipConfig({ ...voipConfig, srtp: !voipConfig.srtp })}
                      className={`w-8 h-4 rounded-full p-0.5 transition cursor-pointer relative ${
                        voipConfig.srtp ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition shadow-sm ${
                        voipConfig.srtp ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Dastur & Profil */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-scale-in">
              {/* Operator details block */}
              <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl space-y-3">
                <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Operator Profili
                </h4>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-0.5">
                    <span className="block text-[8px] text-slate-400">Operator F.I.SH</span>
                    <span className="block text-slate-800 dark:text-white font-bold">{auth.full_name}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[8px] text-slate-400">Operator Tizimdagi Nomi</span>
                    <span className="block text-slate-800 dark:text-white font-bold">@{auth.username}</span>
                  </div>
                </div>
              </div>

              {/* Language settings mock */}
              <div className="p-3 bg-[#131722]/30 border border-white/2 rounded-xl space-y-3">
                <h4 className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Dastur Sozlamalari
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-550 text-[9px] block">Dastur Tili</label>
                    <select 
                      value={appConfig.language}
                      onChange={(e) => setAppConfig({ ...appConfig, language: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0e121e] border border-slate-200 dark:border-white/5 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="uz">O'zbekcha</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-1 bg-white/0">
                    <div>
                      <span className="text-[10px] text-slate-800 dark:text-slate-200 block">Avtomatik Javob berish</span>
                      <span className="text-[8px] text-slate-405 block mt-0.5">Kiruvchi qo'ng'iroqlarga avtomat ulanish</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppConfig({ ...appConfig, autoAnswer: !appConfig.autoAnswer })}
                      className={`w-8 h-4 rounded-full p-0.5 transition cursor-pointer relative ${
                        appConfig.autoAnswer ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition shadow-sm ${
                        appConfig.autoAnswer ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-1 bg-white/0">
                    <div>
                      <span className="text-[10px] text-slate-800 dark:text-slate-200 block">Klaviatura Tonal Tovushi</span>
                      <span className="text-[8px] text-slate-405 block mt-0.5">Keypad tugmalari bosilganda DTMF ohangi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppConfig({ ...appConfig, dtmfTones: !appConfig.dtmfTones })}
                      className={`w-8 h-4 rounded-full p-0.5 transition cursor-pointer relative ${
                        appConfig.dtmfTones ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition shadow-sm ${
                        appConfig.dtmfTones ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Settings Footer Action Controls */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-end items-center shrink-0">
        <button
          onClick={handleSaveAll}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" /> Sozlamalarni Saqlash
        </button>
      </div>

    </div>
  );
};

export default Settings;
