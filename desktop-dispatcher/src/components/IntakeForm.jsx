import React, { useState, useEffect } from 'react';
import { MapPin, X, HelpCircle } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const SERVICES = [
  { name: 'Gilam Yuvish', unit: 'kv. metr', price: 15000 },
  { name: 'Parda tozalash', unit: 'dona', price: 12000 },
  { name: 'Yostiq tozalash', unit: 'dona', price: 20000 },
  { name: 'Ko\'rpa tozalash', unit: 'dona', price: 25000 }
];

const IntakeForm = ({ onAddOrder, onCancel, preSelectedClient }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [service, setService] = useState(SERVICES[0]);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(SERVICES[0].price.toString());
  const [description, setDescription] = useState('');

  // Sync when preSelectedClient changes (e.g. caller incoming or customer selected)
  useEffect(() => {
    if (preSelectedClient) {
      setFullName(preSelectedClient.full_name || '');
      setPhone(preSelectedClient.phone || '');
      setAddress(preSelectedClient.address || '');
    } else {
      setFullName('');
      setPhone('');
      setAddress('');
    }
  }, [preSelectedClient]);

  const handleServiceChange = (serviceName) => {
    const matched = SERVICES.find(s => s.name === serviceName);
    if (matched) {
      setService(matched);
      const calculated = matched.price * (parseFloat(qty) || 1);
      setPrice(calculated.toString());
    }
  };

  const handleQtyChange = (val) => {
    setQty(val);
    const num = parseFloat(val) || 0;
    const calculated = service.price * num;
    setPrice(calculated.toString());
  };

  const handleClear = () => {
    setFullName('');
    setPhone('');
    setAddress('');
    setQty('1');
    setPrice(service.price.toString());
    setDescription('');
    if (onCancel) onCancel();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phone || !address) return;

    // Check if client exists in DB, else register automatically
    const clients = getDbItem('dispatcher_clients') || [];
    const exists = clients.some(c => c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    
    if (!exists) {
      const newClientObj = {
        id: 'cl_' + Date.now(),
        full_name: fullName,
        phone: phone,
        address: address,
        client_type: 'Standard'
      };
      setDbItem('dispatcher_clients', [newClientObj, ...clients]);
    }

    onAddOrder({
      client_name: fullName,
      phone: phone,
      address: address,
      service_name: service.name,
      qty: qty,
      price: parseInt(price) || 0,
      description: description,
      payment_method: 'Naqd',
      return_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 18:00'
    });

    handleClear();
  };

  return (
    <div className="bg-[#151b2d] border border-slate-800/60 rounded-xl p-5 w-full h-full flex flex-col justify-between select-none text-xs font-semibold text-slate-200">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-800/40 pb-3 shrink-0">
        <span className="font-extrabold text-[11px] text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
          <span className="text-indigo-400">📄</span> BUYURTMA TUSHGANDA
        </span>
        <button 
          type="button" 
          onClick={handleClear}
          className="p-1 text-slate-500 hover:text-slate-350 cursor-pointer rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pt-4 pr-0.5 scrollbar-thin max-h-[350px]">
        
        {/* Name input */}
        <div className="space-y-1">
          <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">ISMI</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jasur Mavlonov"
            className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition"
            required
          />
        </div>

        {/* Phone input */}
        <div className="space-y-1">
          <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">TELEFON RAQAMI</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 99 888 77 66"
            className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none transition"
            required
          />
        </div>

        {/* Address input */}
        <div className="space-y-1">
          <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">MANZILI</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent sh., Yunusobod tumani, 4-uy"
              className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition"
              required
            />
          </div>
        </div>

        {/* Service Type select */}
        <div className="space-y-1">
          <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">XIZMAT TURI</label>
          <select
            value={service.name}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition cursor-pointer"
          >
            {SERVICES.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Volume & Price side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">HAJMI</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">NARXI (UZS)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$"
              className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold text-emerald-400 focus:outline-none transition"
              required
            />
          </div>
        </div>

        {/* Description textarea */}
        <div className="space-y-1">
          <label className="block text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">IZOH / MAHSUS DOG'LAR</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qo'shimcha tafsilotlar..."
            className="w-full bg-[#0b0e17] border border-slate-800/60 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition h-14 resize-none"
          />
        </div>

      </div>

      {/* Buttons Row */}
      <div className="flex justify-end gap-3.5 pt-3.5 border-t border-slate-800/40 shrink-0">
        <button
          type="button"
          onClick={handleClear}
          className="px-5 py-2 bg-[#232c48] hover:bg-[#2c375a] text-slate-300 font-extrabold rounded-lg transition cursor-pointer text-[10.5px] uppercase tracking-wider"
        >
          Bekor qilish
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-6 py-2 bg-[#5850ec] hover:bg-[#4f46e5] text-white font-extrabold rounded-lg transition cursor-pointer text-[10.5px] uppercase tracking-wider shadow-md shadow-indigo-500/10"
        >
          Saqlash
        </button>
      </div>

    </div>
  );
};

export default IntakeForm;
