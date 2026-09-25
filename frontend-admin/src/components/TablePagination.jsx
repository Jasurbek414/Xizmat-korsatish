import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Jadval sahifalash mantig'i. Ro'yxatni kesib beradi va sahifa holatini
 * boshqaradi - jadval komponentlari faqat `pageItems` ni chizadi.
 *
 * Filtr/qidiruv natijasi qisqarganda joriy sahifa mavjud bo'lmay qolishi
 * mumkin (masalan 7-sahifada turib qidiruv 3 ta natija qoldirsa) - bunda
 * jadval BO'SH ko'rinardi va foydalanuvchi "yozuvlar yo'qoldi" deb o'ylardi.
 * Shuning uchun chegaradan chiqqanda oxirgi mavjud sahifaga qaytariladi.
 */
export const usePagination = (items, defaultSize = 25) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;

  const pageItems = useMemo(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, startIndex, pageSize]
  );

  return { page: safePage, setPage, pageSize, setPageSize, pageCount, total, startIndex, pageItems };
};

/**
 * Sahifa raqamlari: har doim birinchi va oxirgi, joriy sahifaning atrofi,
 * orasida "…". Yozuvlar soni o'sib ketganda (masalan 80 sahifa) tugmalar
 * qatori ekranga sig'may ketmasligi uchun.
 */
const getPageNumbers = (current, count) => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(count - 1, current + 1);

  if (from > 2) pages.push('...');
  for (let i = from; i <= to; i++) pages.push(i);
  if (to < count - 1) pages.push('...');
  pages.push(count);

  return pages;
};

const TablePagination = ({ page, setPage, pageSize, setPageSize, pageCount, total, startIndex }) => {
  const { t } = useTranslation();

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-gray-400">
        <span>
          {t('common.showing_range', {
            from: startIndex + 1,
            to: Math.min(startIndex + pageSize, total),
            total
          })}
        </span>
        <select
          value={pageSize}
          onChange={(e) => {
            // O'lcham o'zgarganda 1-sahifaga qaytamiz, aks holda foydalanuvchi
            // mavjud bo'lmagan sahifada qolib ketardi.
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="glass-input rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-white focus:outline-none cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>
              {t('common.per_page', { size })}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('common.prev_page')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {getPageNumbers(page, pageCount).map((item, i) =>
          item === '...' ? (
            <span key={`gap-${i}`} className="px-1.5 text-[11px] font-bold text-slate-400 dark:text-gray-600">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              className={`min-w-[28px] px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                item === page
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => setPage(p => Math.min(pageCount, p + 1))}
          disabled={page === pageCount}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('common.next_page')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
