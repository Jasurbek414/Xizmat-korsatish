import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Trash2, CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const NotificationCenter = () => {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const dropdownRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  // Load and subscribe to notifications change
  const loadNotifications = () => {
    const all = JSON.parse(localStorage.getItem('notifications')) || [];
    setNotifications(all);
    if (all.length > 0 && !lastNotificationIdRef.current) {
      lastNotificationIdRef.current = all[0].id;
    }
  };

  // Helper to trigger random simulation
  const handleSimulateNotification = () => {
    const events = [
      {
        title_uz: 'Kuryer yo\'lda',
        title_ru: 'Курьер в пути',
        title_en: 'Courier En Route',
        message_uz: 'Alisher Qodirov buyurtma #1021 ni yetkazish uchun yo\'lga chiqdi.',
        message_ru: 'Алишер Кодиров отправился на доставку заказа #1021.',
        message_en: 'Alisher Qodirov is en route to deliver order #1021.',
        type: 'INFO'
      },
      {
        title_uz: 'Yangi buyurtma qabul qilindi',
        title_ru: 'Получен новый заказ',
        title_en: 'New Order Received',
        message_uz: 'Mijoz Zilola Karimova yangi xizmat so\'rovi qoldirdi.',
        message_ru: 'Клиент Зилола Каримова оставила новый запрос на обслуживание.',
        message_en: 'Client Zilola Karimova submitted a new service request.',
        type: 'SUCCESS'
      },
      {
        title_uz: 'Tizim xatoligi',
        title_ru: 'Системная ошибка',
        title_en: 'System Error',
        message_uz: 'GPS signali yo\'qoldi. Qayta ulanish kutilmoqda.',
        message_ru: 'GPS сигнал потерян. Ожидание переподключения.',
        message_en: 'GPS signal lost. Awaiting reconnection.',
        type: 'ERROR'
      },
      {
        title_uz: 'Kassa ogohlantirishi',
        title_ru: 'Предупреждение кассы',
        title_en: 'Register Warning',
        message_uz: 'Click kassa balansi minimal limitdan past.',
        message_ru: 'Баланс Click кассы ниже лимита.',
        message_en: 'Click register balance is below threshold.',
        type: 'WARNING'
      }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    
    // Add to storage and dispatch event
    const current = JSON.parse(localStorage.getItem('notifications')) || [];
    const newNotification = {
      id: 'n_' + Date.now(),
      title_uz: ev.title_uz,
      title_ru: ev.title_ru,
      title_en: ev.title_en,
      message_uz: ev.message_uz,
      message_ru: ev.message_ru,
      message_en: ev.message_en,
      type: ev.type,
      read: false,
      created_at: new Date().toISOString()
    };
    const updated = [newNotification, ...current].slice(0, 50);
    localStorage.setItem('notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    loadNotifications();

    const handleStorageChange = () => {
      const all = JSON.parse(localStorage.getItem('notifications')) || [];
      setNotifications(all);

      if (all.length > 0) {
        const newest = all[0];
        // If this is a newly added notification (different from last seen) and is unread, show toast!
        const isNew = !lastNotificationIdRef.current || newest.id !== lastNotificationIdRef.current;
        
        // Update last seen ID
        lastNotificationIdRef.current = newest.id;

        if (isNew && !newest.read) {
          setToasts(prev => {
            // Avoid duplicate toasts
            if (prev.some(t => t.id === newest.id)) return prev;
            return [...prev, newest];
          });

          // Auto-remove toast after 4.5 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== newest.id));
          }, 4500);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Close dropdown on click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearAll = () => {
    localStorage.setItem('notifications', JSON.stringify([]));
    window.dispatchEvent(new Event('storage'));
  };

  const handleMarkAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper to format dynamic date string into 'time ago'
  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return i18n.language === 'uz' ? 'Hozirgina' : i18n.language === 'ru' ? 'Только что' : 'Just now';
    if (mins < 60) return i18n.language === 'uz' ? `${mins} daqiqa oldin` : i18n.language === 'ru' ? `${mins} мин. назад` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return i18n.language === 'uz' ? `${hours} soat oldin` : i18n.language === 'ru' ? `${hours} ч. назад` : `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Helper to render type-specific icons
  const renderIcon = (type) => {
    switch (type) {
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

            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-[10px] text-rose-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer font-bold"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('notifications_center.clear')}</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-gray-500 font-medium">
                {t('notifications_center.empty')}
              </div>
            ) : (
              notifications.map(item => {
                const title = item[`title_${i18n.language}`] || item.title_uz;
                const message = item[`message_${i18n.language}`] || item.message_uz;
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id)}
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
                          {title}
                        </span>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal line-clamp-2">
                        {message}
                      </p>
                      <span className="text-[8px] text-slate-400 dark:text-gray-500 block font-medium">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
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
          {toasts.map(toast => {
            const title = toast[`title_${i18n.language}`] || toast.title_uz;
            const message = toast[`message_${i18n.language}`] || toast.message_uz;
            
            return (
              <div 
                key={toast.id}
                className="glass-card p-4 rounded-2xl border border-indigo-500/20 dark:border-indigo-400/20 bg-white/95 dark:bg-[#111827]/95 shadow-2xl flex gap-3 items-start pointer-events-auto animate-slide-in text-xs font-semibold relative overflow-hidden"
              >
                {/* Glow accent border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                
                {renderIcon(toast.type)}
                
                <div className="space-y-0.5 flex-1 pr-4">
                  <span className="font-extrabold text-slate-800 dark:text-white block font-['Outfit']">
                    {title}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">
                    {message}
                  </p>
                </div>

                <button 
                  onClick={() => handleRemoveToast(toast.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationCenter;
