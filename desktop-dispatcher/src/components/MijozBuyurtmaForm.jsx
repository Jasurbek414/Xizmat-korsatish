import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Compass, Briefcase, Layers, Coins, Calendar, Truck, MessageSquare, Plus, CheckCircle, Navigation } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const SERVICES = [
  { name: 'Gilam Yuvish', unit: 'kv. metr', price: 15000 },
  { name: 'Parda tozalash', unit: 'dona', price: 12000 },
  { name: 'Yostiq tozalash', unit: 'dona', price: 20000 },
  { name: 'Ko\'rpa tozalash', unit: 'dona', price: 25000 }
];

const CAMPAIGNS = ['Telegram bot', 'Instagram faol', 'Tavsiya orqali', 'Flayer tarqatish'];
const DRIVERS = ['Sherzod (Spark)', 'Anvar (Damas)', 'Dilshod (Labo)', 'Sardor (Cobalt)'];

const MijozBuyurtmaForm = ({ onAddOrder, preSelectedClient }) => {
  const [fullName, setFullName] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  const [service, setService] = useState(SERVICES[0].name);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(SERVICES[0].price.toString());
  const [campaign, setCampaign] = useState(CAMPAIGNS[0]);
  const [driver, setDriver] = useState(DRIVERS[0]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (preSelectedClient) {
      setFullName(preSelectedClient.full_name || '');
      setPhoneVal(preSelectedClient.phone || '');
      setAddress(preSelectedClient.address || '');
    } else {
      setFullName('');
      setPhoneVal('');
      setAddress('');
    }
  }, [preSelectedClient]);

  const handleServiceChange = (serviceName) => {
    setService(serviceName);
    const matched = SERVICES.find(s => s.name === serviceName);
    if (matched) {
      const calculated = matched.price * (parseFloat(qty) || 1);
      setPrice(calculated.toString());
    }
  };

  const handleQtyChange = (val) => {
    setQty(val);
    const num = parseFloat(val) || 0;
    const matched = SERVICES.find(s => s.name === service);
    const basePrice = matched ? matched.price : 15000;
    const calculated = basePrice * num;
    setPrice(calculated.toString());
  };

  const handleClear = () => {
    setFullName('');
    setPhoneVal('');
    setAddress('');
    setLandmark('');
    setQty('1');
    const matched = SERVICES.find(s => s.name === service);
    setPrice(matched ? matched.price.toString() : '15000');
    setDescription('');
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
        landmark: landmark || '',
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

    const clients = getDbItem('dispatcher_clients') || [];
    const exists = clients.some(c => c.phone.replace(/\s+/g, '') === phoneVal.replace(/\s+/g, ''));
    
    if (!exists) {
      const newClientObj = {
        id: 'cl_' + Date.now(),
        full_name: fullName,
        phone: phoneVal,
        address: address || 'Kiritilmagan',
        landmark: landmark || '',
        client_type: 'Standard'
      };
      setDbItem('dispatcher_clients', [newClientObj, ...clients]);
    }

    onAddOrder({
      client_name: fullName,
      phone: phoneVal,
      address: address,
      service_name: service,
      qty: qty,
      price: parseInt(price) || 0,
      description: `${description} | Mo'ljal: ${landmark} | Haydovchi: ${driver} | Kampaniya: ${campaign}`,
      payment_method: 'Naqd',
      return_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 18:00'
    });

    handleClear();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 w-full flex flex-col gap-4 text-xs font-semibold text-[var(--text-primary)] shadow-2xl transition-colors duration-300">
      
      {/* SECTION 1: MIJOZ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 shrink-0 select-none">
          <User className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">Mijoz</span>
        </div>

        {/* Row 1: Name and Phone */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Row 2: Address with map button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Manzil"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
            />
          </div>
          <button
            type="button"
            className="w-8.5 h-8.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
            title="Xaritadan tanlash"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Row 3: Landmark */}
        <div className="relative">
          <Compass className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Mo'ljal (masalan: metro yonida)"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>
      </div>

      {/* SECTION 2: BUYURTMA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 shrink-0 select-none">
          <Briefcase className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">Buyurtma</span>
        </div>

        {/* Row 1: Service type, Quantity, and Price */}
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Briefcase className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={service}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-8 pr-2 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
            >
              {SERVICES.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Layers className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="number"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              placeholder="Hajmi"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-8 pr-2 py-2 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none transition-all duration-300"
              required
            />
          </div>

          <div className="relative">
            <Coins className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Narx"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-8 pr-2 py-2 text-xs text-indigo-500 dark:text-indigo-400 font-mono font-bold focus:outline-none transition-all duration-300"
              required
            />
          </div>
        </div>

        {/* Row 2: Campaign Selection */}
        <div className="relative">
          <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
          >
            {CAMPAIGNS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Row 3: Driver Selection */}
        <div className="relative">
          <Truck className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
          >
            {DRIVERS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Row 4: Description */}
        <div className="relative">
          <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Izoh..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5"
          />
        </div>
      </div>

      {/* Buttons row below the form fields */}
      <div className="flex gap-4 pt-2 shrink-0 select-none">
        <button
          type="button"
          onClick={handleSaveClientOnly}
          className="flex-[1.2] py-2.5 bg-[var(--bg-keypad-btn)] hover:bg-[var(--bg-keypad-btn-hover)] text-[var(--text-secondary)] font-extrabold rounded-xl transition-all duration-300 cursor-pointer text-[10px] uppercase tracking-wider font-outfit flex items-center justify-center gap-1.5 border border-[var(--border-color)]"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Mijoz saqlash
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-xl transition-all duration-300 cursor-pointer text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-500/10 active:scale-95 font-outfit flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-3.5 h-3.5 fill-white text-indigo-650" /> Buyurtma
        </button>
      </div>

    </form>
  );
};

export default MijozBuyurtmaForm;
