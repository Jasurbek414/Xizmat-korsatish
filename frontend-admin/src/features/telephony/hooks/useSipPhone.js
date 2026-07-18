import { useCallback, useEffect, useRef, useState } from 'react';
import JsSIP from 'jssip';

// Verbose JsSIP debug loglarini o'chirib qo'yamiz (brauzer konsolini tozalash).
JsSIP.debug.disable('JsSIP:*');

// Brauzerning FreeSWITCH "internal" profilidagi shaxsiy ichki WebRTC
// extension'ini boshqaradigan hook. Brauzer UzTelecom trunk bilan HECH QACHON
// to'g'ridan-to'g'ri ishlamaydi - u faqat ichki extension (masalan 2001) sifatida
// wss://.../ws/sip orqali ro'yxatdan o'tadi. Media (RTP) FreeSWITCH<->brauzer
// orasida to'g'ridan-to'g'ri oqadi, Java faqat kim/qachon/kimga qo'ng'iroq
// qilishini boshqaradi.
//
// Barqarorlik: JsSIP o'zining connection_recovery bilan WS uzilsa qayta ulanadi,
// bunga QO'SHIMCHA - watchdog UA'ning HAQIQIY holatini (isRegistered) har 5s da
// tekshiradi va ketma-ket ~15s ro'yxatsiz qolsa klientni butunlay qayta ishga
// tushiradi (dispetcher kun bo'yi ochiq tutadi - "osilib" qolmasligi shart).
export default function useSipPhone({
  myExtension,
  dialingNumberRef,
  callStatusRef,
  onProgress,
  onActive,
  onFailed,
  onEnded,
  onIncoming,
  onOutboundMediaError,
}) {
  const [bridgeStatus, setBridgeStatus] = useState('DISCONNECTED');
  const uaRef = useRef(null);
  const sessionRef = useRef(null);
  // Operator CHIQUVCHI qo'ng'iroq boshlagan VAQT (timestamp). Chiquvchi oqimda
  // trunk JAVOB berganda FreeSWITCH brauzerga INVITE yuboradi va uni AVTOMATIK
  // qabul qilishimiz kerak. KIRUVCHI qo'ng'iroqda esa AVTOMATIK javob bermasdan
  // "Kiruvchi qo'ng'iroq" oynasini ko'rsatishimiz kerak. Farqni ishonchli
  // aniqlash uchun: agar so'nggi ~65s ichida operator o'zi terган bo'lsa - bu
  // chiquvchi bridge; aks holda - haqiqiy KIRUVCHI qo'ng'iroq. (Avval eskirgan
  // dialingNumberRef ishlatilardi - u tozalanmay qolsa kiruvchi qo'ng'iroq
  // xato "bridge" deb qabul qilinib, faqat qizil tugma chiqardi.)
  const outboundDialAtRef = useRef(0);
  // So'nggi initialize() vaqti - AVTOMATIK qayta-init (watchdog/visibilitychange)
  // ni cheklash uchun. MUHIM: avval watchdog har 15s da, visibilitychange va
  // JsSIP recovery bir vaqtda yangi UA/WS yaratib, WS ulanmasa "bo'ron" hosil
  // qilardi - soatlab davom etib brauzerning WS ulanish LIMITIGA (~255) yetib,
  // hamma yangi WS rad etilardi. Endi avtomatik qayta-init eng ko'pi 30s da bir
  // marta; asosiy qayta-ulanishni JsSIP'ning O'Z connection_recovery'si qiladi.
  const lastInitAtRef = useRef(0);
  // Callbacklarni ref'da - JsSIP handlerlari bir marta o'rnatiladi, lekin doim
  // eng so'nggi callbackni ko'rishi kerak (stale closure oldini olish).
  const cbRef = useRef({});
  cbRef.current = { onProgress, onActive, onFailed, onEnded, onIncoming, onOutboundMediaError };

  const stop = useCallback(() => {
    if (uaRef.current) {
      try { uaRef.current.stop(); } catch (e) { /* ignore */ }
      uaRef.current = null;
    }
    setBridgeStatus('DISCONNECTED');
  }, []);

  // Bitta sessiya (kiruvchi yoki bridge oyog'i) uchun hodisa tinglovchilarni o'rnatadi.
  const attachSessionHandlers = useCallback((session) => {
    session.on('peerconnection', (e) => {
      e.peerconnection.addEventListener('track', (event) => {
        const stream = event.streams[0];
        const audioEl = document.getElementById('telephony-audio');
        // 'track' bir necha marta ishlashi mumkin - faqat stream HAQIQATAN
        // o'zgarganda srcObject'ni o'rnatamiz (aks holda brauzer play()ni uzib
        // zararsiz AbortError beradi).
        if (audioEl && audioEl.srcObject !== stream) {
          audioEl.srcObject = stream;
          const playPromise = audioEl.play();
          if (playPromise) {
            playPromise.catch((err) => {
              if (err && err.name !== 'AbortError') {
                console.error('Audio playback error:', err);
              }
            });
          }
        }
      });
    });

    session.on('connecting', () => cbRef.current.onProgress && cbRef.current.onProgress());
    session.on('progress', () => cbRef.current.onProgress && cbRef.current.onProgress());
    session.on('accepted', () => cbRef.current.onActive && cbRef.current.onActive());
    session.on('failed', (e) => {
      cbRef.current.onFailed && cbRef.current.onFailed(e && e.cause);
      sessionRef.current = null;
    });
    session.on('ended', () => {
      cbRef.current.onEnded && cbRef.current.onEnded();
      sessionRef.current = null;
    });
  }, []);

  const initialize = useCallback(() => {
    lastInitAtRef.current = Date.now();
    stop();
    setBridgeStatus('DISCONNECTED');
    if (!myExtension || !myExtension.extension || !myExtension.password) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/ws/sip`;
      const socket = new JsSIP.WebSocketInterface(socketUrl);
      const domain = window.location.hostname;

      const configuration = {
        sockets: [socket],
        uri: `sip:${myExtension.extension}@${domain}`,
        password: myExtension.password,
        authorization_user: myExtension.extension,
        display_name: 'Operator',
        register: true,
        // Cloudflare/nginx bo'sh WebSocket'ni ~100s da uzadi. 60s expires bilan
        // JsSIP undan oldin re-register qilib, ulanishni "band" ushlaydi.
        register_expires: 60,
        // WSS uzilsa tezroq (2-15s, standart 30s o'rniga) qayta ulanish.
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 15,
      };

      console.log('[SIP] initializeSipClient: extension=', myExtension.extension, '| socket=', socketUrl);
      const ua = new JsSIP.UA(configuration);

      ua.on('connected', () => {
        console.log('[SIP] WebSocket ULANDI (/ws/sip)');
        setBridgeStatus('CONNECTING');
      });
      ua.on('disconnected', (e) => {
        console.warn('[SIP] WebSocket UZILDI', e && e.reason ? e.reason : '');
        setBridgeStatus('DISCONNECTED');
      });
      ua.on('registrationFailed', (e) => {
        console.error('[SIP] Ro\'yxatdan o\'tish MUVAFFAQIYATSIZ:', e && e.cause, e && e.response ? e.response.status_code : '');
        setBridgeStatus('ERROR');
      });
      ua.on('registered', () => {
        console.log('[SIP] Ro\'yxatdan O\'TDI (FreeSWITCH internal)');
        setBridgeStatus('REGISTERED');
      });
      ua.on('unregistered', () => {
        console.warn('[SIP] Ro\'yxatdan CHIQDI');
        setBridgeStatus('DISCONNECTED');
      });

      ua.on('newRTCSession', (data) => {
        const session = data.session;
        if (session.direction !== 'incoming') return;

        sessionRef.current = session;
        attachSessionHandlers(session);

        // Chiquvchi bridge (operator o'zi terган, trunk javob berdi) MI yoki
        // haqiqiy KIRUVCHI qo'ng'iroqMI? Ishonchli mezon: so'nggi 65s ichida
        // operator o'zi "Qo'ng'iroq" bosgan bo'lsa -> chiquvchi bridge (avtomatik
        // javob). Aks holda -> KIRUVCHI qo'ng'iroq (oyna ko'rsatiladi, operator
        // o'zi javob beradi). Bir marta ishlatilgach flag'ni tozalaymiz - keyingi
        // qo'ng'iroq to'g'ri aniqlanadi.
        const isOutboundBridge = (Date.now() - outboundDialAtRef.current) < 65000;
        outboundDialAtRef.current = 0;
        console.log('[Telephony] Kiruvchi RTCSession | isOutboundBridge=', isOutboundBridge,
          '| callStatus=', callStatusRef.current);

        if (isOutboundBridge) {
          // Mikrofonni ochamiz - muammo bo'lsa ANIQ ko'rsatamiz (avval jimgina
          // yutilib, brauzer javob bermay jiringlab qolardi -> NO_ANSWER).
          navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((stream) => {
              console.log('[Telephony] getUserMedia OK -> javob berilmoqda');
              session.answer({
                mediaConstraints: { audio: true, video: false },
                mediaStream: stream,
                // Brauzer NAT ortida - STUN orqali ochiq nomzodni ham to'playdi
                // (aks holda FreeSWITCH media yo'lini topa olmasdi).
                pcConfig: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun.freeswitch.org' },
                  ],
                },
              });
            })
            .catch((err) => {
              console.error('[Telephony] getUserMedia XATOLIK:', err && err.name, err && err.message);
              alert('Mikrofonni ochib bo\'lmadi (' + (err && err.name) + ').\n'
                + '1. Brauzerda manzil satridagi qulf belgisi orqali mikrofonga RUXSAT bering.\n'
                + '2. Boshqa dastur (Zoom, Telegram, boshqa tab) mikrofonni band qilmaganini tekshiring.\n'
                + '3. Naushnik/mikrofon ulanganini tekshiring.');
              try { session.terminate(); } catch (e2) { /* ignore */ }
              sessionRef.current = null;
              cbRef.current.onOutboundMediaError && cbRef.current.onOutboundMediaError();
            });
        } else {
          // Kiruvchi qo'ng'iroq qiluvchining raqami (caller ID).
          const ri = session.remote_identity || {};
          const number = (ri.uri && ri.uri.user) || ri.display_name || "Noma'lum";
          console.log('[Telephony] KIRUVCHI qo\'ng\'iroq:', number);
          cbRef.current.onIncoming && cbRef.current.onIncoming(number);
        }
      });

      ua.start();
      uaRef.current = ua;
    } catch (e) {
      console.error('[SIP] JsSIP UA yaratib bo\'lmadi:', e);
      setBridgeStatus('ERROR');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExtension, stop, attachSessionHandlers, dialingNumberRef, callStatusRef]);

  // Extension yuklanganida JsSIP'ni ishga tushiramiz; o'zgarsa qayta.
  useEffect(() => {
    if (!myExtension || !myExtension.extension || !myExtension.password) return;
    initialize();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExtension]);

  // Watchdog (ZAXIRA): asosiy qayta-ulanishni JsSIP'ning O'Z connection_recovery'si
  // qiladi (WS uzilsa 2-15s da qayta ulanib, qayta ro'yxatdan o'tadi). Watchdog
  // faqat holatni ko'rsatadi va JsSIP butunlay "osilib" qolsa (~60s ro'yxatsiz)
  // ZAXIRA sifatida bir marta qayta ishga tushiradi - lekin eng ko'pi 30s da bir
  // marta (lastInitAtRef throttle) - aks holda WS ulanmasa "bo'ron" hosil bo'lardi.
  useEffect(() => {
    let downCount = 0;
    const intervalId = setInterval(() => {
      const ua = uaRef.current;
      let registered = false;
      try { registered = ua ? ua.isRegistered() : false; } catch (e) { registered = false; }
      if (registered) {
        downCount = 0;
        setBridgeStatus('REGISTERED');
      } else {
        downCount += 1;
        setBridgeStatus((prev) => (prev === 'REGISTERED' ? 'CONNECTING' : prev));
        // ~60s ro'yxatsiz VA so'nggi init'dan 30s+ o'tgan bo'lsagina qayta init.
        const sinceInit = Date.now() - lastInitAtRef.current;
        if (downCount >= 12 && sinceInit > 30000 && myExtension && myExtension.extension) {
          downCount = 0;
          console.warn('[Telephony] SIP uzoq vaqt ro\'yxatsiz - zaxira qayta ishga tushirish');
          initialize();
        }
      }
    }, 5000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExtension]);

  // Tab qayta faollashganda (operator boshqa oyna/ilovadan qaytganda) DARHOL
  // ro'yxatni tiklaymiz. Brauzer fon (background) tab'da setInterval'ni
  // sekinlashtiradi/bloklaydi va bo'sh turgan WebSocket'ni uzadi - shu sabab
  // operator qaytib kelib raqam terganida ro'yxat "eskirgan" bo'lib, chaqiruv
  // bekor bo'lardi. visibilitychange/focus/online hodisalarida darhol tekshirib,
  // ro'yxatda bo'lmasak - qayta ishga tushiramiz (watchdog'ning 15s ini kutmasdan).
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      let registered = false;
      try { registered = uaRef.current ? uaRef.current.isRegistered() : false; } catch (e) { registered = false; }
      // Faqat ro'yxatda bo'lmasa VA so'nggi init'dan 30s+ o'tgan bo'lsa qayta init
      // (aks holda focus/online hodisalari ketma-ket kelib "bo'ron" hosil qilardi).
      const sinceInit = Date.now() - lastInitAtRef.current;
      if (!registered && sinceInit > 30000 && myExtension && myExtension.extension) {
        console.log('[SIP] tab faollashdi - ro\'yxat tiklanmoqda');
        initialize();
      }
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    window.addEventListener('online', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('online', recheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExtension, initialize]);

  const isRegistered = useCallback(() => {
    try { return uaRef.current ? uaRef.current.isRegistered() : false; } catch (e) { return false; }
  }, []);

  // Operator CHIQUVCHI qo'ng'iroq boshlaganda chaqiriladi (Telephony.handleDial) -
  // shu vaqtdan ~65s ichida kelgan INVITE "chiquvchi bridge" deb avtomatik
  // qabul qilinadi; undan keyingi/oldingi INVITE'lar "kiruvchi qo'ng'iroq".
  const markOutboundDial = useCallback(() => { outboundDialAtRef.current = Date.now(); }, []);
  const clearOutboundDial = useCallback(() => { outboundDialAtRef.current = 0; }, []);

  // Ro'yxatdan o'tishini kutadi (maks timeoutMs). Terish paytida ro'yxat hali
  // tiklanmagan bo'lsa - bloklab "bekor" qilish o'rniga shu tayyor bo'lishini
  // kutib, keyin terish uchun (yaxshiroq UX).
  const waitUntilRegistered = useCallback((timeoutMs = 7000) => {
    return new Promise((resolve) => {
      const ok = () => {
        try { return uaRef.current ? uaRef.current.isRegistered() : false; } catch (e) { return false; }
      };
      if (ok()) { resolve(true); return; }
      const start = Date.now();
      const iv = setInterval(() => {
        if (ok()) { clearInterval(iv); resolve(true); }
        else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(false); }
      }, 300);
    });
  }, []);

  // KIRUVCHI qo'ng'iroqqa javob berish (operator "Javob berish"ni bosganda).
  // MUHIM: chiquvchi bridge kabi AVVAL mikrofonni ochamiz va STUN bilan javob
  // beramiz - aks holda brauzer (NAT ortida) faqat mahalliy media nomzodini
  // taklif qilib, FreeSWITCH media yo'lini topa olmasdi (ovoz o'rnatilmasdi).
  const answer = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        console.log('[Telephony] getUserMedia OK -> kiruvchi qo\'ng\'iroqqa javob berilmoqda');
        session.answer({
          mediaConstraints: { audio: true, video: false },
          mediaStream: stream,
          pcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun.freeswitch.org' },
            ],
          },
        });
      })
      .catch((err) => {
        console.error('[Telephony] getUserMedia XATOLIK (javob):', err && err.name, err && err.message);
        alert('Mikrofonni ochib bo\'lmadi (' + (err && err.name) + ').\n'
          + '1. Brauzerda manzil satridagi qulf belgisi orqali mikrofonga RUXSAT bering.\n'
          + '2. Boshqa dastur (Zoom, Telegram, boshqa tab) mikrofonni band qilmaganini tekshiring.\n'
          + '3. Naushnik/mikrofon ulanganini tekshiring.');
        try { session.terminate(); } catch (e2) { /* ignore */ }
        sessionRef.current = null;
        cbRef.current.onOutboundMediaError && cbRef.current.onOutboundMediaError();
      });
  }, []);

  const terminate = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch (e) { /* ignore */ }
      sessionRef.current = null;
    }
  }, []);

  const setMute = useCallback((muted) => {
    if (sessionRef.current) {
      if (muted) sessionRef.current.mute();
      else sessionRef.current.unmute();
    }
  }, []);

  return { bridgeStatus, isRegistered, waitUntilRegistered, answer, terminate, setMute, reinitialize: initialize, markOutboundDial, clearOutboundDial };
}
