import { Users, ShoppingCart, DollarSign, UserCog, Wallet, Map, PhoneCall, Settings2 } from 'lucide-react';

// Kompaniya panelidagi modullar ro'yxati - Sidebar navigatsiyasi va login'dan
// keyingi rol tasdiqlash sahifasi (RoleLandingPage) AYNAN shu bitta ro'yxatdan
// foydalanadi, aks holda ikkalasi asta-sekin bir-biridan chetlashib ketardi.
export const MODULE_DEFS = [
  { id: 'clients', labelKey: 'menu.clients', icon: Users },
  { id: 'orders', labelKey: 'menu.orders', icon: ShoppingCart },
  { id: 'finance', labelKey: 'menu.finance', icon: DollarSign },
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

// roleObj - RoleController'dan kelgan backend Role yozuvi (yoki topilmasa null).
export function getPerms(roleObj) {
  if (!roleObj) return DEFAULT_PERMS;
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
