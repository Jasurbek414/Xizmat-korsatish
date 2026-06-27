import React, { useState } from 'react';
import { X, User, Phone, MapPin, Tag } from 'lucide-react';

const AddClientModal = ({ isOpen, onClose, onAdd }) => {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    client_type: 'Standard'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone) return;
    onAdd(form);
    setForm({ full_name: '', phone: '', address: '', client_type: 'Standard' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-xs font-semibold animate-fade-in">
      <div className="bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-2xl p-5 max-w-xs w-full shadow-2xl relative animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2.5 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white m-0">Yangi Mijoz Qo'shish</h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-slate-400 dark:text-gray-550 text-[9px] uppercase font-bold">Mijoz F.I.SH *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                placeholder="Masalan: Sardor Ergashev" 
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-bold" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 dark:text-gray-550 text-[9px] uppercase font-bold">Telefon Raqami *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                placeholder="Masalan: +998 90 999 88 77" 
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 dark:text-gray-555 text-[9px] uppercase font-bold">Manzili</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                placeholder="Masalan: Yunusobod, 19-mavze, 12" 
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 dark:text-gray-555 text-[9px] uppercase font-bold">Mijoz Turi (Kategoriya)</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select 
                value={form.client_type} 
                onChange={(e) => setForm({ ...form, client_type: e.target.value })} 
                className="w-full bg-slate-50 dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Standard">Oddiy Mijoz (Standard)</option>
                <option value="VIP">VIP Mijoz (VIP)</option>
                <option value="Corporate">Hamkor/Kompaniya (Corporate)</option>
              </select>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5 mt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 px-3.5 py-2 rounded-xl transition hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer font-bold"
            >
              Bekor qilish
            </button>
            <button 
              type="submit" 
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/10"
            >
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;
