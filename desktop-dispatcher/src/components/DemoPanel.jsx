import React from 'react';
import { AlertCircle, PhoneIncoming } from 'lucide-react';

const DemoPanel = ({ callState, onSimulate }) => {
  return (
    <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-3.5 mt-3 flex flex-col gap-2.5 shrink-0">
      <div className="flex items-start gap-2 text-indigo-400">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-[8.5px] uppercase tracking-wider block font-outfit">Demostratsiya Paneli</span>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
            Kirish qo'ng'irog'ini sinash uchun simulated call jo'natish.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSimulate}
        disabled={callState.state !== 'IDLE'}
        className="flex items-center justify-center gap-1.5 bg-[#5850ec] hover:bg-[#4f46e5] disabled:opacity-50 text-white font-extrabold py-2 rounded-lg text-[9px] uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-500/10 w-full font-outfit"
      >
        <PhoneIncoming className="w-3 h-3 fill-white" />
        <span>Call Simulyatsiya</span>
      </button>
    </div>
  );
};

export default DemoPanel;
