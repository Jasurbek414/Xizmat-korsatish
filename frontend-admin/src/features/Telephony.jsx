import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import PhoneDialer from './telephony/PhoneDialer';
import SipSettings from './telephony/SipSettings';
import CallHistory from './telephony/CallHistory';
import TelephonyStatusBar from './telephony/TelephonyStatusBar';
import IncomingCallModal from './telephony/IncomingCallModal';
import useSipPhone from './telephony/hooks/useSipPhone';
import useTelephonyControl from './telephony/hooks/useTelephonyControl';
import CallToneEngine from './telephony/audio/callTones';

// Trunk (UzTelecom) sozlamalari formasi faqat shu rollarga ko'rinadi -
// DISPATCHER uchun bu amal backendda 403 bilan rad etiladi, shuning uchun UI'da
// ham yashiriladi (audit: 16-band).
const TRUNK_MANAGER_ROLES = ['SUPERADMIN', 'ADMIN', 'MANAGER'];

// Chaqiruv media-muammosi (mikrofon) sababmi - shunga qarab foydalanuvchiga
// to'g'ri yo'riqnoma ko'rsatamiz.
const isMediaCause = (cause) =>
  cause === 'User Denied Media Access'
  || String(cause).includes('Media')
  || String(cause).includes('Denied');

