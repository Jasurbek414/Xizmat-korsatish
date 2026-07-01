import React from 'react';
import { X } from 'lucide-react';
import Settings from './Settings';

const SettingsModal = ({ isOpen, onClose, auth, sipStatus }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-xs font-semibold animate-fade-in">
      <div className="bg-[#111522] border border-white/[0.04] rounded-2xl p-6 max-w-2xl w-full h-[500px] shadow-2xl relative animate-scale-in flex flex-col">
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-lg hover:bg-white/5 z-20"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 min-h-0">
          <Settings auth={auth} sipStatus={sipStatus} />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
