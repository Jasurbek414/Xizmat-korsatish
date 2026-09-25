// Global xato/ogohlantirish toast'i - React daraxtidan TASHQARIDA ishlaydi,
// chunki uni api.js (services qatlami) chaqiradi va u yerda hook/context yo'q.
//
// NEGA KERAK (2026-08-10 auditda topilgan): sahifalardagi 35 ta catch bloki
// xatoni faqat console.error qilardi - server "ruxsat yo'q" (403), "boshqa
// so'rov o'zgartirdi" (409) kabi ANIQ xabar qaytarsa ham foydalanuvchi hech
// narsa ko'rmasdi: tugma bosiladi, hech nima bo'lmaydi. Har bir catch'ni
// alohida tuzatish o'rniga xabar BARCHA so'rovlar o'tadigan yagona nuqtada
// (api.js handleResponse) ko'rsatiladi - shu modul o'sha yerdan chaqiriladi.

let container = null;

const ensureContainer = () => {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'api-toast-container';
  // Modallar (odatda z-50) ustida ham ko'rinishi kerak.
  container.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:9999;display:flex;' +
    'flex-direction:column;gap:8px;max-width:360px;pointer-events:none;';
  document.body.appendChild(container);
  return container;
};

/**
 * Qisqa muddatli xabar. Bir xil matn ketma-ket kelsa (masalan bitta
 * sahifadagi 4 ta parallel so'rov birdek muvaffaqiyatsiz bo'lsa, yoki
 * handleResponse allaqachon ko'rsatgan xatoni sahifa catch'i ham
 * ko'rsatmoqchi bo'lsa) faqat bittasi ko'rsatiladi.
 */
const recent = new Set();

const COLORS = {
  error: '#b91c1c',
  success: '#047857',
  info: '#1d4ed8',
};

export const showToast = (message, type = 'error') => {
  // MUHIM (jonli tekshiruvda topilgan xato): takrorlanishni oldini olish
  // FAQAT 'error' turiga tegishli bo'lishi kerak edi (izohdagi asl sabab -
  // bir nechta parallel so'rov BIR XIL xatoni qaytarganda uni bir necha
  // marta ko'rsatmaslik). Lekin `recent` FAQAT matnga (turiga qaramasdan)
  // qarab tekshirilardi - agar foydalanuvchi biror amalni QAYTA bajarsa
  // (masalan bir necha soniya oralig'ida ikki marta saqlasa), IKKINCHI
  // marta chiqishi kerak bo'lgan "muvaffaqiyatli saqlandi" xabari ham
  // jimgina bekor qilinardi - amal aslida ishlagan bo'lsa ham, foydalanuvchi
  // hech qanday tasdiqni ko'rmasdi va "ishlamadi" deb noto'g'ri xulosaga
  // kelardi.
  if (!message) return;
  if (type === 'error' && recent.has(message)) return;
  if (type === 'error') {
    recent.add(message);
    setTimeout(() => recent.delete(message), 4000);
  }

  const el = document.createElement('div');
  el.textContent = message;
  // pre-line: telefoniya xabarlari ko'p qatorli (\n bilan) keladi.
  el.style.cssText =
    `background:${COLORS[type] || COLORS.error};color:#fff;padding:10px 14px;border-radius:8px;` +
    'font-size:13px;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,.25);' +
    'pointer-events:auto;cursor:pointer;font-family:inherit;white-space:pre-line;';
  el.onclick = () => el.remove();
  ensureContainer().appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, type === 'error' ? 6000 : 4000);
};

export const showErrorToast = (message) => showToast(message, 'error');
