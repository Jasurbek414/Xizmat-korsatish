import React from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, HelpCircle } from 'lucide-react';

const PhoneDialer = ({
  phoneNumber,
  setPhoneNumber,
  callStatus,
  duration,
  isMuted,
  incomingNumber,
  handleKeypadPress,
  handleBackspace,
  handleDial,
  handleAccept,
  handleHangup,
  toggleMute
}) => {
  // Format call duration (mm:ss)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl"></div>
        
        {/* Screen */}
        <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 mb-4 border border-slate-100 dark:border-white/2 text-center min-h-[90px] flex flex-col justify-center items-center">
          {callStatus === 'DISCONNECTED' && (
            <>
              <input 
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Raqamni kiriting"
                className="w-full bg-transparent text-center text-lg font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
              />
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Tayyor</span>
            </>
          )}

          {callStatus === 'CONNECTING' && (
            <>
              <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 tracking-wider font-mono animate-pulse">{phoneNumber}</span>
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Qo'ng'iroq ketmoqda...</span>
            </>
          )}

          {callStatus === 'ACTIVE' && (
            <>
              <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400 tracking-wider font-mono">{phoneNumber || incomingNumber}</span>
              <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1 font-mono">{formatDuration(duration)}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase font-bold tracking-wider">Aloqa o'rnatildi</span>
            </>
          )}

          {callStatus === 'INCOMING' && (
            <>
              <span className="text-sm font-bold text-amber-500 dark:text-amber-400 tracking-wider font-mono animate-bounce">{incomingNumber}</span>
              <span className="text-[10px] text-amber-500 mt-1.5 uppercase font-bold tracking-wider">Kiruvchi qo'ng'iroq...</span>
            </>
          )}
        </div>

        {/* Keypad or Active Call controls */}
        {callStatus === 'ACTIVE' ? (
          <div className="flex justify-center gap-6 py-4 animate-scale-in">
            <button 
              type="button"
              onClick={toggleMute}
              className={`p-4 rounded-full border transition cursor-pointer ${isMuted ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-white/5'}`}
              title={isMuted ? "Mikrofonni yoqish" : "Mikrofonni o'chirish"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              type="button"
              onClick={handleHangup}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer"
              title="Qo'ng'iroqni tugallash"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        ) : callStatus === 'INCOMING' ? (
          <div className="flex justify-center gap-6 py-4 animate-scale-in">
            <button 
              type="button"
              onClick={handleAccept}
              className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <Phone className="w-5 h-5 animate-pulse" /> Javob berish
            </button>
            <button 
              type="button"
              onClick={handleHangup}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        ) : (
          // Standard Keypad
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                disabled={callStatus !== 'DISCONNECTED'}
                className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/2 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 font-bold text-sm transition cursor-pointer focus:outline-none disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            
            {/* Dial / Backspace controls */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={callStatus !== 'DISCONNECTED' || !phoneNumber}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 font-bold transition cursor-pointer disabled:opacity-50"
            >
              ←
            </button>

            <button
              type="button"
              onClick={handleDial}
              disabled={callStatus !== 'DISCONNECTED' || !phoneNumber}
              className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 font-bold transition cursor-pointer disabled:opacity-50 flex justify-center items-center"
            >
              <PhoneCall className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setPhoneNumber('')}
              disabled={callStatus !== 'DISCONNECTED' || !phoneNumber}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 font-bold transition cursor-pointer disabled:opacity-50"
            >
              C
            </button>
          </div>
        )}
      </div>

      {/* Quick FAQ / Help */}
      <div className="glass-card rounded-2xl p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-gray-400 space-y-2">
        <span className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Tezkor yo'riqnoma:
        </span>
        <p>1. Qo'ng'iroq qilish uchun raqam kiritib yashil qo'ng'iroq tugmasini bosing.</p>
        <p>2. Dastur to'g'ri ishlashi uchun shaxsiy kompyuterda local telephony driver fonda ishlab turishi lozim.</p>
      </div>
    </div>
  );
};

export default PhoneDialer;
