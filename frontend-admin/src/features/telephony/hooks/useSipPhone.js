import { useCallback, useEffect, useRef, useState } from 'react';
import JsSIP from 'jssip';
import { showToast } from '../../../services/toast';

// MUHIM (xavfsizlik, 2026-08-03): TURN foydalanuvchi/parol AVVAL shu faylga
// QATTIQ YOZILGAN edi. Fayl git'da kuzatilgani va repo ochiq bo'lgani uchun
// parol har commitda qayta oshkor bo'lardi - ya'ni parolni almashtirish
// hech qanday foyda bermasdi. Endi qiymatlar build paytida
// frontend-admin/.env.local faylidan olinadi (u gitignore'dagi "*.local"
// qoidasi ostida, ya'ni hech qachon commit qilinmaydi).
//
// DIQQAT - bu TO'LIQ yechim EMAS: statik TURN kredensiali baribir brauzerga
// yuboriladi, ya'ni JS bundle'ni ochgan har kim uni ko'radi (bundle
// autentifikatsiyasiz tarqatiladi). Haqiqiy yechim - coturn'ning
// "use-auth-secret" rejimi va backend beradigan qisqa muddatli HMAC
// kredensiallari. Bu o'zgarish faqat GIT orqali sizishni yopadi.
const TURN_HOST = import.meta.env.VITE_TURN_HOST || '192.168.100.10';
const TURN_USER = import.meta.env.VITE_TURN_USER || 'webrtc';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || '';

if (!TURN_CREDENTIAL) {
  console.warn('[Telephony] VITE_TURN_CREDENTIAL build paytida berilmagan - TURN relay ishlamaydi (ovoz ulanmasligi mumkin).');
}

// Verbose JsSIP debug loglarini o'chirib qo'yamiz (brauzer konsolini tozalash).
JsSIP.debug.disable('JsSIP:*');

