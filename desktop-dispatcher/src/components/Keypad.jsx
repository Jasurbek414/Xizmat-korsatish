import React from 'react';
import { Phone, PhoneOff, Play, Pause, Mic, MicOff, X, Share2 } from 'lucide-react';

const Keypad = ({
  number,
  sipStatus,
  callState,
  duration,
  onKeyPress,
  onBackspace,
  onClear,
  onStartCall,
  onEndCall,
  onRedial,
  onToggleHold,
  onToggleMute,
  onToggleSip,
  formatDisplayNumber
}) => {
  return (
    <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-4.5 flex flex-col justify-between flex-1 min-h-[380px]">
      
      {/* SIP Status Header */}
      <div 
        onClick={onToggleSip}
        className="px-3.5 py-2.5 bg-[#0b0e17] border border-slate-800/60 rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#131722] transition shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            sipStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : sipStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
          }`} />
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider font-outfit">
            {sipStatus === 'CONNECTED' ? 'SIP Ulanish: Faol' : sipStatus === 'CONNECTING' ? 'SIP Ulanmoqda...' : 'SIP Ulanmagan'}
          </span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      </div>

      {/* Number Display Box */}
      <div className="w-full bg-[#0b0e17] border border-slate-800/60 p-3 rounded-lg flex items-center justify-center min-h-[46px] my-3.5 shrink-0">
        <span className="text-sm font-extrabold text-indigo-400 font-mono tracking-wider">
          {formatDisplayNumber(number)}
        </span>
      </div>

      {/* Rectangular Grid Keypad */}
      <div className="grid grid-cols-3 gap-2 flex-1 my-1.5">
        {[
          { d: '1', l: ' ' }, { d: '2', l: 'ABC' }, { d: '3', l: 'DEF' },
          { d: '4', l: 'GHI' }, { d: '5', l: 'JKL' }, { d: '6', l: 'MNO' },
          { d: '7', l: 'PQRS' }, { d: '8', l: 'TUV' }, { d: '9', l: 'WXYZ' },
          { d: '*', l: '' }, { d: '0', l: '+' }, { d: '#', l: '' }
        ].map(btn => (
          <button
            key={btn.d}
            type="button"
            onClick={() => onKeyPress(btn.d)}
            className="bg-[#1c243b] hover:bg-[#232c48] active:bg-[#5850ec]/20 border border-slate-800/40 rounded-lg flex flex-col items-center justify-center cursor-pointer transition select-none py-1.5 active:scale-95"
          >
            <span className="text-xs font-bold text-slate-200 font-mono leading-none">
              {btn.d}
            </span>
            <span className="text-[5.5px] text-slate-500 font-bold block mt-0.5 leading-none h-1 uppercase">
              {btn.l}
            </span>
          </button>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-center gap-6 py-2 shrink-0">
        <button
          type="button"
          onClick={onBackspace}
          disabled={number.length === 0}
          className="w-8 h-8 rounded-full bg-[#1c243b] hover:bg-[#232c48] disabled:opacity-30 text-slate-450 flex items-center justify-center cursor-pointer border border-slate-800/40"
          title="O'chirish"
        >
          <PhoneOff className="w-3.5 h-3.5 rotate-180" />
        </button>

        {callState.state !== 'IDLE' ? (
          <button
            type="button"
            onClick={onEndCall}
            className="w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95 transition"
            title="Aloqani uzish"
          >
            <PhoneOff className="w-4.5 h-4.5 fill-white text-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartCall}
            disabled={number.replace(/\D/g, '').length < 3 || sipStatus !== 'CONNECTED'}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title="Qo'ng'iroq"
          >
            <Phone className="w-4.5 h-4.5 fill-white text-white" />
          </button>
        )}

        <button
          type="button"
          onClick={onClear}
          disabled={number.length === 0}
          className="w-8 h-8 rounded-full bg-[#1c243b] hover:bg-[#232c48] disabled:opacity-30 text-slate-455 flex items-center justify-center cursor-pointer border border-slate-800/40"
          title="Tozalash"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Control Action Bar */}
      <div className="flex justify-between px-2 pt-2.5 border-t border-slate-800/40 text-[9px] font-bold text-slate-400 select-none shrink-0 mt-1">
        <button 
          type="button"
          onClick={onRedial}
          disabled={sipStatus !== 'CONNECTED' || callState.state !== 'IDLE'}
          className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer disabled:opacity-40"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Qayta</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 hover:text-indigo-400 transition cursor-pointer opacity-50 cursor-not-allowed">
          <Share2 className="w-3.5 h-3.5 rotate-90" />
          <span>Transfer</span>
        </button>
        <button 
          type="button"
          onClick={onToggleHold}
          disabled={callState.state !== 'ACTIVE' && callState.state !== 'HOLD'}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${
            callState.isHeld ? 'text-amber-500' : 'hover:text-indigo-400 disabled:opacity-40'
          }`}
        >
          {callState.isHeld ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>Kutish</span>
        </button>
        <button 
          type="button"
          onClick={onToggleMute}
          disabled={callState.state !== 'ACTIVE' && callState.state !== 'HOLD'}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${
            callState.isMuted ? 'text-rose-500' : 'hover:text-indigo-400 disabled:opacity-40'
          }`}
        >
          {callState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>Mute</span>
        </button>
      </div>

    </div>
  );
};

export default Keypad;
