import React, { useState } from 'react';
import { Search, ClipboardList, Clock, Check, ChevronDown, RefreshCw, AlertCircle, Plus } from 'lucide-react';

const OrdersList = ({ orders, onUpdateOrderStatus, onAddOrderClick }) => {
  const [search, setSearch] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Filter orders
  const filteredOrders = orders.filter(o => 
    o.client_name.toLowerCase().includes(search.toLowerCase()) ||
    o.service_name.toLowerCase().includes(search.toLowerCase()) ||
    (o.description && o.description.toLowerCase().includes(search.toLowerCase())) ||
    (o.payment_method && o.payment_method.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Yakunlandi':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400';
      case 'Bekor qilindi':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400';
      case 'Bajarilmoqda':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-450';
      default:
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400';
    }
  };

  const toggleDropdown = (orderId, e) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === orderId ? null : orderId);
  };

  const handleStatusSelect = (orderId, status) => {
    onUpdateOrderStatus(orderId, status);
    setActiveDropdownId(null);
  };

  return (
    <div className="flex flex-col gap-3.5 min-h-0 flex-1 text-xs font-semibold">
      
      {/* Search and Add Order Button Row */}
      <div className="flex items-center gap-2 select-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buyurtmalarni izlash..."
            className="w-full bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-550/30"
          />
        </div>
        <button
          onClick={onAddOrderClick}
          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/10 flex items-center justify-center"
          title="Yangi buyurtma qabul qilish"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin max-h-[380px]">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-gray-500 font-bold select-none text-xs">
            Buyurtmalar topilmadi
          </div>
        ) : (
          filteredOrders.map(o => (
            <div 
              key={o.id}
              className="p-3.5 bg-slate-50/50 dark:bg-white/2 border border-slate-150 dark:border-white/5 rounded-xl flex flex-col gap-2 relative shadow-sm"
            >
              {/* Top Row: Client Name & Price */}
              <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                  <span className="block font-bold text-slate-800 dark:text-white text-xs leading-snug truncate">
                    {o.client_name}
                  </span>
                  <span className="text-[10px] text-slate-450 dark:text-indigo-400 uppercase tracking-wider font-bold">
                    {o.service_name}
                  </span>
                </div>
                <span className="font-bold text-slate-850 dark:text-white font-mono text-xs whitespace-nowrap">
                  {o.price.toLocaleString()} UZS
                </span>
              </div>

              {/* Middle Row: Description */}
              {o.description && (
                <p className="text-[10px] text-slate-500 dark:text-gray-400 m-0 leading-relaxed bg-slate-100/50 dark:bg-black/20 p-2 rounded-lg border border-slate-100/30 dark:border-white/2">
                  {o.description}
                </p>
              )}

              {/* Bottom Row: Date, Payment, Status Trigger */}
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-2.5 text-[10px] font-bold text-slate-450 dark:text-gray-550 select-none">
                <span className="font-mono text-[9px]">
                  {new Date(o.created_at).toLocaleDateString('uz-UZ')} &bull; {new Date(o.created_at).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})}
                </span>

                <div className="flex items-center gap-2 relative">
                  {o.payment_method && (
                    <span className="text-[9px] text-slate-400 border border-slate-350/20 dark:border-white/5 px-1.5 py-0.5 rounded font-mono uppercase">
                      {o.payment_method}
                    </span>
                  )}

                  {/* Status Dropdown Trigger */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleDropdown(o.id, e)}
                      className={`px-2 py-1 rounded border text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 transition cursor-pointer select-none ${getStatusColor(o.status)}`}
                    >
                      <span>{o.status}</span>
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>

                    {/* Floating Dropdown Panel */}
                    {activeDropdownId === o.id && (
                      <>
                        <div className="fixed inset-0 z-[9990] bg-transparent" onClick={() => setActiveDropdownId(null)} />
                        <div className="absolute right-0 bottom-7 w-36 bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-lg shadow-2xl p-1 z-[9999] animate-scale-in text-[10px] select-none font-bold">
                          {['Qabul qilindi', 'Bajarilmoqda', 'Yakunlandi', 'Bekor qilindi'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusSelect(o.id, status)}
                              className={`w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 transition flex items-center justify-between cursor-pointer ${
                                o.status === status ? 'text-indigo-550 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>{status}</span>
                              {o.status === status && <Check className="w-3 h-3 text-indigo-550 stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default OrdersList;
