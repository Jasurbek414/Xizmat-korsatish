// Professional chaqiruv ohanglari (Web Audio) - haqiqiy IP-telefon tajribasi.
//
// Nega kerak: trunk-first arxitekturada operator "Qo'ng'iroq" bosgach, tashqi
// raqam jiringlayotgan paytda brauzer hali media bilan ulanmagan bo'ladi (u
// faqat callee JAVOB berganda ulanadi). Shu sabab, agar hech narsa qilmasak,
// operator butunlay JIMLIK eshitadi va "ishlamayapti" deb o'ylaydi. Bu modul
// standart telefon ohanglarini brauzerning O'ZIDA sintez qiladi:
//   - ringback  : "tut ... tut ..." (chaqiruv ketmoqda) - 425 Hz, 1s/4s (MDH/EU)
//   - busy      : "tut-tut-tut" (band)                   - 425 Hz, 0.5s/0.5s
//   - error     : tez "tit-tit-tit" (xatolik/marshrut yo'q) - 425 Hz, 0.25s/0.25s
//   - ended     : bitta qisqa signal (chaqiruv tugadi)   - 425 Hz, 0.2s
//
// Bitta AudioContext qayta ishlatiladi (brauzer autoplay siyosati: birinchi
// foydalanuvchi harakatidan keyin "resume" qilinadi). Har bir ohang oldingisini
// to'xtatib, yangisini boshlaydi - ustma-ust chalinmaydi.

const TONE_HZ = 425; // MDH/Yevropa telefon ohang chastotasi
const TONE_GAIN = 0.12;

export default class CallToneEngine {
  constructor() {
    this._ctx = null;
    this._cycleTimer = null;
    this._activeNodes = [];
    this._current = null; // 'ringback' | 'busy' | 'error' | 'ended' | null
  }

  _ensureCtx() {
    if (!this._ctx || this._ctx.state === 'closed') {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this._ctx = null;
      }
    }
    // Autoplay siyosati: kontekst "suspended" bo'lsa (foydalanuvchi harakatisiz
    // yaratilgan) - uni tiklaymiz. Odatda "Qo'ng'iroq" tugmasi (klик) shu
    // yo'lni ishga tushiradi, shuning uchun resume ruxsat etiladi.
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  // Bitta ohang portlashini (burst) berilgan davomiylikda chaladi.
  _burst(durationSec) {
    const ctx = this._ctx;
    if (!ctx || ctx.state === 'closed') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = TONE_HZ;
      gain.gain.value = TONE_GAIN;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + durationSec);
      this._activeNodes.push(osc, gain);
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch (e) { /* ignore */ }
      };
    } catch (e) {
      /* ignore - audio ixtiyoriy qulaylik, hech qachon oqimni to'xtatmasin */
    }
  }

  // Takroriy ohang (ringback/busy/error) - onSec ovoz, offSec jimlik, cheksiz.
  _startCadence(name, onSec, offSec) {
    this.stop();
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this._current = name;
    const periodMs = (onSec + offSec) * 1000;
    const tick = () => {
      if (this._current !== name) return;
      this._burst(onSec);
    };
    tick();
    this._cycleTimer = setInterval(tick, periodMs);
  }

  ringback() { this._startCadence('ringback', 1.0, 4.0); }
  busy() { this._startCadence('busy', 0.5, 0.5); }
  error() { this._startCadence('error', 0.25, 0.25); }
  // Kiruvchi qo'ng'iroq ohangi - ringback'dan TEZROQ takror (1s ovoz / 2s
  // jimlik) - operator "kimdir qo'ng'iroq qilyapti" deb aniq farqlaydi.
  incoming() { this._startCadence('incoming', 1.0, 2.0); }

  // Bir martalik "chaqiruv tugadi" signali (takrorlanmaydi).
  ended() {
    this.stop();
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this._current = 'ended';
    this._burst(0.2);
    // 0.25s dan keyin holatni tozalaymiz (yangi ohang chalinishiga xalaqit bermasin).
    setTimeout(() => { if (this._current === 'ended') this._current = null; }, 300);
  }

  // Barcha ohanglarni darhol to'xtatadi.
  stop() {
    this._current = null;
    if (this._cycleTimer) {
      clearInterval(this._cycleTimer);
      this._cycleTimer = null;
    }
    for (const node of this._activeNodes) {
      try { node.stop && node.stop(); } catch (e) { /* ignore */ }
      try { node.disconnect(); } catch (e) { /* ignore */ }
    }
    this._activeNodes = [];
  }

  // Komponent yo'q qilinganda - resurslarni to'liq bo'shatadi.
  dispose() {
    this.stop();
    if (this._ctx && this._ctx.state !== 'closed') {
      this._ctx.close().catch(() => {});
    }
    this._ctx = null;
  }
}
