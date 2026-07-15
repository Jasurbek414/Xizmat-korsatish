import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import JsSIP from 'jssip';
import PhoneDialer from './telephony/PhoneDialer';
import SipSettings from './telephony/SipSettings';
import CallHistory from './telephony/CallHistory';
import DriverDownload from './telephony/DriverDownload';

// Disable verbose JsSIP debug logs in browser console
JsSIP.debug.disable('JsSIP:*');

const Telephony = () => {
  // Dialer States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState('DISCONNECTED'); // DISCONNECTED, CONNECTING, ACTIVE, INCOMING
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingNumber, setIncomingNumber] = useState('');

  // Call Logs
  const [callLogs, setCallLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Connection & Bridge Settings
  const [bridgeStatus, setBridgeStatus] = useState('DISCONNECTED'); // CONNECTED, DISCONNECTED, ERROR
  const [sipSettings, setSipSettings] = useState(() => {
    const saved = localStorage.getItem('sip_settings');
    // Xavfsizlik: haqiqiy PBX ma'lumotlari kodga yozilmaydi. Har bir operator o'z SIP
    // ma'lumotlarini "SIP sozlamalari" formasi orqali bir marta kiritadi, keyin brauzerda
    // (localStorage) saqlanadi.
    const emptyDefaults = {
      server_ip: '',
      username: '',
      password: '',
      auth_username: '',
      local_port: '5060',
      ws_port: '8089',
      ws_server: '',
      engine: 'JSSIP'
    };
    if (!saved) {
      return emptyDefaults;
    }
    return { ...emptyDefaults, ...JSON.parse(saved) };
  });

  // SIP User Agent & Current Active Session refs
  const [uaInstance, setUaInstance] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  
  const timerRef = useRef(null);
  const callStartTimeRef = useRef(null);

  // Load call history logs
  const loadCallLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getCalls();
      const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setCallLogs(sorted);
    } catch (err) {
      console.error("Failed to load call logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadCallLogs();
    initializeSipClient();

    return () => {
      stopSipClient();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sipSettings.server_ip, sipSettings.username, sipSettings.password, sipSettings.ws_server]);

  // Timer for active calls
  useEffect(() => {
    if (callStatus === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setDuration(0);
    }
  }, [callStatus]);

  // Clean up and stop existing SIP client
  const stopSipClient = () => {
    if (uaInstance) {
      uaInstance.stop();
      setUaInstance(null);
    }
    setBridgeStatus('DISCONNECTED');
  };

  // Initialize JsSIP User Agent
  const initializeSipClient = () => {
    if (!sipSettings.username || !sipSettings.server_ip || !sipSettings.password) {
      setBridgeStatus('DISCONNECTED');
      return;
    }

    stopSipClient();
    setBridgeStatus('DISCONNECTED');

    try {
      let socketUrl = sipSettings.ws_server;
      // Handle fallback and automatically target port 8082 and path /sip for onlinepbx subdomains
      if (!socketUrl || socketUrl === 'wss://sip.onlinepbx.ru' || socketUrl === 'wss://pbx36128.onpbx.ru:8082' || socketUrl === 'wss://pbx36128.onpbx.ru') {
        if (sipSettings.server_ip.includes('onpbx.ru') || sipSettings.server_ip.includes('onlinepbx.ru')) {
          socketUrl = `wss://${sipSettings.server_ip}:8082/sip`;
        } else {
          socketUrl = `ws://127.0.0.1:${sipSettings.ws_port || '8089'}`;
        }
      }
      const socket = new JsSIP.WebSocketInterface(socketUrl);
      
      const configuration = {
        sockets: [ socket ],
        uri: `sip:${sipSettings.username}@${sipSettings.server_ip}`,
        password: sipSettings.password,
        authorization_user: sipSettings.auth_username || sipSettings.username,
        display_name: 'Operator'
      };

      const ua = new JsSIP.UA(configuration);
      
      // UA Session Event Handlers
      ua.on('connected', () => {
        setBridgeStatus('CONNECTING');
      });

      ua.on('disconnected', () => {
        setBridgeStatus('DISCONNECTED');
      });

      ua.on('registrationFailed', (e) => {
        console.error('SIP Registration failed:', e.cause);
        setBridgeStatus('ERROR');
      });

      ua.on('registered', () => {
        setBridgeStatus('REGISTERED');
      });

      // Handle Incoming Call Session
      ua.on('newRTCSession', (data) => {
        const session = data.session;
        
        if (session.direction === 'incoming') {
          setCallStatus('INCOMING');
          setIncomingNumber(session.remote_identity.uri.user || "Noma'lum");
          setActiveSession(session);
          
          setupSessionEventHandlers(session);
        }
      });

      ua.start();
      setUaInstance(ua);

    } catch (e) {
      console.error("Failed to initialize JsSIP UA:", e);
      setBridgeStatus('ERROR');
    }
  };

  // Set up event listeners for a call session (incoming or outgoing)
  const setupSessionEventHandlers = (session) => {
    session.on('peerconnection', (e) => {
      e.peerconnection.addEventListener('track', (event) => {
        const stream = event.streams[0];
        const audioEl = document.getElementById('telephony-audio');
        if (audioEl) {
          audioEl.srcObject = stream;
          audioEl.play().catch(err => console.error("Audio playback error:", err));
        }
      });
    });

    session.on('connecting', () => {
      setCallStatus('CONNECTING');
    });

    session.on('progress', () => {
      setCallStatus('CONNECTING');
    });

    session.on('accepted', () => {
      setCallStatus('ACTIVE');
      callStartTimeRef.current = new Date();
    });

    session.on('failed', (e) => {
      console.log('Call failed:', e.cause);
      if (e.cause === 'User Denied Media Access' || String(e.cause).includes('Media') || String(e.cause).includes('Denied')) {
        alert("Mikrofon xatoligi:\nBrauzer mikrofondan foydalana olmadi. Iltimos, quyidagilarni tekshiring:\n1. Kompyuteringizga mikrofonli garnitura (naushnik) ulanganligini;\n2. Brauzerda manzil satridagi qulf belgisi orqali mikrofonga ruxsat berilganligini (Allow).");
      } else {
        alert(`Qo'ng'iroq amalga oshmadi. Sabab: ${e.cause || 'Noma\'lum xatolik'}`);
      }
      setCallStatus('DISCONNECTED');
      setActiveSession(null);
      setIncomingNumber('');
    });

    session.on('ended', () => {
      console.log('Call ended');
      handleHangupClean();
    });
  };

  const handleHangupClean = async () => {
    const prevStatus = callStatus;
    setCallStatus('DISCONNECTED');
    
    if (prevStatus === 'ACTIVE') {
      await saveCallRecord(
        phoneNumber || incomingNumber || "Noma'lum",
        incomingNumber ? 'INBOUND' : 'OUTBOUND',
        duration
      );
    }
    setActiveSession(null);
    setIncomingNumber('');
  };

  const saveCallRecord = async (phone, direction, seconds) => {
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user')) || {};
      await api.createCall({
        dispatcher_id: authUser.id,
        client_phone: phone,
        direction: direction,
        duration: seconds,
        recording_url: ""
      });
      loadCallLogs();
    } catch (err) {
      console.error("Failed to save call record:", err);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sip_settings', JSON.stringify(sipSettings));
    alert("Sip sozlamalari saqlandi! SIP tarmoqqa qayta ulanmoqda...");
    initializeSipClient();
  };

  const handleKeypadPress = (val) => {
    setPhoneNumber(prev => prev + val);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Dial out via JsSIP (Real SIP call)
  const handleDial = () => {
    if (!phoneNumber) return;

    if (uaInstance && bridgeStatus === 'REGISTERED') {
      const options = {
        mediaConstraints: { audio: true, video: false }
      };
      
      const session = uaInstance.call(`sip:${phoneNumber}@${sipSettings.server_ip}`, options);
      setActiveSession(session);
      setupSessionEventHandlers(session);
    } else {
      alert("SIP tarmoqqa ulanmagan! Iltimos, drayver va sozlamalarni tekshiring.");
      setCallStatus('DISCONNECTED');
    }
  };

  // Accept incoming call via JsSIP
  const handleAccept = () => {
    if (activeSession) {
      const options = {
        mediaConstraints: { audio: true, video: false }
      };
      activeSession.answer(options);
      setCallStatus('ACTIVE');
      callStartTimeRef.current = new Date();
    }
  };

  // Terminate session
  const handleHangup = async () => {
    if (activeSession) {
      activeSession.terminate();
    }
    await handleHangupClean();
  };

  // Toggle microphone muting
  const toggleMute = () => {
    if (activeSession) {
      if (isMuted) {
        activeSession.unmute();
      } else {
        activeSession.mute();
      }
    }
    setIsMuted(!isMuted);
  };

  // Test simulation helper
  const handleSimulateIncoming = () => {
    setCallStatus('INCOMING');
    setIncomingNumber('+998901234567');
  };

  // Filter logs
  const filteredLogs = callLogs.filter(log => 
    log.client_phone.includes(searchQuery) ||
    log.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* HTML5 audio node for rendering incoming stream */}
      <audio id="telephony-audio" autoPlay style={{ display: 'none' }} />

      {/* Title & Driver Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Telefoniya & Aloqa</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Uztelecom SIP orqali mijozlar bilan to'g'ridan-to'g'ri brauzerda gaplashish bo'limi.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Test call simulation button */}
          <button 
            type="button"
            onClick={handleSimulateIncoming}
            className="bg-indigo-650/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-500/10"
          >
            Sinov Qo'ng'irog'i
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">SIP Aloqa:</span>
            {bridgeStatus === 'REGISTERED' ? (
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Ulandi (Faol)
              </span>
            ) : bridgeStatus === 'CONNECTING' ? (
              <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Ulanmoqda...
              </span>
            ) : bridgeStatus === 'ERROR' ? (
              <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Xatolik / Ro'yxatdan o'tmadi
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> O'chirilgan
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: PhoneDialer */}
        <div className="lg:col-span-4">
          <PhoneDialer
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            callStatus={callStatus}
            duration={duration}
            isMuted={isMuted}
            incomingNumber={incomingNumber}
            handleKeypadPress={handleKeypadPress}
            handleBackspace={handleBackspace}
            handleDial={handleDial}
            handleAccept={handleAccept}
            handleHangup={handleHangup}
            toggleMute={toggleMute}
          />
        </div>

        {/* Right Column: Settings & Call History */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SipSettings
              sipSettings={sipSettings}
              setSipSettings={setSipSettings}
              handleSaveSettings={handleSaveSettings}
            />
            <DriverDownload wsPort={sipSettings.ws_port} />
          </div>

          <CallHistory
            filteredLogs={filteredLogs}
            loadingLogs={loadingLogs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setPhoneNumber={setPhoneNumber}
            setCallStatus={setCallStatus}
          />
        </div>

      </div>

    </div>
  );
};

export default Telephony;
