import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

/** Mahalliy vaqt bo'yicha YYYY-MM-DD. `toISOString()` ATAYIN ishlatilmaydi -
 *  u UTC'ga o'tkazadi va UTC+5 da ertalabki sanani bir kun orqaga surardi. */
export const toDateKey = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Oy ko'rinishidagi kalendar. Brauzerning o'z `input[type=date]` oynasi
 * o'rniga ishlatiladi: u har brauzerda boshqacha ko'rinadi, dark mode'ni
 * qo'llab-quvvatlamaydi va qaysi kunlarda buyurtma borligini ko'rsatolmaydi.
 *
 * `markedDates` - buyurtma bor kunlar to'plami (Set). Ular nuqta bilan
 * belgilanadi, shunda administrator bo'sh kunga bekorga bosmaydi.
 */
const DatePickerPopover = ({ value, onSelect, onClose, markedDates }) => {
  const containerRef = useRef(null);
  const today = new Date();
  const todayKey = toDateKey(today);

  const initial = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Tashqariga bosilganda yoki Esc bosilganda yopiladi.
  useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    // JS'da yakshanba = 0; bizda hafta DUSHANBADAN boshlanadi.
    const leading = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const list = [];
    for (let i = 0; i < leading; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(viewYear, viewMonth, d));
    return list;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-2 z-50 w-[300px] p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-xl"
    >
      {/* Sarlavha */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-800 dark:text-white font-['Outfit']">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hafta kunlari */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={`text-center text-[9px] font-bold uppercase tracking-wider ${
              i >= 5 ? 'text-rose-400' : 'text-slate-400 dark:text-gray-500'
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Kunlar */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;

          const key = toDateKey(date);
          const isFuture = key > todayKey;
          const isSelected = key === value;
          const isToday = key === todayKey;
          const hasOrders = markedDates && markedDates.has(key);

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(key)}
              className={`relative h-8 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : isToday
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {date.getDate()}
              {hasOrders && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Pastki qator */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => onSelect(todayKey)}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition cursor-pointer"
        >
          Bugun
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-gray-400 hover:text-rose-500 transition cursor-pointer"
          >
            <X className="w-3 h-3" /> Tozalash
          </button>
        )}
      </div>
    </div>
  );
};

export default DatePickerPopover;
