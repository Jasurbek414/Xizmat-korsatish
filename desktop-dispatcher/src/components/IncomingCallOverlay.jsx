import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';

const IncomingCallOverlay = ({ incomingCall, onAnswerCall, onRejectCall }) => {
  if (!incomingCall) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-80 bg-[#111625]/95 border border-indigo-500/20 shadow-2xl p-5 rounded-2xl animate-slide-in text-xs font-semibold select-none backdrop-blur-md">
      {/* Pulsing ring visual */}
      <div className="flex items-center gap-3 border-b border-white/[0.04] pb-3.5">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="w-9.5 h-9.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Phone className="w-4 h-4 text-emerald-450 fill-emerald-500" />
          </div>
        </div>

        <div>
          <span className="block font-extrabold text-[9px] text-emerald-400 uppercase tracking-widest">
            Kiruvchi Qo'ng'iroq {incomingCall.lineLabel ? `(${incomingCall.lineLabel})` : ''}
          </span>
          <span className="block font-black text-slate-100 text-xs mt-1 leading-none font-outfit">
            {incomingCall.clientName || 'Noma\'lum mijoz'}
          </span>
          <span className="block text-[9.5px] text-slate-500 font-mono mt-1">
            {incomingCall.number}
          </span>
        </div>
      </div>

      {/* Answer/Reject trigger buttons */}
      <div className="flex gap-3 pt-3.5">
        <button
          type="button"
          onClick={onRejectCall}
          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold py-2.5 rounded-xl transition cursor-pointer border border-rose-500/10 flex items-center justify-center gap-1.5 uppercase text-[9.5px] tracking-wider font-outfit"
        >
          <PhoneOff className="w-3.5 h-3.5" /> Rad etish
        </button>
        <button
          type="button"
          onClick={onAnswerCall}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-1.5 uppercase text-[9.5px] tracking-wider font-outfit"
        >
          <Phone className="w-3.5 h-3.5 fill-white text-white" /> Javob berish
        </button>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;
