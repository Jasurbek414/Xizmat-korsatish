import React, { useState, useEffect } from 'react';
import { MapPin, User, Phone, Briefcase, Layers, Coins, FileText } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const SERVICES = [
  { name: 'Gilam Yuvish', unit: 'kv. metr', price: 15000 },
  { name: 'Parda tozalash', unit: 'dona', price: 12000 },
  { name: 'Yostiq tozalash', unit: 'dona', price: 20000 },
  { name: 'Ko\'rpa tozalash', unit: 'dona', price: 25000 }
];

const IntakeForm = ({ onAddOrder, preSelectedClient }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [service, setService] = useState(SERVICES[0]);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(SERVICES[0].price.toString());
  const [description, setDescription] = useState('');

  // Sync when preSelectedClient changes
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phone || !address) return;

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
    <form 
      id="intake-form" 
      onSubmit={handleSubmit}
      onReset={(e) => { e.preventDefault(); handleClear(); }}
      className="bg-[#111522] border border-white/[0.04] rounded-2xl p-5 w-full h-full flex flex-col justify-between select-none text-xs font-semibold text-slate-200 shadow-2xl"
    >
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-white/[0.04] pb-3.5 shrink-0">
        <span className="font-extrabold text-[11px] text-slate-100 uppercase tracking-widest flex items-center gap-2 font-outfit">
          <FileText className="w-4 h-4 text-indigo-400" /> BUYURTMA TUSHGANDA
        </span>
      </div>

      {/* Form Fields Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-0.5 scrollbar-thin min-h-[140px]">
        
        {/* Name input */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">ISMI</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jasur Mavlonov"
              className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>
        </div>

        {/* Phone input */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider text-slate-455 font-extrabold font-outfit">TELEFON RAQAMI</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 99 888 77 66"
              className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none transition focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>
        </div>

        {/* Address input */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">MANZILI</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent sh., Yunusobod tumani, 4-uy"
              className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition focus:ring-4 focus:ring-indigo-500/5"
              required
            />
          </div>
        </div>

        {/* Service Type select */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">XIZMAT TURI</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <select
              value={service.name}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition cursor-pointer appearance-none focus:ring-4 focus:ring-indigo-500/5"
            >
              {SERVICES.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume & Price side-by-side */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">HAJMI</label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="number"
                value={qty}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none transition focus:ring-4 focus:ring-indigo-500/5"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">NARXI (UZS)</label>
            <div className="relative">
              <Coins className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-slate-100 font-mono font-bold text-emerald-400 focus:outline-none transition focus:ring-4 focus:ring-indigo-500/5"
                required
              />
            </div>
          </div>
        </div>

        {/* Description textarea */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-outfit">IZOH / MAHSUS DOG'LAR</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qo'shimcha tafsilotlar..."
            className="w-full bg-[#0a0d16] border border-white/[0.06] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none transition h-14 resize-none focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>

      </div>

    </form>
  );
};

export default IntakeForm;
