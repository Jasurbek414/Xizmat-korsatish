import { Users, ShoppingCart, DollarSign, UserCog, Wallet, Map, PhoneCall, Settings2, FileBarChart } from 'lucide-react';

// Kompaniya panelidagi modullar ro'yxati - Sidebar navigatsiyasi va login'dan
// keyingi rol tasdiqlash sahifasi (RoleLandingPage) AYNAN shu bitta ro'yxatdan
// foydalanadi, aks holda ikkalasi asta-sekin bir-biridan chetlashib ketardi.
export const MODULE_DEFS = [
  { id: 'clients', labelKey: 'menu.clients', icon: Users },
  { id: 'orders', labelKey: 'menu.orders', icon: ShoppingCart },
  { id: 'finance', labelKey: 'menu.finance', icon: DollarSign },
  // Buxgalteriya bilan bir xil 'finance' ruxsatidan foydalanadi - xuddi shu
  // ma'lumotlarning faqat sana oralig'i bo'yicha hisobot ko'rinishi, alohida
  // ruxsat kaliti kerak emas (mavjud rollarni qayta sozlash shart bo'lmaydi).
  { id: 'reports', labelKey: 'menu.reports', icon: FileBarChart, permKey: 'finance' },
  { id: 'employees', labelKey: 'menu.employees', icon: UserCog },
  { id: 'salaries', labelKey: 'menu.salaries', icon: Wallet },
  { id: 'map', labelKey: 'menu.map', icon: Map },
  { id: 'telephony', labelKey: 'menu.telephony', icon: PhoneCall },
  { id: 'settings', labelKey: 'menu.settings', icon: Settings2 }
];

// Rol hali yuklanmagan (so'rov ketmoqda) YOKI yuklash MUVAFFAQIYATSIZ
// bo'lgan holat uchun - hech narsa ma'lum emas. MUHIM (audit'da topilgan,
// xavfsizlik): avval bu holatda hammasi `true` bo'lgan xarita qaytarilardi -
// App.jsx'dagi getRoles() muvaffaqiyatsiz bo'lsa (tarmoq uzilishi va h.k.)
// `roles` bo'sh qolib, roleObj topilmay, HAR BIR rol (jumladan Bugalter,
// Dispetcher) sidebar'da BARCHA modullarni (shu jumladan Sozlamalar) ko'rar
// edi - haqiqiy so'rovlar backend'da baribir 403 bo'lardi, lekin bu
// chalg'ituvchi va mobil ilovaning fail-closed xatti-harakatiga zid edi.
const EMPTY_PERMS = {
  clients: false, employees: false, orders: false, finance: false,
  salaries: false, settings: false, map: false, telephony: false
};

/**
 * Modul identifikatoridan uni ochadigan RUXSAT kalitiga (masalan
 * `reports` -> `finance`). Sidebar ham, App.jsx'dagi tab qo'riqchisi ham
 * shu bitta funksiyadan foydalanadi - avval qo'riqchi `permKey`ni umuman
 * bilmasdi va "Hisobotlar" tabini hech qachon to'smasdi.
 */
export function permKeyOf(moduleId) {
  const def = MODULE_DEFS.find(m => m.id === moduleId);
  return (def && def.permKey) || moduleId;
}

// roleObj - RoleController'dan kelgan backend Role yozuvi (yoki topilmasa null).
export function getPerms(roleObj) {
  if (!roleObj || !roleObj.permissions) return EMPTY_PERMS;

  // MUHIM (2026-09-09 auditda topilgan): avval bu yerda avval hammasi `true`
  // bo'lgan asos xarita yoyilib, ustidan saqlangan qiymatlar qo'yilardi.
  // Ya'ni rolning saqlangan xaritasida biror kalit UMUMAN bo'lmasa (masalan
  // yangi modul kaliti qo'shilgan, lekin eski rol bir marta ham qayta
  // saqlanmagan), o'sha modul menyuda HAMMAGA ochiq qolardi - "Sozlamalar"
  // bo'limi ham. Bu xato `telephony` uchun bir marta topilib alohida
  // tuzatilgan edi, lekin qolgan 7 modul e'tibordan chetda qolgan edi.
  //
  // Endi har bir modul uchun ANIQ `true` talab qilinadi - backend'dagi
  // `@perm.has(...)` va mobil ilovadagi `Permissions.has()` bilan bir xil.
  const perms = {};
  for (const key of Object.keys(EMPTY_PERMS)) {
    perms[key] = roleObj.permissions[key] === true;
  }
  return perms;
}

export function getRoleLabel(roleObj, fallbackRole, language) {
  if (!roleObj) return fallbackRole;
  const key = `name${language.charAt(0).toUpperCase()}${language.slice(1)}`;
  return roleObj[key] || roleObj.nameUz;
}
