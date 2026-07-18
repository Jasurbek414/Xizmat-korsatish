import React from 'react';

// Tailwind JIT dinamik `bg-${x}` ni ko'rmaydi - shuning uchun har bir holat
// uchun TO'LIQ literal sinf satrlari.
const TRUNK_MAP = {
  REGISTERED: { badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500 animate-pulse', label: 'Ulandi (Faol)' },
  REGISTERING: { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500 animate-pulse', label: "Ro'yxatdan o'tmoqda..." },
  FAILED: { badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20', dot: 'bg-rose-500', label: 'Ulanmadi (xato)' },
  UNREGISTERED: { badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20', dot: 'bg-slate-400', label: 'Ulanmagan' },
  UNKNOWN: { badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20', dot: 'bg-slate-400', label: 'Tekshirilmoqda...' },
};

// HAQIQIY trunk (UzTelecom raqami) holati - backend FreeSWITCH'ning o'zidan
// so'raydi. Bu tashqi mijozlar bilan qo'ng'iroq qilish imkoniyatini bildiradi.
const TrunkBadge = ({ status }) => {
  const s = TRUNK_MAP[status] || TRUNK_MAP.UNKNOWN;
  return (
    <span className={`${s.badge} border px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span> {s.label}
    </span>
  );
};

// Brauzerning ichki extension (mikrofon/audio) holati - trunkStatus dan FARQLI.
const BridgeBadge = ({ status }) => {
  if (status === 'REGISTERED') {
    return (
      <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Ulandi
      </span>
    );
  }
  if (status === 'CONNECTING') {
    return (
      <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Ulanmoqda...
      </span>
    );
  }
  if (status === 'ERROR') {
    return (
      <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Xatolik
      </span>
    );
  }
  return (
    <span className="bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> O'chirilgan
    </span>
  );
};

const TelephonyStatusBar = ({ trunkStatus, trunkUsername, bridgeStatus }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Telefoniya & Aloqa</h2>
      <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Uztelecom SIP orqali mijozlar bilan to'g'ridan-to'g'ri brauzerda gaplashish bo'limi.</p>
    </div>

    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Trunk{trunkUsername ? ` (${trunkUsername})` : ''}:</span>
        <TrunkBadge status={trunkStatus} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Brauzer:</span>
        <BridgeBadge status={bridgeStatus} />
      </div>
    </div>
  </div>
);

export default TelephonyStatusBar;
