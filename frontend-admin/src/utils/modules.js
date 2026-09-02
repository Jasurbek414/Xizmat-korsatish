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

export const DEFAULT_PERMS = {
  clients: true, employees: true, orders: true, finance: true,
  salaries: true, settings: true, map: true, telephony: true
};

// Rol hali yuklanmagan (so'rov ketmoqda) YOKI yuklash MUVAFFAQIYATSIZ
// bo'lgan holat uchun - hech narsa ma'lum emas. MUHIM (audit'da topilgan,
// xavfsizlik): avval bu holatda DEFAULT_PERMS (hammasi true) qaytarilardi -
// App.jsx'dagi getRoles() muvaffaqiyatsiz bo'lsa (tarmoq uzilishi va h.k.)
// `roles` bo'sh qolib, roleObj topilmay, HAR BIR rol (jumladan Bugalter,
// Dispetcher) sidebar'da BARCHA modullarni (shu jumladan Sozlamalar) ko'rar
// edi - haqiqiy so'rovlar backend'da baribir 403 bo'lardi, lekin bu
// chalg'ituvchi va mobil ilovaning fail-closed xatti-harakatiga zid edi.
const EMPTY_PERMS = {
  clients: false, employees: false, orders: false, finance: false,
  salaries: false, settings: false, map: false, telephony: false
};

// roleObj - RoleController'dan kelgan backend Role yozuvi (yoki topilmasa null).
export function getPerms(roleObj) {
  if (!roleObj) return EMPTY_PERMS;
  return {
    ...DEFAULT_PERMS,
    ...roleObj.permissions,
    // MUHIM (audit'da topilgan): avval "!== false" edi - ruxsat kaliti umuman
    // BERILMAGAN (undefined) rollar uchun ham menyuda "Telefoniya" ko'rinib,
    // lekin backend @perm.has('telephony') buni rad etib har bir so'rov 403
    // bilan tugardi. Menyu endi backend qoidasi bilan BIR XIL: faqat aniq
    // "true" bo'lsa ko'rinadi.
    telephony: roleObj.permissions.telephony === true
  };
}

export function getRoleLabel(roleObj, fallbackRole, language) {
  if (!roleObj) return fallbackRole;
  const key = `name${language.charAt(0).toUpperCase()}${language.slice(1)}`;
  return roleObj[key] || roleObj.nameUz;
}
