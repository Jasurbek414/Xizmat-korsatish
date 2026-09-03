import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { showToast } from '../../services/toast';
import { Printer, Check, AlertTriangle, RotateCcw, Image as ImageIcon, X } from 'lucide-react';

const DEFAULT_FOOTER = "Xizmatimizdan foydalanganingiz uchun rahmat!";

const DEFAULTS = {
  receipt_paper_size: '58',
  receipt_header_text: '',
  receipt_show_address: true,
  receipt_show_phone: true,
  receipt_show_items: true,
  receipt_show_payment_method: true,
  receipt_show_order_number: true,
  receipt_show_employee_name: true,
  receipt_copies: 1,
  receipt_font_size: 'normal',
  receipt_logo_base64: '',
  receipt_footer_text: DEFAULT_FOOTER
};

const PREVIEW_LABELS = {
  uz: {
    service: 'Xizmat', client: 'Mijoz', address: 'Manzil', date: 'Sana',
    orderNo: 'Buyurtma №', employee: 'Xodim', total: 'JAMI', payment: "To'lov usuli",
    paymentValue: 'Naqd', item1: 'Gilam 1', item2: 'Gilam 2'
  },
  ru: {
    service: 'Услуга', client: 'Клиент', address: 'Адрес', date: 'Дата',
    orderNo: 'Заказ №', employee: 'Сотрудник', total: 'ИТОГО', payment: 'Способ оплаты',
    paymentValue: 'Наличные', item1: 'Ковёр 1', item2: 'Ковёр 2'
  }
};

// Rasmni max kenglikka moslab kichraytiradi va PNG data-url shaklida
// qaytaradi - baza ustunida (TEXT) va mobil ilova xotirasida keragidan
// katta rasm saqlanmasligi uchun (termal printer baribir past piksel
// zichligida chop etadi, katta rasm shart emas).
const resizeImageToDataUrl = (file, maxWidth = 300) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Rasm formatini aniqlab bo\'lmadi'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

