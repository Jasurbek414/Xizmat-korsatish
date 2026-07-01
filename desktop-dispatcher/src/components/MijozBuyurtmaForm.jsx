import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Calendar, ShoppingBag, MessageSquare, Plus, CheckCircle } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const MijozBuyurtmaForm = ({ onAddOrder, preSelectedClient, onAddressChange }) => {
  const [fullName, setFullName] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [address, setAddress] = useState('');

  // Auto-filled Date/Time
  const [sana, setSana] = useState('');
  const [tovarNomi, setTovarNomi] = useState('');
  const [izoh, setIzoh] = useState('');

  // Auto-populate date/time on mount
  useEffect(() => {
    const now = new Date();
    const formatted = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0');
    setSana(formatted);
  }, []);

  // Sync with selected client from call logs/map reverse geocoding
  useEffect(() => {
    if (preSelectedClient) {
      setFullName(preSelectedClient.full_name || '');
      setPhoneVal(preSelectedClient.phone || '');
      setAddress(preSelectedClient.address || '');
    }
  }, [preSelectedClient]);

  // Sync address changes (either typing or selected on map)
  const handleAddressChangeLocal = (val) => {
    setAddress(val);
    if (onAddressChange) {
      onAddressChange(val);
    }
  };

  const handleClear = () => {
    setFullName('');
    setPhoneVal('');
    setAddress('');
    setTovarNomi('');
    setIzoh('');
    if (onAddressChange) onAddressChange('');
    
    const now = new Date();
    const formatted = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0');
    setSana(formatted);
  };

  const handleSaveClientOnly = () => {
    if (!fullName || !phoneVal) return;
    const clients = getDbItem('dispatcher_clients') || [];
    const exists = clients.some(c => c.phone.replace(/\s+/g, '') === phoneVal.replace(/\s+/g, ''));
    
    if (!exists) {
      const newClientObj = {
        id: 'cl_' + Date.now(),
        full_name: fullName,
        phone: phoneVal,
        address: address || 'Kiritilmagan',
        client_type: 'Standard'
      };
      setDbItem('dispatcher_clients', [newClientObj, ...clients]);
      alert("Mijoz muvaffaqiyatli saqlandi!");
    } else {
      alert("Bu mijoz bazada mavjud!");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phoneVal) return;

    // Save client to local storage if it doesn't exist
    const clients = getDbItem('dispatcher_clients') || [];
    const exists = clients.some(c => c.phone.replace(/\s+/g, '') === phoneVal.replace(/\s+/g, ''));
    if (!exists) {
      const newClientObj = {
        id: 'cl_' + Date.now(),
        full_name: fullName,
        phone: phoneVal,
        address: address || 'Kiritilmagan',
        client_type: 'Standard'
      };
      setDbItem('dispatcher_clients', [newClientObj, ...clients]);
    }

    onAddOrder({
      client_name: fullName,
      phone: phoneVal,
      address: address,
      tovar_nomi: tovarNomi,
      izoh: izoh,
      created_at: sana
    });

    handleClear();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 w-full h-full flex flex-col justify-between text-xs font-semibold text-[var(--text-primary)] shadow-2xl transition-colors duration-300 relative">
      
      {/* SECTION 1: MIJOZ */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-1.5 select-none shrink-0">
          <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">Mijoz</span>
        </div>

        {/* Row 1: Name and Phone */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ism familiya"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="+998..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>
        </div>

        {/* Row 2: Address */}
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={address}
            onChange={(e) => handleAddressChangeLocal(e.target.value)}
            placeholder="Manzil (Xaritadan tanlash mumkin)"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>
      </div>

      {/* SECTION 2: BUYURTMA */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-1.5 select-none shrink-0">
          <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">Buyurtma</span>
        </div>

        {/* Row 1: Sana and Tovar Nomi */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={sana}
              readOnly
              className="w-full bg-[var(--bg-keypad-btn-hover)] opacity-95 cursor-not-allowed border border-[var(--border-color)] rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-secondary)] font-mono font-extrabold focus:outline-none"
              title="Sana avtomatik to'ldiriladi"
            />
          </div>

          <div className="relative">
            <ShoppingBag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={tovarNomi}
              onChange={(e) => setTovarNomi(e.target.value)}
              placeholder="Tovar nomi"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>
        </div>

        {/* Row 2: Izoh */}
        <div className="relative">
          <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
            placeholder="Izoh yozing..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>
      </div>

      {/* Buttons Row */}
      <div className="flex gap-3.5 pt-1.5 shrink-0 select-none">
        <button
          type="button"
          onClick={handleSaveClientOnly}
          className="flex-[1.2] py-2 bg-[var(--bg-keypad-btn)] hover:bg-[var(--bg-keypad-btn-hover)] text-[var(--text-secondary)] font-extrabold rounded-xl transition-all duration-300 cursor-pointer text-[9.5px] uppercase tracking-wider font-outfit flex items-center justify-center gap-1.5 border border-[var(--border-color)]"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Mijoz saqlash
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-xl transition-all duration-300 cursor-pointer text-[9.5px] uppercase tracking-wider shadow-lg shadow-indigo-500/10 active:scale-95 font-outfit flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-3.5 h-3.5 fill-white text-indigo-650" /> Buyurtma
        </button>
      </div>

    </form>
  );
};

export default MijozBuyurtmaForm;
