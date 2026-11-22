import { Users, ShoppingCart, DollarSign, UserCog, Wallet, Map, Settings2, FileBarChart } from 'lucide-react';

// Kompaniya panelidagi modullar ro'yxati - Sidebar navigatsiyasi va login'dan
// keyingi rol tasdiqlash sahifasi (RoleLandingPage) AYNAN shu bitta ro'yxatdan
// foydalanadi.
export const MODULE_DEFS = [
  { id: 'clients', labelKey: 'menu.clients', icon: Users },
  { id: 'orders', labelKey: 'menu.orders', icon: ShoppingCart },
  { id: 'finance', labelKey: 'menu.finance', icon: DollarSign },
  { id: 'reports', labelKey: 'menu.reports', icon: FileBarChart, permKey: 'finance' },
  { id: 'employees', labelKey: 'menu.employees', icon: UserCog },
  { id: 'salaries', labelKey: 'menu.salaries', icon: Wallet },
  { id: 'map', labelKey: 'menu.map', icon: Map },
  { id: 'settings', labelKey: 'menu.settings', icon: Settings2 }
];

// Rol hali yuklanmagan holat uchun bo'sh ruxsatlar
const EMPTY_PERMS = {
  clients: false, employees: false, orders: false, finance: false,
  salaries: false, settings: false, map: false
};

/**
 * Modul identifikatoridan uni ochadigan RUXSAT kalitiga (masalan `reports` -> `finance`).
 */
export function permKeyOf(moduleId) {
  const def = MODULE_DEFS.find(m => m.id === moduleId);
  return (def && def.permKey) || moduleId;
}

// roleObj - RoleController'dan kelgan backend Role yozuvi
export function getPerms(roleObj) {
  if (!roleObj || !roleObj.permissions) return EMPTY_PERMS;

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
