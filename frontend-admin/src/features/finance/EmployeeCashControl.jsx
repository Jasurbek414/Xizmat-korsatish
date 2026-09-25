import React, { useMemo } from 'react';
import { Users, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

// Kompaniya egasi/buxgalter "hozir aynan kimning qo'lida qancha pul bor"
// degan savolga BIR QARASHDA javob topishi kerak edi - avval faqat
// buyurtma-buyurtma ro'yxat bor edi (pastda saqlanadi), xodim bo'yicha
// JAMLANGAN ko'rinish yo'q edi. Bu komponent xuddi shu ma'lumotdan
// (allaqachon yuklangan pendingHandovers) xodim kesimida guruhlab,
// eng UZOQ vaqt ushlab turilgan (24 soatdan oshgan - kechikkan) holatlarni
// alohida belgilaydi - bu moliyaviy nazoratning eng muhim qismi, chunki
// naqd pul qancha uzoq xodim qo'lida qolsa, yo'qotish/firibgarlik xavfi
// shuncha yuqori.
const EmployeeCashControl = ({ pendingHandovers = [] }) => {
  const grouped = useMemo(() => {
    const map = new Map();
    const now = Date.now();

    pendingHandovers.forEach(o => {
      const workerId = o.worker ? o.worker.id : 'unknown';
      const workerName = o.worker ? o.worker.fullName : "Noma'lum xodim";
      // `paymentCollectedAt` - pul QAChon qabul qilingani, ANIQ shu payt
      // uchun qo'shilgan maydon. Eski (bu maydon qo'shilishidan oldingi)
      // yozuvlarda bo'sh bo'lishi mumkin - shundagina `updatedAt`ga
      // qaytiladi (aniqlik bir oz kamroq, lekin hech narsa ko'rsatilmasligi
      // bilan solishtirganda ancha yaxshi).
      const collectedAt = o.paymentCollectedAt || o.updatedAt || o.createdAt;
      const ageHours = collectedAt ? (now - new Date(collectedAt).getTime()) / 3600000 : 0;

      if (!map.has(workerId)) {
        map.set(workerId, { id: workerId, name: workerName, count: 0, sum: 0, oldestAgeHours: 0 });
      }
      const entry = map.get(workerId);
      entry.count += 1;
      entry.sum += (o.collectedPrice || 0);
      if (ageHours > entry.oldestAgeHours) entry.oldestAgeHours = ageHours;
    });

    return Array.from(map.values()).sort((a, b) => b.sum - a.sum);
  }, [pendingHandovers]);

  if (grouped.length === 0) return null;

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">
            Xodimlar bo'yicha kassa nazorati
          </h4>
          <p className="text-[9px] text-slate-400 dark:text-gray-500 font-medium">
            Har bir xodim hozir qo'lida qancha mijoz puli ushlab turganini ko'rsatadi - 24 soatdan ortiq
            topshirilmagan summalar alohida belgilanadi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grouped.map(e => {
          const overdue = e.oldestAgeHours > 24;
          return (
            <div
              key={e.id}
              className={`p-3 rounded-xl border space-y-1.5 ${
                overdue
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-extrabold text-slate-700 dark:text-gray-200 truncate text-[11px]">{e.name}</span>
                {overdue && (
                  <span className="flex items-center gap-1 text-[8px] font-extrabold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5" /> KECHIKKAN
                  </span>
                )}
              </div>
              <p className="text-lg font-extrabold font-['Outfit'] text-amber-600">
                {formatCurrency(e.sum, 'uz')}
              </p>
              <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-gray-500 font-semibold">
                <span>{e.count} ta buyurtma</span>
                <span className={`flex items-center gap-1 ${overdue ? 'text-rose-500 font-bold' : ''}`}>
                  <Clock className="w-2.5 h-2.5" />
                  {e.oldestAgeHours < 1 ? "1 soatdan kam" : `${Math.floor(e.oldestAgeHours)} soatdan beri`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeCashControl;