// Chek (Bluetooth termal printer) sozlamalari - Sozlamalar menyusidagi
// alohida bo'lim. Haydovchi mobil ilovada to'lov qabul qilgach shu yerda
// belgilangan tarkib/o'lchamda chek chiqaradi (ReceiptService.dart,
// CompanyController.getReceiptSettings orqali o'qiladi).
const ReceiptSettings = ({ onDirtyChange }) => {
  const [settings, setSettings] = useState({ receipt_enabled: false, ...DEFAULTS });
  const savedRef = useRef({ receipt_enabled: false, ...DEFAULTS });
  const [companyName, setCompanyName] = useState('');
  // Chekda haqiqatda chop etiladigan manzil/telefon - kompaniyaning
  // umumiy ma'lumotlaridan (Sozlamalar > Umumiy) olinadi, bu yerda
  // TAHRIRLANMAYDI (faqat ko'rsatish/yashirish tanlanadi) - ko'rinish
  // panelida shu HAQIQIY qiymatlar aks etishi kerak, aks holda admin
  // "o'zgartirib bo'lmayapti" deb o'ylashi mumkin edi (avval bu yerda
  // qattiq yozilgan namuna matn ko'rsatilardi).
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewLang, setPreviewLang] = useState('uz');
  const fileInputRef = useRef(null);

  const applyData = (data) => ({
    receipt_enabled: !!data.receiptEnabled,
    receipt_paper_size: data.receiptPaperSize || '58',
    receipt_header_text: data.receiptHeaderText || '',
    receipt_show_address: data.receiptShowAddress != null ? data.receiptShowAddress : true,
    receipt_show_phone: data.receiptShowPhone != null ? data.receiptShowPhone : true,
    receipt_show_items: data.receiptShowItems != null ? data.receiptShowItems : true,
    receipt_show_payment_method: data.receiptShowPaymentMethod != null ? data.receiptShowPaymentMethod : true,
    receipt_show_order_number: data.receiptShowOrderNumber != null ? data.receiptShowOrderNumber : true,
    receipt_show_employee_name: data.receiptShowEmployeeName != null ? data.receiptShowEmployeeName : true,
    receipt_copies: data.receiptCopies || 1,
    receipt_font_size: data.receiptFontSize || 'normal',
    receipt_logo_base64: data.receiptLogoBase64 || '',
    receipt_footer_text: data.receiptFooterText || DEFAULT_FOOTER
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCompanySettings();
        setCompanyName(data.name || '');
        setCompanyAddress(data.address || '');
        setCompanyPhone(data.phone || '');
        const next = applyData(data);
        setSettings(next);
        savedRef.current = next;
      } catch (err) {
        console.error("Failed to load receipt settings:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isDirty = Object.keys(DEFAULTS).some(key => settings[key] !== savedRef.current[key]);

  // Sozlamalar sahifasidagi boshqa bo'limga (masalan "Umumiy") o'tishdan
  // oldin ota komponent (Settings.jsx) shu holatni bilib, tab almashtirishni
  // tasdiqlashi kerak bo'lsa so'rashi uchun.
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty]);

  // Brauzer sahifasini yopish/yangilashda saqlanmagan o'zgarishlar haqida
  // ogohlantirish - shu bo'lim uchun eng "og'ir" forma bo'lgani sabab
  // (logotip, ko'p checkbox) tasodifan yopib qo'yish xavfi yuqori.
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const toggleEnabled = async () => {
    const previous = settings.receipt_enabled;
    const next = !previous;
    setSettings(prev => ({ ...prev, receipt_enabled: next }));
    savedRef.current = { ...savedRef.current, receipt_enabled: next };
    try {
      await api.updateCompanySettings({ receiptEnabled: next });
      showToast(next ? "Chek chiqarish funksiyasi yoqildi" : "Chek chiqarish funksiyasi o'chirildi", 'success');
    } catch (err) {
      console.error("Failed to toggle receipt printing:", err);
      setSettings(prev => ({ ...prev, receipt_enabled: previous }));
      savedRef.current = { ...savedRef.current, receipt_enabled: previous };
      showToast(err.message || "Sozlamani saqlashda xatolik yuz berdi.");
    }
  };

  const buildPayload = (s) => ({
    receiptPaperSize: s.receipt_paper_size,
    receiptHeaderText: s.receipt_header_text,
    receiptShowAddress: s.receipt_show_address,
    receiptShowPhone: s.receipt_show_phone,
    receiptShowItems: s.receipt_show_items,
    receiptShowPaymentMethod: s.receipt_show_payment_method,
    receiptShowOrderNumber: s.receipt_show_order_number,
    receiptShowEmployeeName: s.receipt_show_employee_name,
    receiptCopies: s.receipt_copies,
    receiptFontSize: s.receipt_font_size,
    receiptLogoBase64: s.receipt_logo_base64,
    receiptFooterText: s.receipt_footer_text
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCompanySettings(buildPayload(settings));
      savedRef.current = { ...settings };
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update receipt settings:", err);
      showToast(err.message || "Sozlamalarni saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Barcha chek sozlamalari (matn, logotip, ko'rsatiladigan maydonlar) standart holatga qaytariladi. Davom etilsinmi?")) return;
    setSaving(true);
    try {
      await api.updateCompanySettings(buildPayload(DEFAULTS));
      const next = { ...settings, ...DEFAULTS };
      setSettings(next);
      savedRef.current = next;
      showToast("Chek sozlamalari standart holatga qaytarildi", 'success');
    } catch (err) {
      console.error("Failed to reset receipt settings:", err);
      showToast(err.message || "Standart holatga qaytarishda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast("Faqat rasm fayli yuklash mumkin.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setSettings(prev => ({ ...prev, receipt_logo_base64: dataUrl }));
    } catch (err) {
      showToast(err.message || "Rasmni qayta ishlashda xatolik yuz berdi.");
    }
  };

  const removeLogo = () => setSettings(prev => ({ ...prev, receipt_logo_base64: '' }));

  if (loading) {
    return <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-400">Yuklanmoqda...</div>;
  }

  const previewHeader = settings.receipt_header_text.trim() || companyName || 'Kompaniya nomi';
  const L = PREVIEW_LABELS[previewLang];
  const bodyFontSize = settings.receipt_font_size === 'large' ? '12px' : '10px';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold animate-fade-in">
      {/* Chap: sozlamalar formasi */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold animate-fade-in shadow-sm">
            <Check className="w-4 h-4 shrink-0" />
            <span>Sozlamalar saqlandi</span>
          </div>
        )}

        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Printer className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit']">
                  Chek chiqarish (Bluetooth printer)
                </h4>
                <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">
                  Haydovchi to'lovni qabul qilgach, ulangan termal printerga mijoz uchun chek chiqaradi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleEnabled}
              className={`relative shrink-0 w-11 h-6 rounded-full transition cursor-pointer ${settings.receipt_enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.receipt_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {!settings.receipt_enabled && (
            <p className="text-[9px] text-amber-600 flex items-center gap-1.5 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Funksiya o'chirilgan - haydovchilar ilovasida chek chiqarish ishlamaydi. Pastdagi sozlamalarni baribir tahrirlashingiz mumkin, faqat yoqilgandan keyin qo'llaniladi.
            </p>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Qog'oz o'lchami</label>
                <div className="grid grid-cols-2 gap-2">
                  {['58', '80'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSettings({ ...settings, receipt_paper_size: size })}
                      className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                        settings.receipt_paper_size === size ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {size} mm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Shrift o'lchami</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'normal', l: 'Oddiy' }, { v: 'large', l: 'Katta' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSettings({ ...settings, receipt_font_size: v })}
                      className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                        settings.receipt_font_size === v ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Kompaniya logotipi</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 flex items-center justify-center overflow-hidden shrink-0">
                  {settings.receipt_logo_base64 ? (
                    <img src={settings.receipt_logo_base64} alt="Logotip" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    Rasm tanlash
                  </button>
                  {settings.receipt_logo_base64 && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/5 transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> O'chirish
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoPick} className="hidden" />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Chekning yuqorisida, sarlavhadan oldin qora-oq holda chop etiladi.</p>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Chek sarlavhasi</label>
              <input
                type="text"
                value={settings.receipt_header_text}
                onChange={(e) => setSettings({ ...settings, receipt_header_text: e.target.value })}
                placeholder={companyName || 'Bo\'sh qoldirilsa kompaniya nomi ishlatiladi'}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-2">Chekda ko'rsatiladigan ma'lumotlar</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'receipt_show_address', label: 'Manzil' },
                  { key: 'receipt_show_phone', label: 'Telefon' },
                  { key: 'receipt_show_items', label: 'Buyurtma tarkibi (mahsulotlar)' },
                  { key: 'receipt_show_payment_method', label: "To'lov usuli (Naqd/Karta)" },
                  { key: 'receipt_show_order_number', label: 'Buyurtma raqami' },
                  { key: 'receipt_show_employee_name', label: 'Xodim ismi (kim qabul qildi)' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-white/2 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                      className="cursor-pointer"
                    />
                    <span className="text-slate-600 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-2">
                Manzil va telefon qiymatlari "Sozlamalar → Umumiy" bo'limidagi kompaniya ma'lumotidan olinadi - bu yerda faqat chekda ko'rsatish/yashirish tanlanadi.
              </p>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Nusxalar soni (bir bosishda)</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, receipt_copies: Math.max(1, prev.receipt_copies - 1) }))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{settings.receipt_copies}</span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, receipt_copies: Math.min(5, prev.receipt_copies + 1) }))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  +
                </button>
                <span className="text-[9px] text-slate-400 dark:text-gray-500 ml-1">masalan: 1-mijoz, 1-kompaniya arxivi uchun</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Pastki matn (mijozga rahmat xabari)</label>
              <input
                type="text"
                value={settings.receipt_footer_text}
                onChange={(e) => setSettings({ ...settings, receipt_footer_text: e.target.value })}
                placeholder={DEFAULT_FOOTER}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : (isDirty ? 'Saqlash *' : 'Saqlash')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              title="Standart holatga qaytarish"
              className="px-3.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-red-500 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* O'ng: jonli ko'rinish (preview) - qog'oz o'lchamiga qarab kengligi o'zgaradi */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Ko'rinishi (namuna)
            </p>
            <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-0.5">
              {['uz', 'ru'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPreviewLang(lang)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                    previewLang === lang ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 dark:text-gray-500'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm p-5 flex justify-center">
            <div
              className="bg-white text-black font-mono shadow-lg"
              style={{
                width: settings.receipt_paper_size === '80' ? '280px' : '210px',
                padding: '14px 10px',
                fontSize: bodyFontSize,
                lineHeight: 1.5
              }}
            >
              {settings.receipt_logo_base64 && (
                <div className="flex justify-center mb-1.5">
                  <img src={settings.receipt_logo_base64} alt="Logotip" style={{ maxWidth: '80px', maxHeight: '60px', objectFit: 'contain', filter: 'grayscale(1)' }} />
                </div>
              )}
              <p className="text-center font-bold" style={{ fontSize: '13px' }}>{previewHeader}</p>
              {settings.receipt_show_address && (
                <p className="text-center">{companyAddress || '(manzil kiritilmagan)'}</p>
              )}
              {settings.receipt_show_phone && (
                <p className="text-center">{companyPhone || '(telefon kiritilmagan)'}</p>
              )}
              <div className="border-t border-dashed border-black my-1.5" />
              {settings.receipt_show_order_number && (
                <p>{L.orderNo}: A3F92C1D</p>
              )}
              <p>{L.service}: Gilam yuvish</p>
              <p>{L.client}: Aliyev Vali</p>
              <p>{L.address}: Yunusobod, 12-uy</p>
              <p>{L.date}: 03.09.2026 14:20</p>
              <div className="border-t border-dashed border-black my-1.5" />
              {settings.receipt_show_items && (
                <>
                  <div className="flex justify-between"><span>{L.item1}</span><span>1</span></div>
                  <div className="flex justify-between"><span>{L.item2}</span><span>1</span></div>
                  <div className="border-t border-dashed border-black my-1.5" />
                </>
              )}
              <div className="flex justify-between font-bold" style={{ fontSize: '13px' }}>
                <span>{L.total}</span><span>145 000 so'm</span>
              </div>
              {settings.receipt_show_payment_method && (
                <p className="mt-1">{L.payment}: {L.paymentValue}</p>
              )}
              {settings.receipt_show_employee_name && (
                <p>{L.employee}: Shuxrat</p>
              )}
              {settings.receipt_footer_text.trim() && (
                <>
                  <div className="border-t border-dashed border-black my-1.5" />
                  <p className="text-center">{settings.receipt_footer_text}</p>
                </>
              )}
            </div>
          </div>
          {settings.receipt_copies > 1 && (
            <p className="text-[9px] text-slate-400 dark:text-gray-500 text-center">
              Har bosishda {settings.receipt_copies} nusxa chop etiladi
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;
