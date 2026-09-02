import React from 'react';

// Sahifa ma'lumotlari yuklanayotganda ko'rsatiladigan umumiy indikator.
//
// NEGA KERAK (2026-08-10 audit, №5): asosiy sahifalarda loading holati umuman
// yo'q edi - ma'lumot kelguncha bo'sh jadval ko'rinib, sekin tarmoqda
// "ma'lumot yo'q" deb adashtirardi. Bitta umumiy komponent - barcha
// sahifalarda bir xil ko'rinish uchun.
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-3">
    <div className="w-8 h-8 rounded-full border-3 border-indigo-500/25 border-t-indigo-500 animate-spin" />
    <span className="text-xs font-semibold text-slate-400 dark:text-gray-500">
      Yuklanmoqda...
    </span>
  </div>
);

export default PageLoader;
