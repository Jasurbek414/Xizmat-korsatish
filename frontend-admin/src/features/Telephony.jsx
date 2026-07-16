import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import JsSIP from 'jssip';
import PhoneDialer from './telephony/PhoneDialer';
import SipSettings from './telephony/SipSettings';
import CallHistory from './telephony/CallHistory';

// Disable verbose JsSIP debug logs in browser console
JsSIP.debug.disable('JsSIP:*');

// MUHIM (audit: 16-band) - avval "auth" prop'i App.jsx'dan uzatilsa ham
// bu yerda umuman qabul qilinmasdi, shuning uchun SIP trunk (UzTelecom)
// sozlamalari formasi rolidan qat'iy nazar HAMMA operatorga (DISPATCHER
// ham) ko'rinardi - garchi ularga bu amal backendda 403 bilan rad etilsa ham.
const TRUNK_MANAGER_ROLES = ['SUPERADMIN', 'ADMIN', 'MANAGER'];

const Telephony = ({ auth }) => {
  const canManageTrunk = TRUNK_MANAGER_ROLES.includes(auth?.role);

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

  // Operatorning FreeSWITCH "internal" profilidagi shaxsiy ichki SIP
  // extension'i - brauzer aynan SHU bilan ro'yxatdan o'tadi (UzTelecom
  // trunk hisobi - sipSettings - bilan aloqasi yo'q, faqat trunk ID
  // chiquvchi qo'ng'iroq uchun kerak).
  const [myExtension, setMyExtension] = useState(null);

  // SIP User Agent & Current Active Session refs
  const [uaInstance, setUaInstance] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  
  const timerRef = useRef(null);
  const callStartTimeRef = useRef(null);
  // Java backend'ning haqiqiy nazorat kanali (/ws/telephony) - dial/hangup/answer
  // shu orqali so'raladi, hodisalar (INVITE/ANSWER/BYE) shu orqali kelib turadi.
  const telephonyWsRef = useRef(null);
  // Hozir OPERATOR o'zi terayotgan raqam - backend'dan qaytgan INVITE hodisasini
  // "bu mening chaqiruvim" deb aniqlash uchun (React state emas, ref - chunki
  // WebSocket onmessage callback'i faqat bir marta o'rnatiladi va state'ning
  // eskirgan (stale) qiymatini emas, doim joriy qiymatni ko'rishi kerak).
  const dialingNumberRef = useRef('');
  // Java'dagi ActiveSession.callUuid - ANSWER/HANGUP so'rovlarida qaysi
  // sessiyaga tegishli ekanini bildirish uchun.
  const currentCallUuidRef = useRef(null);

  // Load call history logs - endi backend ESL hodisalari orqali o'zi avtoritativ
  // yozadigan CallSession jadvalidan o'qiladi (avval frontend qo'lda POST
  // /api/v1/calls chaqirib o'zi yozar edi).
  const loadCallLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getCallSessions();
      const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setCallLogs(sorted);
    } catch (err) {
      console.error("Failed to load call logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadSipSettings = async () => {
    try {
      // Ro'yxat (parolsiz) - istalgan operator (DISPATCHER ham) o'qiy oladi,
      // chiquvchi qo'ng'iroq uchun trunk ID kerak.
      const data = await api.getSipAccounts();
      if (!data || data.length === 0) return;
      const first = data[0];
      setSipSettings(prev => ({
        ...prev,
        id: first.id,
        server_ip: first.sipServer,
        username: first.username,
        auth_username: first.authUsername || '',
        local_port: first.sipPort || '5060',
      }));

      // Haqiqiy parol - faqat ADMIN/MANAGER/SUPERADMIN uchun (SipSettings
      // formasida ko'rsatish uchun) - DISPATCHER uchun bu 403 bilan
      // tugaydi, buni jim e'tiborsiz qoldiramiz (dial uchun kerak emas).
      try {
        const credentials = await api.getSipAccountCredentials(first.id);
        setSipSettings(prev => ({ ...prev, password: credentials.password }));
      } catch (credErr) {
        // Ruxsat yo'q - kutilgan holat, formani bo'sh parol bilan qoldiramiz.
      }
    } catch (err) {
      console.error("Failed to load SIP accounts from backend:", err);
    }
  };

  const loadMyExtension = async () => {
    try {
      const data = await api.getMyExtension();
      setMyExtension({ extension: data.extension, password: data.password });
    } catch (err) {
      console.error("Failed to load my telephony extension:", err);
    }
  };

  const sendTelephonyAction = (action) => {
    const ws = telephonyWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    }
  };

  const connectTelephonyControlChannel = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/telephony?token=${encodeURIComponent(token)}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INVITE' && data.payload && data.payload.callee === dialingNumberRef.current) {
          currentCallUuidRef.current = data.payload.callUuid;
        } else if (data.type === 'BYE') {
          // Agar tugagan sessiya AYNAN bizning joriy chaqiruvimiz bo'lsa
          // (masalan backend javobsiz sessiyani TIMEOUT bilan tozalagan
          // bo'lsa, JsSIP tomonida hech qanday 'ended' hodisasi kelmaydi) -
          // UI'ni ham qayta tiklaymiz. Oddiy tugagan qo'ng'iroqda bu
          // takroriy (JsSIP 'ended' allaqachon tozalagan) va zararsiz.
          if (data.payload && data.payload.callUuid && data.payload.callUuid === currentCallUuidRef.current) {
            setCallStatus('DISCONNECTED');
            dialingNumberRef.current = '';
            currentCallUuidRef.current = null;
          }
          loadCallLogs();
        } else if (data.type === 'FAILED' && dialingNumberRef.current) {
          // Backend so'rovimizni rad etdi (noto'g'ri raqam, extension
          // biriktirilmagan va h.k.) - UI'ni abadiy "CONNECTING"da qoldirmasdan
          // qayta tiklaymiz va sababini ko'rsatamiz.
          alert("Qo'ng'iroq amalga oshmadi: " + (data.payload && data.payload.message ? data.payload.message : "noma'lum xatolik"));
          setCallStatus('DISCONNECTED');
          dialingNumberRef.current = '';
          currentCallUuidRef.current = null;
        }
      } catch (e) {
        console.error('Telephony control channel message parse error:', e);
      }
    };
    ws.onerror = (e) => console.error('Telephony control channel error:', e);

    telephonyWsRef.current = ws;
  }, []);

  useEffect(() => {
    loadSipSettings();
    loadMyExtension();
  }, []);

  useEffect(() => {
    loadCallLogs();
    connectTelephonyControlChannel();

    return () => {
      if (telephonyWsRef.current) telephonyWsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Operatorning shaxsiy ichki extensioni yuklanganidan keyingina JsSIP'ni
  // ishga tushiramiz (avval bu UzTelecom trunk hisobi - sipSettings - bilan
  // ishga tushar edi, FreeSWITCH "internal" profilida bunday hisob umuman
  // yo'q edi, shuning uchun ro'yxatdan o'tish har doim "Request Timeout"
  // bilan tugar edi).
  useEffect(() => {
    if (!myExtension || !myExtension.extension || !myExtension.password) {
      return;
    }
    initializeSipClient();
    return () => stopSipClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExtension]);

  // Ulanish holatini real vaqtda tekshiruvchi funksiya: JsSIP hodisalariga
  // (registered/disconnected) qo'shimcha ravishda, UA'ning HAQIQIY holatini
  // (uaInstance.isRegistered()) muntazam so'rab, "Ulandi (Faol)" ko'rsatkichi
  // hech qachon eskirib qolmasligini ta'minlaydi - masalan tarmoq uzilishi
  // JsSIP hodisasini sekin/o'tkazib yuborgan holatlarda ham.
  useEffect(() => {
    if (!uaInstance) return;

    const intervalId = setInterval(() => {
      const actuallyRegistered = uaInstance.isRegistered();
      setBridgeStatus(prev => {
        if (actuallyRegistered) return 'REGISTERED';
        // Xatolik holatini ("ERROR") tekshiruv bosib yubormasin - faqat
        // "REGISTERED" deb noto'g'ri qolib ketgan holatni tuzatamiz.
        return prev === 'REGISTERED' ? 'DISCONNECTED' : prev;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [uaInstance]);

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
    stopSipClient();
    setBridgeStatus('DISCONNECTED');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/ws/sip`;
      const socket = new JsSIP.WebSocketInterface(socketUrl);
      
      const domain = window.location.hostname;
      // Trunk (UzTelecom) hisobi EMAS - operatorning FreeSWITCH "internal"
      // profilidagi shaxsiy ichki extension'i (GET /api/v1/telephony/my-extension).
      const configuration = {
        sockets: [ socket ],
        uri: `sip:${myExtension.extension}@${domain}`,
        password: myExtension.password,
        authorization_user: myExtension.extension,
        display_name: 'Operator',
        // MUHIM: Cloudflare/nginx bo'sh turgan WebSocket ulanishini ~100s dan
        // keyin uzib qo'yadi. Standart 600s o'rniga qisqaroq muddat bilan
        // ro'yxatdan o'tsak, JsSIP buni bu muddat tugashidan oldin avtomatik
        // yangilaydi - shu doimiy trafik ulanishni "band" ushlab, uzilib
        // qolishining oldini oladi (jonli sinovda ulanish ~1-2 daqiqada bir
        // uzilib-qayta ulanayotgani aniqlangan edi).
        register_expires: 60
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

      ua.on('unregistered', () => {
        setBridgeStatus('DISCONNECTED');
      });

      // Handle Incoming Call Session
      ua.on('newRTCSession', (data) => {
        const session = data.session;
        if (session.direction !== 'incoming') return;

        setActiveSession(session);
        setupSessionEventHandlers(session);

        if (dialingNumberRef.current) {
          // Bu operatorning o'zi /ws/telephony orqali boshlagan chaqiruvining
          // "bridge" oyog'i - backend FreeSWITCH orqali avval operatorning
          // ro'yxatdan o'tgan qurilmasini chaqiradi, keyin tashqi raqamga ulaydi.
          // Qo'lda "javob berish" talab qilmasdan avtomatik qabul qilinadi.
          session.answer({ mediaConstraints: { audio: true, video: false } });
        } else {
          setCallStatus('INCOMING');
          setIncomingNumber(session.remote_identity.uri.user || "Noma'lum");
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
      dialingNumberRef.current = '';
      currentCallUuidRef.current = null;
    });

    session.on('ended', () => {
      console.log('Call ended');
      handleHangupClean();
    });
  };

  // Qo'ng'iroq tarixini backend endi ESL hodisalari orqali o'zi avtoritativ
  // yozadi (TelephonyService.endCall) - frontend qo'lda yozmaydi, faqat
  // /ws/telephony'dan kelgan "BYE" hodisasida ro'yxatni yangilaydi
  // (connectTelephonyControlChannel'dagi onmessage'ga qarang).
  const handleHangupClean = async () => {
    setCallStatus('DISCONNECTED');
    setActiveSession(null);
    setIncomingNumber('');
    dialingNumberRef.current = '';
    currentCallUuidRef.current = null;
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: 'UzTelecom Gateway',
        sip_server: sipSettings.server_ip,
        sip_port: parseInt(sipSettings.local_port) || 5060,
        username: sipSettings.username,
        password: sipSettings.password,
        auth_username: sipSettings.auth_username || null,
        keepalive_interval: 60
      };
      // MUHIM (audit: "dublikat trunk yaratilishi" xatosi) - agar trunk
      // allaqachon mavjud bo'lsa (sipSettings.id), uni YANGILAYMIZ, har safar
      // yangi qator yaratib, eskisini FreeSWITCH'da ro'yxatdan o'tgan holda
      // yetim qoldirmaymiz.
      if (sipSettings.id) {
        await api.updateSipAccount(sipSettings.id, payload);
      } else {
        const created = await api.createSipAccount(payload);
        setSipSettings(prev => ({ ...prev, id: created.id }));
      }
      localStorage.setItem('sip_settings', JSON.stringify(sipSettings));
      alert("Sip sozlamalari saqlandi! SIP tarmoqqa qayta ulanmoqda...");
      initializeSipClient();
    } catch (err) {
      alert("Sozlamalarni saqlashda xatolik: " + err.message);
    }
  };

  // MUHIM (audit: 17-band) - trunk'ni o'chirish uchun endpoint va
  // api.deleteSipAccount() allaqachon mavjud edi, lekin interfeysda tugma
  // yo'q edi - foydalanuvchi noto'g'ri/eskirgan trunk'ni o'zi tozalay olmasdi.
  const handleDeleteSettings = async () => {
    if (!sipSettings.id) return;
    if (!window.confirm("SIP trunk (UzTelecom) hisobini o'chirishni tasdiqlaysizmi? Chiquvchi qo'ng'iroqlar to'xtaydi.")) {
      return;
    }
    try {
      await api.deleteSipAccount(sipSettings.id);
      setSipSettings(prev => ({ ...prev, id: null }));
      localStorage.removeItem('sip_settings');
      alert("SIP trunk o'chirildi.");
    } catch (err) {
      alert("Trunk'ni o'chirishda xatolik: " + err.message);
    }
  };

  const handleKeypadPress = (val) => {
    setPhoneNumber(prev => prev + val);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Chaqiruvni endi to'g'ridan-to'g'ri JsSIP orqali emas, Java backend'ning
  // /ws/telephony nazorat kanali orqali so'raymiz - FreeSWITCH backend
  // buyrug'i bilan operatorning ro'yxatdan o'tgan qurilmasini chaqirib,
  // keyin tashqi raqamga ulaydi (bridge). Bridge oyog'i pastda
  // ua.on('newRTCSession') orqali avtomatik qabul qilinadi.
  const handleDial = () => {
    // Backend faqat raqam/+/*/# belgilarini qabul qiladi (buyruq in'ektsiyasi
    // himoyasi) - foydalanuvchi probel/tire bilan kiritgan/qo'ygan raqamni
    // shu yerda tozalaymiz, aks holda server jimgina rad etardi.
    const cleaned = phoneNumber.replace(/[^0-9+*#]/g, '');
    if (!cleaned) return;

    if (uaInstance && bridgeStatus === 'REGISTERED' && sipSettings.id && myExtension) {
      dialingNumberRef.current = cleaned;
      // "caller" (extension) endi yuborilmaydi - backend uni JWT'dagi
      // foydalanuvchining o'z Device yozuvidan o'zi aniqlaydi (xavfsizlik).
      sendTelephonyAction({
        action: 'DIAL',
        sipAccountId: sipSettings.id,
        callee: cleaned
      });
      setCallStatus('CONNECTING');
    } else {
      alert("SIP tarmoqqa ulanmagan! Iltimos, SIP sozlamalarini tekshiring.");
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
      if (currentCallUuidRef.current) {
        sendTelephonyAction({ action: 'ANSWER', callUuid: currentCallUuidRef.current });
      }
    }
  };

  // Terminate session
  const handleHangup = async () => {
    if (activeSession) {
      activeSession.terminate();
    }
    if (currentCallUuidRef.current) {
      sendTelephonyAction({ action: 'HANGUP', callUuid: currentCallUuidRef.current });
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
          {/* MUHIM (audit: 16-band) - trunk (UzTelecom) sozlamalari faqat
              SUPERADMIN/ADMIN/MANAGER'ga ko'rinadi - DISPATCHER uchun bu
              forma foydasiz edi (parol maydoni 403 bilan bo'sh qolardi,
              saqlashga urinish ham 403 berardi). */}
          {canManageTrunk && (
            <div>
              <SipSettings
                sipSettings={sipSettings}
                setSipSettings={setSipSettings}
                handleSaveSettings={handleSaveSettings}
                handleDeleteSettings={handleDeleteSettings}
              />
            </div>
          )}

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