const Telephony = ({ auth }) => {
  const canManageTrunk = TRUNK_MANAGER_ROLES.includes(auth?.role);

  // --- Dialer/UI holati ---
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState('DISCONNECTED'); // DISCONNECTED | CONNECTING | ACTIVE | INCOMING
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingNumber, setIncomingNumber] = useState('');

  // --- Qo'ng'iroq tarixi ---
  const [callLogs, setCallLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // --- Trunk (tashqi UzTelecom aloqasi) holati ---
  // HAQIQIY trunk ro'yxatdan o'tish holati - backend FreeSWITCH'ning O'ZIDAN
  // so'raydi va TRUNK_STATUS hodisasi orqali real vaqtda yangilanadi. Brauzerning
  // ichki extension holati (bridgeStatus) dan FARQLI.
  const [trunkStatus, setTrunkStatus] = useState('UNKNOWN');
  const [sipSettings, setSipSettings] = useState(() => {
    const saved = localStorage.getItem('sip_settings');
    const emptyDefaults = {
      server_ip: '', username: '', password: '', auth_username: '',
      local_port: '5060', ws_port: '8089', ws_server: '', engine: 'JSSIP',
    };
    return saved ? { ...emptyDefaults, ...JSON.parse(saved) } : emptyDefaults;
  });

  // Operatorning FreeSWITCH "internal" profilidagi shaxsiy ichki extension'i -
  // brauzer AYNAN shu bilan ro'yxatdan o'tadi (trunk hisobi bilan aloqasi yo'q).
  const [myExtension, setMyExtension] = useState(null);

  // --- Reflar (JsSIP/WS callbacklari stale closure ko'rmasligi uchun) ---
  const timerRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const dialingNumberRef = useRef('');      // operator hozir tergan raqam
  const currentCallUuidRef = useRef(null);  // backend ActiveSession.callUuid
  const callStatusRef = useRef('DISCONNECTED');
  const toneRef = useRef(null);             // professional ohang mexanizmi
  if (!toneRef.current) toneRef.current = new CallToneEngine();

  // --- Ma'lumot yuklovchilar ---
  const loadCallLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getCallSessions();
      const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setCallLogs(sorted);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadSipSettings = async () => {
    try {
      const data = await api.getSipAccounts();
      if (!data || data.length === 0) return;
      const first = data[0];
      setSipSettings((prev) => ({
        ...prev,
        id: first.id,
        server_ip: first.sipServer,
        username: first.username,
        auth_username: first.authUsername || '',
        local_port: first.sipPort || '5060',
      }));
      if (first.registrationStatus) setTrunkStatus(first.registrationStatus);
      // Haqiqiy parol faqat ADMIN/MANAGER/SUPERADMIN uchun (SipSettings formasi) -
      // DISPATCHER uchun 403, jim e'tiborsiz qoldiramiz (dial uchun kerak emas).
      try {
        const credentials = await api.getSipAccountCredentials(first.id);
        setSipSettings((prev) => ({ ...prev, password: credentials.password }));
      } catch (credErr) { /* ruxsat yo'q - kutilgan */ }
    } catch (err) {
      console.error('Failed to load SIP accounts from backend:', err);
    }
  };

  const loadMyExtension = async () => {
    try {
      const data = await api.getMyExtension();
      console.log('[SIP] my-extension yuklandi: extension=', data.extension, '| parol mavjud=', !!data.password);
      setMyExtension({ extension: data.extension, password: data.password });
    } catch (err) {
      console.error('[SIP] my-extension YUKLANMADI (JsSIP ishga tushmaydi):', err);
    }
  };

  // callStatus'ning joriy qiymatini reflarga sinxronlaymiz (callbacklar uchun).
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  // UI holatini boshlang'ich holatga qaytaruvchi yordamchi (chaqiruv tugadi/xato).
  const resetCallUi = () => {
    setCallStatus('DISCONNECTED');
    setIncomingNumber('');
    setIsMuted(false);
    dialingNumberRef.current = '';
    currentCallUuidRef.current = null;
  };

  // --- SIP telefon (brauzer ichki extension) ---
  const sip = useSipPhone({
    myExtension,
    dialingNumberRef,
    callStatusRef,
    // MUHIM: sessiyaning 'progress'/'connecting' hodisasi KIRUVCHI qo'ng'iroq
    // (INCOMING) yoki faol (ACTIVE) holatini BUZMASLIGI kerak - aks holda
    // kiruvchi qo'ng'iroqda "Javob berish" (yashil) tugmasi o'rniga faqat qizil
    // (CONNECTING) chiqib qolardi. Faqat bo'sh/chiquvchi holatda CONNECTING.
    onProgress: () => setCallStatus((prev) => (prev === 'INCOMING' || prev === 'ACTIVE' ? prev : 'CONNECTING')),
    onActive: () => {
      setCallStatus('ACTIVE');
      callStartTimeRef.current = new Date();
      toneRef.current.stop();
    },
    onFailed: (cause) => {
      console.log('Call failed:', cause);
      toneRef.current.stop();
      if (isMediaCause(cause)) {
        toneRef.current.error();
        alert('Mikrofon xatoligi:\nBrauzer mikrofondan foydalana olmadi. Iltimos, tekshiring:\n'
          + '1. Kompyuterga mikrofonli garnitura (naushnik) ulanganligini;\n'
          + '2. Brauzerda manzil satridagi qulf belgisi orqali mikrofonga ruxsat berilganligini (Allow).');
      } else {
        toneRef.current.busy();
        alert(`Qo'ng'iroq amalga oshmadi. Sabab: ${cause || "Noma'lum xatolik"}`);
      }
      setTimeout(() => toneRef.current.stop(), 3000);
      resetCallUi();
    },
    onEnded: () => {
      console.log('Call ended');
      toneRef.current.stop();
      toneRef.current.ended();
      resetCallUi();
    },
    onIncoming: (number) => {
      setCallStatus('INCOMING');
      setIncomingNumber(number);
    },
    onOutboundMediaError: () => {
      toneRef.current.stop();
      resetCallUi();
    },
  });

  // --- Java nazorat kanali (/ws/telephony) ---
  const control = useTelephonyControl({
    dialingNumberRef,
    currentCallUuidRef,
    onByeForCurrentCall: () => {
      toneRef.current.stop();
      resetCallUi();
    },
    onReloadLogs: loadCallLogs,
    onFailed: (message) => {
      toneRef.current.stop();
      toneRef.current.error();
      setTimeout(() => toneRef.current.stop(), 2500);
      alert("Qo'ng'iroq amalga oshmadi: " + message);
      resetCallUi();
    },
    onTrunkStatus: (status) => setTrunkStatus(status),
  });

  // --- Boshlang'ich yuklash ---
  useEffect(() => {
    console.log('[Telephony] versiya: KIRUVCHI-FIX-v2 (yashil tugma tuzatildi)');
    loadSipSettings();
    loadMyExtension();
    loadCallLogs();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (toneRef.current) toneRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trunk holatini davriy zaxira sifatida qayta o'qiymiz (TRUNK_STATUS hodisasi
  // kelmagan holatlar uchun - masalan sahifa yangi ochilganda).
  useEffect(() => {
    const intervalId = setInterval(() => loadSipSettings(), 30000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Faol chaqiruv taymeri.
  useEffect(() => {
    if (callStatus === 'ACTIVE') {
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
  }, [callStatus]);

  // Professional ohanglar: CONNECTING -> ringback, INCOMING -> kiruvchi ohang,
  // ACTIVE -> jimlik (haqiqiy media). Terminal ohanglar (busy/error/ended)
  // to'g'ridan-to'g'ri hodisa callbacklarida chalinadi.
  useEffect(() => {
    const tone = toneRef.current;
    if (!tone) return;
    if (callStatus === 'CONNECTING') tone.ringback();
    else if (callStatus === 'INCOMING') tone.incoming();
    else if (callStatus === 'ACTIVE') tone.stop();
  }, [callStatus]);

  // --- Amallar ---
  const handleKeypadPress = (val) => setPhoneNumber((prev) => prev + val);
  const handleBackspace = () => setPhoneNumber((prev) => prev.slice(0, -1));

  // Chaqiruvni Java nazorat kanali (/ws/telephony) orqali so'raymiz - backend
  // trunk-first tartibda tashqi raqamni chaqirib, JAVOB berilganda operatorning
  // brauzeriga bridge qiladi (bridge oyog'i useSipPhone'da avtomatik qabul
  // qilinadi). "caller" (extension) yuborilmaydi - backend uni JWT'dagi
  // foydalanuvchining o'z Device yozuvidan aniqlaydi (xavfsizlik/IDOR himoyasi).
  const doDialNow = (cleaned) => {
    dialingNumberRef.current = cleaned;
    // CHIQUVCHI qo'ng'iroq boshlandi - shu vaqtdan ~65s ichida kelgan brauzer
    // INVITE'i "chiquvchi bridge" deb avtomatik qabul qilinadi (kiruvchi
    // qo'ng'iroq bilan chalkashmaydi).
    sip.markOutboundDial();
    const sent = control.send({ action: 'DIAL', sipAccountId: sipSettings.id, callee: cleaned });
    if (!sent) {
      // Control kanali uzilgan - buyruq backendga yetmadi. Qayta ulaymiz.
      toneRef.current.stop();
      sip.clearOutboundDial();
      alert("Aloqa kanali uzilgan edi. Qayta ulanmoqda - iltimos, 3-5 soniyadan keyin qaytadan \"Qo'ng'iroq\" tugmasini bosing.");
      dialingNumberRef.current = '';
      setCallStatus('DISCONNECTED');
      control.reconnect();
      return;
    }
    setCallStatus('CONNECTING');
  };

  const handleDial = () => {
    // Buyruq in'ektsiyasi himoyasi: faqat raqam/+/*/# qoldiramiz.
    const cleaned = phoneNumber.replace(/[^0-9+*#]/g, '');
    if (!cleaned) return;

    if (!sipSettings.id || !myExtension) {
      alert('SIP sozlamalari hali yuklanmagan. Bir necha soniyadan keyin urinib ko\'ring.');
      return;
    }

    // Ro'yxatda bo'lsa - darhol teramiz.
    if (sip.isRegistered()) {
      doDialNow(cleaned);
      return;
    }

    // Ro'yxatda EMAS (masalan tab fonda turib WS uzilgan) - "bekor" qilib
    // ogohlantirish o'rniga, avval qayta ulanib, ro'yxat tayyor bo'lishini
    // KUTAMIZ, keyin avtomatik teramiz. UI shu payt "Qo'ng'iroq ketmoqda"
    // ko'rsatadi (operator uchun uzluksiz tajriba).
    setCallStatus('CONNECTING');
    sip.reinitialize();
    sip.waitUntilRegistered(7000).then((ok) => {
      if (ok) {
        doDialNow(cleaned);
      } else {
        toneRef.current.stop();
        alert('SIP tarmoqqa ulanib bo\'lmadi. Internet aloqasini tekshiring va qaytadan urinib ko\'ring.');
        setCallStatus('DISCONNECTED');
      }
    });
  };

  const handleAccept = () => {
    sip.answer();
    setCallStatus('ACTIVE');
    callStartTimeRef.current = new Date();
    toneRef.current.stop();
    if (currentCallUuidRef.current) {
      control.send({ action: 'ANSWER', callUuid: currentCallUuidRef.current });
    }
  };

  const handleHangup = () => {
    toneRef.current.stop();
    sip.terminate();
    if (currentCallUuidRef.current) {
      control.send({ action: 'HANGUP', callUuid: currentCallUuidRef.current });
    }
    resetCallUi();
  };

  const toggleMute = () => {
    const next = !isMuted;
    sip.setMute(next);
    setIsMuted(next);
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
        keepalive_interval: 60,
      };
      // Mavjud trunk'ni YANGILAYMIZ (audit: "dublikat trunk" xatosi) - har safar
      // yangi qator yaratib, eskisini FreeSWITCH'da yetim qoldirmaymiz.
      if (sipSettings.id) {
        await api.updateSipAccount(sipSettings.id, payload);
      } else {
        const created = await api.createSipAccount(payload);
        setSipSettings((prev) => ({ ...prev, id: created.id }));
      }
      localStorage.setItem('sip_settings', JSON.stringify(sipSettings));
      alert('Sip sozlamalari saqlandi!');
    } catch (err) {
      alert('Sozlamalarni saqlashda xatolik: ' + err.message);
    }
  };

  const handleDeleteSettings = async () => {
    if (!sipSettings.id) return;
    if (!window.confirm("SIP trunk (UzTelecom) hisobini o'chirishni tasdiqlaysizmi? Chiquvchi qo'ng'iroqlar to'xtaydi.")) return;
    try {
      await api.deleteSipAccount(sipSettings.id);
      setSipSettings((prev) => ({ ...prev, id: null }));
      localStorage.removeItem('sip_settings');
      alert("SIP trunk o'chirildi.");
    } catch (err) {
      alert("Trunk'ni o'chirishda xatolik: " + err.message);
    }
  };

  const filteredLogs = callLogs.filter((log) =>
    log.client_phone.includes(searchQuery)
    || log.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      {/* Kiruvchi media oqimini chalish uchun yashirin audio tugun */}
      <audio id="telephony-audio" autoPlay style={{ display: 'none' }} />

      {/* Kiruvchi qo'ng'iroq uchun ko'zga tashlanadigan katta oyna */}
      {callStatus === 'INCOMING' && (
        <IncomingCallModal
          incomingNumber={incomingNumber}
          onAccept={handleAccept}
          onReject={handleHangup}
        />
      )}

      <TelephonyStatusBar
        trunkStatus={trunkStatus}
        trunkUsername={sipSettings.username}
        bridgeStatus={sip.bridgeStatus}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

        <div className="lg:col-span-8 space-y-6">
          {canManageTrunk && (
            <SipSettings
              sipSettings={sipSettings}
              setSipSettings={setSipSettings}
              handleSaveSettings={handleSaveSettings}
              handleDeleteSettings={handleDeleteSettings}
            />
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
