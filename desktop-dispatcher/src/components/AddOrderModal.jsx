import React, { useState, useEffect } from 'react';
import { X, ClipboardList, MapPin, DollarSign, CreditCard, AlignLeft, User, Phone, Check } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const AddOrderModal = ({ isOpen, onClose, onAdd, client: initialClient }) => {
  const [clients, setClients] = useState([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // New Client fields
  const [newClientData, setNewClientData] = useState({
    full_name: '',
    phone: '',
    address: ''
  });

  // Order Details
  const [form, setForm] = useState({
    service_name: 'Tezkor Yetkazib berish',
    price: '25000',
    address: '',
    payment_method: 'Naqd',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      const dbClients = getDbItem('dispatcher_clients') || [];
      setClients(dbClients);
      
      if (initialClient) {
        setIsNewClient(false);
        setSelectedClientId(initialClient.id);
        setForm(prev => ({
          ...prev,
          address: initialClient.address || ''
        }));
      } else {
        setIsNewClient(false);
        if (dbClients.length > 0) {
          setSelectedClientId(dbClients[0].id);
          setForm(prev => ({
            ...prev,
            address: dbClients[0].address || ''
          }));
        } else {
          setIsNewClient(true);
        }
      }
    }
  }, [isOpen, initialClient]);

  if (!isOpen) return null;

  // Handle client selection change
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const matched = clients.find(c => c.id === clientId);
    if (matched) {
      setForm(prev => ({
        ...prev,
        address: matched.address || ''
      }));
    }
  };

  const handleServiceChange = (serviceName) => {
    let price = '25000';
    if (serviceName === 'Standart Yetkazib berish') price = '15000';
    else if (serviceName === 'Uyni Tozalash Xizmati') price = '150000';
    else if (serviceName === 'Konditsioner Ta\'mirlash') price = '120000';

    setForm(prev => ({
      ...prev,
      service_name: serviceName,
      price: price
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let targetClientName = '';
    let targetAddress = form.address;

    if (isNewClient) {
      if (!newClientData.full_name || !newClientData.phone) return;
      
      // Save new client to DB automatically
      const newClient = {
        id: 'cl_' + Date.now(),
        full_name: newClientData.full_name,
        phone: newClientData.phone,
        address: newClientData.address || form.address || 'Kiritilmagan',
        client_type: 'Standard'
      };
      
      const updatedClients = [newClient, ...clients];
      setDbItem('dispatcher_clients', updatedClients);
      targetClientName = newClient.full_name;
      if (!targetAddress) targetAddress = newClient.address;
    } else {
      const matched = clients.find(c => c.id === selectedClientId);
      if (!matched) return;
      targetClientName = matched.full_name;
      if (!targetAddress) targetAddress = matched.address || 'Kiritilmagan';
    }

    if (!form.service_name || !form.price || !targetAddress) return;

    onAdd({
      ...form,
      client_name: targetClientName,
      address: targetAddress,
      price: parseInt(form.price) || 0
    });

    // Reset Form
    setForm({
      service_name: 'Tezkor Yetkazib berish',
      price: '25000',
      address: '',
      payment_method: 'Naqd',
      description: ''
    });
    setNewClientData({
      full_name: '',
      phone: '',
      address: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-scale-in text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white m-0">Yangi Buyurtmani Qabul Qilish</h3>
              <span className="block text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 leading-none">Mijoz ma'lumotlari va xizmat tafsilotlari</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {/* Client Selection Section */}
          <div className="bg-slate-50 dark:bg-white/2 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold">Mijoz tanlash</span>
              {!initialClient && (
                <button
                  type="button"
                  onClick={() => setIsNewClient(!isNewClient)}
                  className="text-[10px] text-indigo-550 dark:text-indigo-400 font-bold hover:underline"
                >
                  {isNewClient ? "Mavjud mijozlardan tanlash" : "+ Yangi mijoz qo'shish"}
                </button>
              )}
            </div>

            {isNewClient ? (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-500 block text-[10px]">Ism Familiya</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={newClientData.full_name}
                        onChange={(e) => setNewClientData({ ...newClientData, full_name: e.target.value })}
                        placeholder="Jasur Mavlonov"
                        className="w-full bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 dark:text-gray-550 block text-[10px]">Telefon raqam</label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={newClientData.phone}
                        onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                        placeholder="+998 90 123 45 67"
                        className="w-full bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <label className="text-slate-400 dark:text-gray-550 block text-[10px]">Mijoz ro'yxati</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Service Configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-400 dark:text-gray-555 text-[10px] uppercase font-bold">Xizmat turi</label>
              <select 
                value={form.service_name} 
                onChange={(e) => handleServiceChange(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Tezkor Yetkazib berish">Tezkor Yetkazib berish</option>
                <option value="Standart Yetkazib berish">Standart Yetkazib berish</option>
                <option value="Uyni Tozalash Xizmati">Uyni Tozalash Xizmati</option>
                <option value="Konditsioner Ta'mirlash">Konditsioner Ta'mirlash</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-400 dark:text-gray-550 text-[10px] uppercase font-bold">Narxi (UZS)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input 
                  type="number" 
                  value={form.price} 
                  onChange={(e) => setForm({ ...form, price: e.target.value })} 
                  className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 font-mono font-bold" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 dark:text-gray-550 text-[10px] uppercase font-bold">Yetkazib berish manzili</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                placeholder="Ko'cha nomi, uy raqami, xonadon" 
                className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-400 dark:text-gray-555 text-[10px] uppercase font-bold">To'lov shakli</label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select 
                  value={form.payment_method} 
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })} 
                  className="w-full bg-slate-50 dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Naqd">Naqd (Cash)</option>
                  <option value="Karta">Plastik Karta</option>
                  <option value="Click/Payme">Onlayn (Click/Payme)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-400 dark:text-gray-550 text-[10px] uppercase font-bold">Izohlar / Ma'lumot</label>
              <div className="relative">
                <AlignLeft className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <textarea 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  placeholder="Qo'shimcha eslatmalar..." 
                  className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 h-10 resize-none" 
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer font-bold"
            >
              Bekor qilish
            </button>
            <button 
              type="submit" 
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/10"
            >
              Buyurtmani Tasdiqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderModal;