// WebRTC media (ovoz) uchun ICE/TURN sozlamasi.
// MUHIM: server Docker Desktop/WSL2 (Windows) da ishlaydi - u WebRTC uchun
// kerakli UDP RTP portlarini ishonchli uzatolmaydi. Shuning uchun media'ni
// coturn (TURN) server orqali TCP bilan relay qilamiz: brauzer -> coturn (TCP,
// Docker Desktop TCP'ni ishonchli uzatadi) -> FreeSWITCH (ichki docker tarmoq).
// iceTransportPolicy:'relay' - brauzer FAQAT relay (coturn) yo'lini ishlatadi
// (to'g'ridan-to'g'ri UDP baribir Docker Desktop'da ishlamaydi). TURN URL domen
// EMAS, to'g'ridan-to'g'ri server IP bo'lishi shart (domen Cloudflare tunnel'ga
// ketadi, u yerda TURN yo'q).
const PC_CONFIG = {
  iceServers: [
    // STUN - to'g'ridan-to'g'ri urinish (qo'ng'iroq har doim o'rnatilishi uchun).
    // ATAYIN FAQAT BITTA STUN serveri: har qo'shimcha server nomzod to'plash
    // vaqtini uzaytiradi (brauzer HAR BIR tarmoq interfeysi uchun HAR BIR
    // serverga so'rov yuboradi - bu yerda 5+ interfeys bor, ular orasida
    // IPv6 ULA (fd00::) manzillari ham, ular STUN serverlariga yetmaydi va
    // "kod=701 STUN host lookup received error" beradi). "stun.freeswitch.org"
    // olib tashlandi: FreeSWITCH davridan qolgan (loyiha Asterisk'ga o'tgan)
    // va bitta ishlaydigan STUN serveri yetarli.
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN (coturn) - ovoz media'sini TCP orqali relay qiladi (Docker Desktop
    // UDP yo'li buzuq). URL domen EMAS, to'g'ridan-to'g'ri server IP.
    // MUHIM (jonli sinovda topilgan xato, tuzatildi): bu yerda avval eski
    // (haqiqiy bo'lmagan) "84.54.75.20" IP qattiq yozilgan edi - server
    // HAQIQIY ochiq IP'si (curl api.ipify.org bilan tekshirilgan) butunlay
    // BOSHQA edi. Noto'g'ri TURN IP tufayli brauzer coturn'ga umuman
    // ulanolmasdi - WebRTC ICE/media butunlay o'rnatilmasdi ("aloqa
    // o'rnatilmayapti" xatosi aynan shu sabab edi). Server IP o'zgarsa - bu
    // qiymatni albatta yangilang (coturn-certs/docker-compose'dagi coturn
    // xizmati ham shu IP'ga bog'liq emas, lekin brauzer to'g'ridan-to'g'ri
    // shu qiymatga ulanadi).
    // MUHIM (jonli diagnostikada topilgan ASOSIY xato, 2026-07-30): server
    // ROUTER ORTIDA (LAN 192.168.100.11, router 192.168.100.1) va ochiq IP
    // 213.230.93.109 ROUTERGA tegishli. Routerda 3478 uchun port forwarding
    // sozlanmagan, shuning uchun pastdagi ochiq IP orqali coturn'ga HECH KIM
    // yetib bormaydi - coturn logida 20+ qo'ng'iroq urinishiga qaramay birorta
    // TURN allocation yo'q edi. Brauzer relay nomzodini olmagani va Asterisk
    // SDP'da faqat o'zining ichki Docker IP'sini (172.19.0.5) e'lon qilgani
    // uchun ishlaydigan ICE juftligi UMUMAN qolmaydi: brauzer ICE to'plashni
    // tugatolmay "200 OK" yubormaydi - abonent go'shakni ko'targanida ham
    // veb jiringlashda qolib, ~14s dan keyin Asterisk BYE yuboradi.
    // Aynan shu sabab bazadagi 20 ta call_sessions yozuvining HAMMASI
    // duration=0 bo'lgan (ovoz hech qachon ulanmagan).
    //
    // Operatorlar SERVER BILAN BIR XIL tarmoqda ishlaganda (hozirgi holat -
    // brauzer so'rovlari serverning o'z ochiq IP'sidan kelayotgani bilan
    // tasdiqlangan) LAN manzili orqali coturn'ga BEVOSITA yetib boradi va
    // router sozlamasini kutmasdan ovoz DARHOL ishlaydi. Shu sababli ikkala
    // manzil ham ro'yxatda: brauzer har biriga relay ajratishga urinib,
    // QAYSI ishlasa o'shani tanlaydi (ICE'ning standart xatti-harakati).
    // LAN manzili birinchi - mahalliy operator uchun tezroq topiladi.
    { urls: `turn:${TURN_HOST}:3478?transport=tcp`, username: TURN_USER, credential: TURN_CREDENTIAL },

    // ============================================================================
    // MUHIM - QO'NG'IROQLARNI BUZGAN HAQIQIY SABAB (2026-07-30, ICE loglari bilan
    // aniqlangan). Bu yerda avval quyidagi yozuv TURGAN edi:
    //
    //   { urls: 'turn:213.230.93.109:3478?transport=tcp', ... }
    //
    // Ochiq IP routerga tegishli va routerda 3478 uchun port forwarding YO'Q.
    // Muhim nozik jihat: bu manzilga yuborilgan paketlar RAD ETILMAYDI
    // (connection refused), balki JIMGINA TASHLAB YUBORILADI - sinovda
    // tasdiqlangan (curl: connect=0.000000, exit=28 timeout). Shuning uchun
    // Chrome bu TURN serverga TCP ulanishni SYN qayta yuborishlari bilan
    // 60-75 SEKUND davomida kutadi.
    //
    // Va aynan shu narsa qo'ng'iroqni o'ldirardi: JsSIP "200 OK" javobini
    // ICE nomzod to'plash TO'LIQ tugagach yuboradi, to'plash esa har bir
    // ICE serveri javob bergancha (yoki timeout bo'lguncha) tugamaydi.
    // Natijada brauzer 200 OK yubormay turardi, Asterisk ~30 sekunddan keyin
    // taslim bo'lib trunk'ga BYE yuborardi - abonent go'shakni ko'targan
    // bo'lsa ham veb jiringlashda qolardi. Konsol loglarida bu aniq ko'rinadi:
    // "[ICE] to'plash holati: gathering" bor, lekin "complete" HECH QACHON
    // kelmaydi va "[ICE] ULANISH HOLATI" "checking"da qotib qoladi.
    // Bazadagi 20 ta call_sessions yozuvining hammasi duration=0 bo'lgani
    // ham shundan.
    //
    // XULOSA: yetib bo'lmaydigan TURN yozuvi "zaxira yo'l" emas - u qo'ng'iroqni
    // FAOL RAVISHDA BUZADI. Shuning uchun olib tashlandi.
    //
    // Masofadagi operatorlarni yoqish uchun TARTIB QAT'IY SHUNDAY bo'lishi kerak:
    //   1) Routerda (192.168.100.1) 3478/TCP+UDP -> 192.168.100.11 forwarding
    //      sozlanadi;
    //   2) Tashqi tarmoqdan (masalan telefon mobil internetida) port ochiqligi
    //      TASDIQLANADI;
    //   3) FAQAT SHUNDAN KEYIN yuqoridagi ochiq IP yozuvi qaytariladi.
    // Aks tartibda qaytarilsa - mahalliy operatorlar uchun ham qo'ng'iroq
    // yana buziladi.
    // ============================================================================
  ],
  // MUHIM: 'relay' EMAS, 'all' (standart) - brauzer HAM to'g'ridan-to'g'ri HAM
  // relay yo'lini sinaydi. Shunda coturn yetib bormasa ham qo'ng'iroq O'RNATILADI
  // (javob berish/rad etish ishlaydi), coturn yetsa ovoz relay orqali keladi.
  // ('relay' majburiy qilinsa, coturn yetmaганда qo'ng'iroq umuman buzilardi.)
};

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
  const [isOnHold, setIsOnHold] = useState(false);
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
    setIsOnHold(false); // Yangi sessiya - eski chaqiruvdan qolgan "hold" holati tozalanadi.
    session.on('peerconnection', (e) => {
      const pc = e.peerconnection;

      // MUHIM (2026-07-30 diagnostikasi): bu yerda AVVAL faqat 'track'
      // tinglanardi - ya'ni WebRTC ulanishining HAQIQIY holati (ICE) hech qanday
      // joyda kuzatilmasdi. Natijada qo'ng'iroq "ulanmadi" deganda konsolda
      // "javob berilmoqda"dan keyin JIMLIK bo'lardi va nosozlikni topish
      // imkonsiz edi: ICE nomzod to'plash muvaffaqiyatsizmi, TURN serveriga
      // yetib bormadimi, yoki ulanish tekshiruvi (connectivity check) o'tmadimi
      // - farqini bilishning YO'LI yo'q edi. Quyidagi loglar aynan shu
      // ko'rinmaslikni tuzatadi.
      //
      // 'icecandidateerror' ENG MUHIMI: STUN/TURN serveriga ulanish
      // muvaffaqiyatsiz bo'lsa, brauzer aynan shu hodisada url + errorCode +
      // errorText beradi (masalan TURN allocation timeout yoki 401
      // autentifikatsiya xatosi). Server loglarida bu ma'lumot YO'Q - faqat
      // brauzer biladi.
      pc.addEventListener('icecandidateerror', (ev) => {
        console.error('[ICE] NOMZOD XATOSI | url=', ev.url,
          '| kod=', ev.errorCode, '| matn=', ev.errorText, '| manzil=', ev.address, ev.port);
      });

      // Har bir topilgan nomzodning TURINI yozamiz. Kutilayotgani: kamida bitta
      // "relay" (coturn orqali) yoki brauzer yetadigan "host"/"srflx".
      pc.addEventListener('icecandidate', (ev) => {
        if (ev.candidate && ev.candidate.candidate) {
          const c = ev.candidate;
          console.log('[ICE] nomzod topildi | tur=', c.type, '| protokol=', c.protocol,
            '| manzil=', c.address, ':', c.port, '| related=', c.relatedAddress);
        } else {
          console.log('[ICE] nomzod to\'plash TUGADI (barcha nomzodlar yuborildi)');
        }
      });

      pc.addEventListener('icegatheringstatechange', () => {
        console.log('[ICE] to\'plash holati:', pc.iceGatheringState);
      });

      // Haqiqiy natija shu yerda ko'rinadi: 'connected'/'completed' = ovoz yo'li
      // o'rnatildi; 'failed' = birorta ishlaydigan nomzod juftligi topilmadi
      // (ya'ni tarmoq/TURN muammosi); 'checking'da qotib qolsa - nomzodlar bor,
      // lekin ular orasida yetib boradigan yo'l yo'q.
      pc.addEventListener('iceconnectionstatechange', async () => {
        console.log('[ICE] ULANISH HOLATI:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          // Qaysi juftlik tanlandi - ovoz aynan qaysi yo'ldan kelayotganini
          // aniq ko'rsatadi (to'g'ridan-to'g'ri yoki coturn relay orqali).
          try {
            const stats = await pc.getStats();
            stats.forEach((r) => {
              if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
                const local = stats.get(r.localCandidateId);
                const remote = stats.get(r.remoteCandidateId);
                console.log('[ICE] TANLANGAN YO\'L | mahalliy=',
                  local && local.candidateType, local && local.address, local && local.port,
                  '-> masofaviy=', remote && remote.candidateType, remote && remote.address, remote && remote.port);
              }
            });
          } catch (statsErr) {
            console.warn('[ICE] getStats xatosi:', statsErr && statsErr.message);
          }
        }
      });

      pc.addEventListener('connectionstatechange', () => {
        console.log('[WebRTC] umumiy ulanish holati:', pc.connectionState);
      });

      pc.addEventListener('track', (event) => {
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

    // Quyidagi hodisalarda AVVAL hech qanday log yo'q edi - qo'ng'iroq
    // muvaffaqiyatsiz tugaganda konsolda sabab ko'rinmasdi (SIP darajasida
    // nima bo'lganini faqat server logidan taxmin qilish mumkin edi).
    session.on('connecting', () => {
      console.log('[SIP] sessiya: connecting');
      cbRef.current.onProgress && cbRef.current.onProgress();
    });
    session.on('progress', () => {
      console.log('[SIP] sessiya: progress (jiringlayapti)');
      cbRef.current.onProgress && cbRef.current.onProgress();
    });
    session.on('accepted', () => {
      console.log('[SIP] sessiya: ACCEPTED (200 OK) - signalizatsiya tayyor, ovoz ICE\'ga bog\'liq');
      cbRef.current.onActive && cbRef.current.onActive();
    });
    // 'confirmed' = ACK ham keldi, chaqiruv TO'LIQ o'rnatildi. Avval bu hodisa
    // umuman kuzatilmagan edi - "accepted keldi, lekin confirmed kelmadi"
    // holatini ajratib bo'lmasdi.
    session.on('confirmed', () => {
      console.log('[SIP] sessiya: CONFIRMED (ACK) - chaqiruv to\'liq o\'rnatildi');
    });
    session.on('failed', (e) => {
      console.error('[SIP] sessiya: FAILED | sabab=', e && e.cause,
        '| SIP kod=', e && e.message && e.message.status_code,
        '| sabab matni=', e && e.message && e.message.reason_phrase);
      cbRef.current.onFailed && cbRef.current.onFailed(e && e.cause);
      sessionRef.current = null;
    });
    session.on('ended', (e) => {
      console.warn('[SIP] sessiya: ENDED | sabab=', e && e.cause,
        '| kim uzdi=', e && e.originator);
      cbRef.current.onEnded && cbRef.current.onEnded();
      sessionRef.current = null;
      setIsOnHold(false);
    });
    // Kutish holati - JsSIP re-INVITE (sendonly/recvonly SDP) muvaffaqiyatli
    // bo'lganda keladi. Asterisk B2BUA sifatida buni o'zi boshqaradi (ikkinchi
    // tomonga MOH chalib beradi) - bu yerda faqat UI holatini kuzatamiz.
    session.on('hold', () => setIsOnHold(true));
    session.on('unhold', () => setIsOnHold(false));
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
                // Media coturn (TURN) orqali relay qilinadi - PC_CONFIG'ga qarang.
                pcConfig: PC_CONFIG,
              });
            })
            .catch((err) => {
              console.error('[Telephony] getUserMedia XATOLIK:', err && err.name, err && err.message);
              showToast('Mikrofonni ochib bo\'lmadi (' + (err && err.name) + ').\n'
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
          // Media coturn (TURN) orqali relay qilinadi - PC_CONFIG'ga qarang.
          pcConfig: PC_CONFIG,
        });
      })
      .catch((err) => {
        console.error('[Telephony] getUserMedia XATOLIK (javob):', err && err.name, err && err.message);
        showToast('Mikrofonni ochib bo\'lmadi (' + (err && err.name) + ').\n'
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

  // Kutish holati (Hold): JsSIP session.hold()/unhold() qayta-INVITE yuboradi
  // (SDP'da sendonly/inactive) - Asterisk B2BUA sifatida buni to'g'ridan-to'g'ri
  // boshqaradi (ikkinchi tomonga moh_suggest'dagi MOH klassini chaladi).
  // Maxsus backend/ARI kodi shart emas, faqat SIP signalizatsiyasi.
  const hold = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.hold(); } catch (e) { /* ignore */ }
    }
  }, []);

  const unhold = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.unhold(); } catch (e) { /* ignore */ }
    }
  }, []);

  return {
    bridgeStatus, isRegistered, waitUntilRegistered, answer, terminate, setMute,
    reinitialize: initialize, markOutboundDial, clearOutboundDial,
    isOnHold, hold, unhold,
  };
}
