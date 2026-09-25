import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCircle, AlertTriangle, Info, XCircle, X, Megaphone, Package } from 'lucide-react';
import { api } from '../services/api';

// MUHIM (2026-08-10 auditda topilgan, tuzatildi): bu komponent avval mockDb/
// localStorage'dan o'qirdi - ya'ni qo'ng'iroqchadagi "bildirishnomalar" faqat
// shu brauzerda mavjud soxta yozuvlar edi (ichida hatto tasodifiy demo
// hodisalar generatori ham bor edi). Endi backend'dagi HAQIQIY
// NotificationController (auth_sessions emas, app_notifications jadvali)
// bilan ishlaydi - mobil ilovaning qo'ng'iroqchasi bilan BIR XIL manba.
//
// "Hammasini tozalash" tugmasi ATAYIN olib tashlandi: backendda o'chirish
// endpointi yo'q (tarix ataylab saqlanadi), faqat o'qilgan deb belgilash bor.

// Yangi bildirishnomani ko'rish uchun so'rov oralig'i. WebSocket ATAYIN
// ishlatilmagan: /ws/telephony faqat telefoniya hodisalari uchun, umumiy
// hodisa kanali yo'q - 60s polling bu bo'lim uchun yetarli va arzon.
const POLL_INTERVAL_MS = 60000;

const NotificationCenter = () => {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const dropdownRef = useRef(null);
  // Oxirgi ko'rilgan eng yangi bildirishnoma - yangi kelganini aniqlash uchun.
  // null = hali birinchi yuklash bo'lmagan (birinchi yuklashda toast chiqmaydi,
  // aks holda sahifa ochilishi bilan eski o'qilmaganlar "yangi" bo'lib yog'ilardi).
  const lastNewestIdRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      const items = data.items || [];
      setNotifications(items);

      if (items.length > 0) {
        const newest = items[0];
        const isFirstLoad = lastNewestIdRef.current === null;
        if (!isFirstLoad && newest.id !== lastNewestIdRef.current && !newest.read) {
          setToasts(prev => {
            if (prev.some(x => x.id === newest.id)) return prev;
            return [...prev, newest];
          });
          setTimeout(() => {
            setToasts(prev => prev.filter(x => x.id !== newest.id));
          }, 4500);
        }
        lastNewestIdRef.current = newest.id;
      } else if (lastNewestIdRef.current === null) {
        // Bo'sh ro'yxat ham "birinchi yuklash bo'ldi" degani.
        lastNewestIdRef.current = '';
      }
    } catch {
      // authFetch/handleResponse xatoni o'zi toast qiladi; qo'ng'iroqcha
      // sahifani buzmasligi kerak - mavjud ro'yxat o'z holicha qoladi.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, POLL_INTERVAL_MS);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    // Optimistik yangilash: serverga yuborib, UI'ni darhol yangilaymiz -
    // xato bo'lsa keyingi polling haqiqiy holatni qaytaradi.
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (item) => {
    if (item.read) return;
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    try {
      await api.markNotificationRead(item.id);
    } catch {
      loadNotifications();
    }
  };

  const handleRemoveToast = (id) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  };

  // Helper to format dynamic date string into 'time ago'
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return i18n.language === 'uz' ? 'Hozirgina' : i18n.language === 'ru' ? 'Только что' : 'Just now';
    if (mins < 60) return i18n.language === 'uz' ? `${mins} daqiqa oldin` : i18n.language === 'ru' ? `${mins} мин. назад` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return i18n.language === 'uz' ? `${hours} soat oldin` : i18n.language === 'ru' ? `${hours} ч. назад` : `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Backend turlari: ORDER_ASSIGNED, APP_UPDATE, COMPANY_ANNOUNCEMENT
  // (PushNotificationService'dagi saveNotification chaqiruvlariga qarang).
  const renderIcon = (type) => {
    switch (type) {
      case 'ORDER_ASSIGNED':
        return <Package className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'COMPANY_ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'APP_UPDATE':
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'ERROR':
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Icon */}
      <button
        onClick={handleToggle}
        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-500 border border-white dark:border-slate-800 text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Window */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-2xl p-4 z-50 animate-scale-in text-xs font-semibold space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
            <h4 className="text-sm font-extrabold text-slate-850 dark:text-white font-['Outfit'] flex items-center gap-1.5">
              <span>{t('notifications_center.title')}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[9px] font-extrabold">
                  {unreadCount} yangi
                </span>
              )}
            </h4>
          </div>

          {/* List Content */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="py-8 text-center text-slate-400 dark:text-gray-500 font-medium animate-pulse">
                ...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-gray-500 font-medium">
                {t('notifications_center.empty')}
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex gap-2.5 items-start ${
                    item.read
                      ? 'bg-slate-50/50 dark:bg-white/1 border-slate-100 dark:border-transparent opacity-65'
                      : 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 hover:bg-indigo-500/8'
                  }`}
                >
                  {renderIcon(item.type)}
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className={`font-bold text-slate-800 dark:text-white truncate ${!item.read ? 'text-[11px]' : ''}`}>
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal line-clamp-2">
                      {item.body}
                    </p>
                    <span className="text-[8px] text-slate-400 dark:text-gray-500 block font-medium">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mark all as read button footer */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 py-2 rounded-xl text-[10px] font-extrabold transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('notifications_center.mark_read')}</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Toast Notification HUD inside a portal */}
      {createPortal(
        <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="glass-card p-4 rounded-2xl border border-indigo-500/20 dark:border-indigo-400/20 bg-white/95 dark:bg-[#111827]/95 shadow-2xl flex gap-3 items-start pointer-events-auto animate-slide-in text-xs font-semibold relative overflow-hidden"
            >
              {/* Glow accent border */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />

              {renderIcon(toast.type)}

              <div className="space-y-0.5 flex-1 pr-4">
                <span className="font-extrabold text-slate-800 dark:text-white block font-['Outfit']">
                  {toast.title}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">
                  {toast.body}
                </p>
              </div>

              <button
                onClick={() => handleRemoveToast(toast.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationCenter;
