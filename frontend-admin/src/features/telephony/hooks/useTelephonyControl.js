import { useCallback, useEffect, useRef } from 'react';

// Java backend'ning HAQIQIY nazorat kanali (/ws/telephony) - dial/hangup/answer
// buyruqlari shu orqali yuboriladi, hodisalar (INVITE/BYE/FAILED/TRUNK_STATUS)
// shu orqali keladi. RTP/media bu kanaldan O'TMAYDI (u FreeSWITCH<->brauzer
// orasida to'g'ridan-to'g'ri) - bu faqat signalizatsiya/boshqaruv.
//
// Bu hook barqarorlikni ta'minlaydi: KEEPALIVE (har 40s PING, aks holda
// Cloudflare/nginx bo'sh WebSocket'ni ~100s da uzadi va DIAL jimgina yo'qoladi)
// va AVTOMATIK QAYTA ULANISH (uzilsa 3s dan keyin qayta ulanadi).
export default function useTelephonyControl({
  dialingNumberRef,
  currentCallUuidRef,
  onByeForCurrentCall, // () - server joriy chaqiruvni tugatdi (JsSIP 'ended' kelmasa)
  onReloadLogs,        // () - qo'ng'iroq tarixini yangilash
  onFailed,            // (message) - backend so'rovni rad etdi
  onTrunkStatus,       // (status) - HAQIQIY trunk holati o'zgardi
}) {
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const reconnectRef = useRef(null);
  // Callbacklarni ref'da saqlaymiz - WebSocket handlerlari faqat bir marta
  // o'rnatiladi, lekin doim eng so'nggi callbackni ko'rishi kerak (stale closure
  // oldini olish).
  const cbRef = useRef({});
  cbRef.current = { onByeForCurrentCall, onReloadLogs, onFailed, onTrunkStatus };

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Eski ulanish/taymerlarni tozalab, ustma-ust ulanishlar bo'lmasligini ta'minlaymiz.
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/telephony?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      // KEEPALIVE: har 40 soniyada kichik "PING" - control kanalini tirik
      // saqlaydi (aks holda DIAL/HANGUP buyruqlari jimgina yo'qolib ketardi).
      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'PING' }));
        }
      }, 40000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const cb = cbRef.current;
        if (data.type === 'INVITE' && data.payload && data.payload.callee === dialingNumberRef.current) {
          currentCallUuidRef.current = data.payload.callUuid;
        } else if (data.type === 'BYE') {
          // Tugagan sessiya AYNAN bizning joriy chaqiruvimizmi (masalan backend
          // javobsiz sessiyani TIMEOUT bilan tozalagan bo'lsa, JsSIP tomonida
          // 'ended' kelmaydi) - UI'ni ham qayta tiklaymiz.
          if (data.payload && data.payload.callUuid && data.payload.callUuid === currentCallUuidRef.current) {
            cb.onByeForCurrentCall && cb.onByeForCurrentCall();
          }
          cb.onReloadLogs && cb.onReloadLogs();
        } else if (data.type === 'FAILED' && dialingNumberRef.current) {
          cb.onFailed && cb.onFailed(
            data.payload && data.payload.message ? data.payload.message : "noma'lum xatolik"
          );
        } else if (data.type === 'TRUNK_STATUS' && data.payload) {
          cb.onTrunkStatus && cb.onTrunkStatus(data.payload.status);
        }
      } catch (e) {
        console.error('Telephony control channel message parse error:', e);
      }
    };

    ws.onerror = (e) => console.error('Telephony control channel error:', e);

    ws.onclose = () => {
      // Ulanish uzilsa (Cloudflare idle, tarmoq, backend restart) - AVTOMATIK
      // qayta ulanamiz. Aks holda bir marta uzilgach DIAL/HANGUP boshqa hech
      // qachon backendga yetmasdi.
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => connect(), 3000);
    };

    wsRef.current = ws;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kanal OCHIQ bo'lsagina buyruq yuboradi - aks holda "false" qaytaradi
  // (chaqiruvchi buni bilib foydalanuvchini ogohlantiradi va qayta ulanadi).
  const send = useCallback((action) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (wsRef.current) {
        wsRef.current.onclose = null; // qayta ulanishni to'xtatamiz
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { send, reconnect: connect };
}
