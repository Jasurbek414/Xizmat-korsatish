import React from 'react';
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react';

// Kiruvchi qo'ng'iroq uchun ko'zga tashlanadigan katta oyna (Telefoniya
// sahifasi ustida). callStatus === 'INCOMING' bo'lganda ko'rsatiladi.
// Ohang (incoming ringtone) Telephony.jsx dagi tone mexanizmi orqali chalinadi.
const IncomingCallModal = ({ incomingNumber, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Xira fon */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />

      {/* Oyna */}
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-2xl p-8 animate-scale-in">
        {/* Pulslanuvchi telefon belgisi */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/40">
              <PhoneIncoming className="w-9 h-9 text-white" />
            </div>
          </div>
        </div>

        <div className="text-center mb-7">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 animate-pulse">
            Kiruvchi qo'ng'iroq
          </p>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-white font-mono tracking-tight break-all">
            {incomingNumber || "Noma'lum raqam"}
          </p>
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-1.5">sizga qo'ng'iroq qilmoqda...</p>
        </div>

        <div className="flex items-center justify-center gap-10">
          {/* Rad etish */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center justify-center active:scale-95"
              title="Rad etish"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">Rad etish</span>
          </div>

          {/* Javob berish */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/40 transition cursor-pointer flex items-center justify-center active:scale-95 animate-bounce"
              title="Javob berish"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Javob berish</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
