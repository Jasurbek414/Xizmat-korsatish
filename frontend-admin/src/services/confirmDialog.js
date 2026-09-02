// Promise-asosli tasdiqlash modali - window.confirm() o'rnini bosadi.
//
// NEGA KERAK (2026-08-10 audit, №7): 12 joyda brauzerning standart confirm()
// oynasi ishlatilardi - tizim dizayniga yot ko'rinadi va butun sahifani
// bloklaydi. Bu modul React daraxtidan TASHQARIDA (vanilla DOM) ishlaydi,
// chunki chaqiruvchi joylarning ba'zilari hook konteksti bo'lmagan joylar
// (masalan useSipPhone.js) - toast.js bilan bir xil yondashuv.
//
// Ishlatish:  if (!(await confirmDialog("Rostdan o'chirasizmi?"))) return;

const isDark = () => document.documentElement.classList.contains('dark');

export const confirmDialog = (message, { okText, cancelText, danger = true } = {}) => {
  return new Promise((resolve) => {
    const dark = isDark();

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,.55);padding:16px;';

    const card = document.createElement('div');
    card.style.cssText =
      `background:${dark ? '#111827' : '#ffffff'};color:${dark ? '#f3f4f6' : '#1e293b'};` +
      'border-radius:16px;padding:20px;max-width:380px;width:100%;' +
      'box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:inherit;' +
      `border:1px solid ${dark ? 'rgba(255,255,255,.08)' : '#e2e8f0'};`;

    const text = document.createElement('p');
    text.textContent = message;
    text.style.cssText =
      'margin:0 0 16px;font-size:13.5px;line-height:1.55;font-weight:600;white-space:pre-line;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const mkBtn = (label, bg, color) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        `background:${bg};color:${color};border:none;border-radius:10px;` +
        'padding:8px 16px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;';
      return b;
    };

    const cancelBtn = mkBtn(
      cancelText || 'Bekor qilish',
      dark ? 'rgba(255,255,255,.08)' : '#f1f5f9',
      dark ? '#d1d5db' : '#475569'
    );
    const okBtn = mkBtn(
      okText || 'Tasdiqlash',
      danger ? '#dc2626' : '#4f46e5',
      '#ffffff'
    );

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };

    cancelBtn.onclick = () => close(false);
    okBtn.onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    document.addEventListener('keydown', onKey);

    row.append(cancelBtn, okBtn);
    card.append(text, row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
};
