import React, { useState } from 'react';
import { User, X, Phone, PhoneCall, MapPin, Plus, CheckCircle, Edit, Save, Tag } from 'lucide-react';

const ClientDetails = ({ client, orders, onBack, onCall, onAddOrderClick, onUpdateClient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: client.full_name,
    phone: client.phone,
    address: client.address || '',
    client_type: client.client_type || 'Standard'
  });

  // Load client details into editing form when editing toggled
  const handleStartEdit = () => {
    setEditForm({
      full_name: client.full_name,
      phone: client.phone,
      address: client.address || '',
      client_type: client.client_type || 'Standard'
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editForm.full_name || !editForm.phone) return;
    onUpdateClient({
      ...client,
      full_name: editForm.full_name,
      phone: editForm.phone,
      address: editForm.address,
      client_type: editForm.client_type
    });
    setIsEditing(false);
  };

  const clientOrders = orders.filter(o => 
    o.client_name.toLowerCase() === client.full_name.toLowerCase()
  );

  const getClientTypeStyles = (type) => {
    switch (type) {
      case 'VIP':
        return 'bg-amber-500/20 text-amber-450 border border-amber-500/30';
      case 'Corporate':
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/15';
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-4 animate-scale-in text-xs h-full">
      
      {/* Top Header Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white m-0 truncate max-w-[150px]">
                {client.full_name}
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-gray-500 block uppercase tracking-wider mt-0.5">
                Mijoz profili
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <button 
                onClick={handleStartEdit}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-indigo-500 transition cursor-pointer"
                title="Tahrirlash"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            <button 
              onClick={onBack} 
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
              title="Ro'yxatga qaytish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isEditing ? (
          /* Inline Editor Form */
          <form onSubmit={handleSaveEdit} className="space-y-2.5 p-3 bg-slate-50 dark:bg-white/2 border border-slate-250/20 dark:border-white/5 rounded-xl animate-fade-in select-none">
            <div className="space-y-0.5">
              <label className="text-[10px] text-slate-400 block font-bold uppercase">Mijoz F.I.SH</label>
              <input 
                type="text" 
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full bg-white dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                required
              />
            </div>
            
            <div className="space-y-0.5">
              <label className="text-[10px] text-slate-400 block font-bold uppercase">Telefon</label>
              <input 
                type="text" 
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full bg-white dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-[10.5px] focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-mono"
                required
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[8.5px] text-slate-400 block font-bold uppercase">Manzil</label>
              <input 
                type="text" 
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full bg-white dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-[10.5px] focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[8.5px] text-slate-400 block font-bold uppercase">Mijoz Kategoriya</label>
              <select 
                value={editForm.client_type}
                onChange={(e) => setEditForm({ ...editForm, client_type: e.target.value })}
                className="w-full bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-[10.5px] focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="Standard">Standard</option>
                <option value="VIP">VIP</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>

            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 border border-white/5 text-[9px] rounded-lg text-slate-400 hover:text-white"
              >
                Bekor qilish
              </button>
              <button 
                type="submit" 
                className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" /> Saqlash
              </button>
            </div>
          </form>
        ) : (
          /* Profile Details Cards */
          <div className="space-y-2 select-none">
            <div className="p-2.5 bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[8px] text-slate-400 dark:text-gray-500 uppercase block font-bold">Telefon Raqami</span>
                <span className="text-slate-800 dark:text-white font-bold font-mono block mt-0.5">{client.phone}</span>
              </div>
              <button
                onClick={() => onCall(client)}
                className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition cursor-pointer shadow-md shadow-indigo-500/10"
                title="Qo'ng'iroq qilish"
              >
                <PhoneCall className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[8px] text-slate-400 dark:text-gray-550 uppercase block font-bold">Manzil</span>
                <span className="text-slate-800 dark:text-white font-bold block mt-0.5 truncate max-w-[190px]">{client.address || 'Kiritilmagan'}</span>
              </div>
              <span className="text-slate-400 hover:text-indigo-400 p-1 cursor-pointer" title="Kartada ochish">
                <MapPin className="w-3.5 h-3.5" />
              </span>
            </div>

            {client.client_type && (
              <div className="p-2.5 bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-slate-400 dark:text-gray-550 uppercase block font-bold">Mijoz Turi</span>
                  <span className="text-slate-800 dark:text-white font-bold block mt-0.5">
                    {client.client_type === 'Standard' ? 'Oddiy (Standard)' : client.client_type === 'VIP' ? 'VIP Mijoz' : 'Hamkor (Corporate)'}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded border text-[7.5px] font-extrabold uppercase tracking-wider ${getClientTypeStyles(client.client_type)}`}>
                  {client.client_type}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 pt-2 select-none">
        <div className="flex justify-between items-center">
          <h4 className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider m-0">Buyurtmalar tarixi ({clientOrders.length})</h4>
          {!isEditing && (
            <button 
              onClick={onAddOrderClick}
              className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Buyurtma
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin max-h-[160px]">
          {clientOrders.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-gray-500 font-medium">
              Buyurtmalar mavjud emas
            </div>
          ) : (
            clientOrders.map(o => (
              <div 
                key={o.id}
                className="p-2 bg-slate-50/50 dark:bg-white/1 border border-slate-150 dark:border-white/5 rounded-lg flex items-center justify-between"
              >
                <div className="min-w-0 pr-1.5">
                  <span className="block font-bold text-slate-800 dark:text-white truncate text-[9.5px]">{o.service_name}</span>
                  {o.description && (
                    <span className="block text-[8px] text-slate-450 dark:text-gray-550 truncate mt-0.5">{o.description}</span>
                  )}
                  {o.payment_method && (
                    <span className="block text-[7.5px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">
                      To'lov: {o.payment_method}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-0.5 pl-1.5">
                  <span className="block font-extrabold text-slate-800 dark:text-white font-mono text-[9.5px]">
                    {o.price.toLocaleString()} UZS
                  </span>
                  <span className={`inline-block px-1 py-0.2 rounded border text-[6.5px] font-extrabold uppercase tracking-wider ${
                    o.status === 'Yakunlandi'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                      : o.status === 'Bekor qilindi'
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                      : o.status === 'Bajarilmoqda'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-550'
                      : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default ClientDetails;
