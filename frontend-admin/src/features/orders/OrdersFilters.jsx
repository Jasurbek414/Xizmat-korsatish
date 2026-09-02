import React, { useState, useMemo } from 'react';
import { Search, CalendarDays, X, Plus, Package, Wallet, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DatePickerPopover, { toDateKey } from '../../components/DatePickerPopover';

const OrdersFilters = ({
  search, setSearch,
  selectedStatusId, setSelectedStatusId,
  statuses, orders,
  selectedDate, setSelectedDate,
  onAddOrderForDate
}) => {
  const { t } = useTranslation();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Kalendarda nuqta bilan belgilanadigan kunlar - buyurtma bor kunlar.
  const markedDates = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      if (!o.created_at) continue;
      const d = new Date(o.created_at);
      if (!Number.isNaN(d.getTime())) set.add(toDateKey(d));
    }
    return set;
  }, [orders]);

  // Tanlangan kun bo'yicha hisobot ko'rsatkichlari.
  const dayReport = useMemo(() => {
    if (!selectedDate) return null;

    const dayOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return !Number.isNaN(d.getTime()) && toDateKey(d) === selectedDate;
    });

    const total = dayOrders.reduce((sum, o) => sum + Number(o.price ?? 0), 0);
    const collected = dayOrders.reduce((sum, o) => sum + Number(o.collected_price ?? 0), 0);
    const paidCount = dayOrders.filter(o => (o.payment_status || '').toUpperCase() === 'PAID').length;

    return {
      count: dayOrders.length,
      total,
      collected,
      remaining: Math.max(0, total - collected),
      paidCount
    };
  }, [orders, selectedDate]);

  const formatted = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const money = (v) => Number(v || 0).toLocaleString('uz-UZ');

  return (
    <div className="space-y-4">
      {/* Qidiruv + kalendar */}
      <div className="glass-card px-4 py-3 rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm relative">
        <Search className="w-4 h-4 text-slate-400 dark:text-gray-500 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mijoz, telefon, manzil, xodim yoki xizmat bo'yicha qidirish..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
        />

        {selectedDate && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold whitespace-nowrap">
            {formatted}
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              title="Sana filtrini olib tashlash"
              className="hover:text-rose-500 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setCalendarOpen(v => !v)}
            title="Sana bo'yicha filtrlash"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              selectedDate || calendarOpen
                ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          {calendarOpen && (
            <DatePickerPopover
              value={selectedDate}
              markedDates={markedDates}
              onClose={() => setCalendarOpen(false)}
              onSelect={(key) => {
                setSelectedDate(key);
                setCalendarOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Tanlangan kun paneli: hisobot + shu kunga qo'shish */}
      {selectedDate && dayReport && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-white font-['Outfit']">
                {formatted}
              </span>
            </div>
            <button
              type="button"
              onClick={onAddOrderForDate}
              className="premium-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold text-white cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Shu kunga buyurtma qo'shish
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <ReportTile icon={Package} label="Buyurtmalar" value={`${dayReport.count} ta`} tone="indigo" />
            <ReportTile icon={Wallet} label="Jami summa" value={`${money(dayReport.total)} so'm`} tone="slate" />
            <ReportTile icon={CheckCircle2} label="Yig'ilgan" value={`${money(dayReport.collected)} so'm`} tone="emerald" />
            <ReportTile icon={Clock} label="Qoldiq" value={`${money(dayReport.remaining)} so'm`} tone="amber" />
          </div>

          <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
            Shu holatda qo'shilgan buyurtma <strong>{formatted}</strong> sanasi bilan yoziladi —
            ro'yxatdan tushib qolgan eski buyurtmani kiritish uchun shundan foydalaning.
          </p>
        </div>
      )}

      {/* Statuslar */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 w-fit">
        <button
          onClick={() => setSelectedStatusId('all')}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            selectedStatusId === 'all'
              ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
          }`}
        >
          {t('orders_page.all_orders')} ({orders.length})
        </button>
        {statuses.map(st => {
          const count = orders.filter(o => o.status_id === st.id).length;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStatusId(st.id)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusId === st.id
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm border-l-2'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
              }`}
              style={selectedStatusId === st.id ? { borderLeftColor: st.color_code } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color_code }}></span>
              {st.name_uz} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TONES = {
  indigo: 'text-indigo-600 dark:text-indigo-400',
  slate: 'text-slate-700 dark:text-gray-200',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400'
};

const ReportTile = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/2 px-3 py-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3 h-3 ${TONES[tone]}`} />
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">{label}</span>
    </div>
    <p className={`text-xs font-extrabold font-['Outfit'] truncate ${TONES[tone]}`} title={value}>
      {value}
    </p>
  </div>
);

export default OrdersFilters;
