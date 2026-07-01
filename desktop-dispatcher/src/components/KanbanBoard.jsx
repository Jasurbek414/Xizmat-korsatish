import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const KanbanBoard = ({ orders, onUpdateStatus, onSelectOrderClient }) => {
  
  // Map orders to columns
  const getColumnOrders = (colType) => {
    return orders.filter(o => {
      const status = o.status.toLowerCase();
      if (colType === 'yangi') {
        return status === 'qabul qilindi' || status === 'yangi';
      }
      if (colType === 'jarayonda') {
        return status === 'bajarilmoqda' || status === 'yuvilmoqda' || status === 'quritilmoqda' || status === 'qadoqlandi';
      }
      if (colType === 'etkazish') {
        return status === 'yetkazilmoqda' || status === 'etkazib berish' || status === 'yo\'lda';
      }
      if (colType === 'yopildi') {
        return status === 'yakunlandi' || status === 'bekor qilindi';
      }
      return false;
    });
  };

  const getBadgeStyle = (status) => {
    const s = status.toLowerCase();
    if (s === 'qabul qilindi' || s === 'yangi' || s === 'new') {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    if (s === 'yakunlandi' || s === 'completed') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (s === 'bekor qilindi') {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
    if (s === 'yetkazilmoqda' || s === 'etkazib berish' || s === 'to delivery') {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'; // Processing
  };

  const getBadgeText = (status) => {
    const s = status.toLowerCase();
    if (s === 'qabul qilindi' || s === 'yangi') return 'Yangi';
    if (s === 'yakunlandi') return 'Yopildi';
    if (s === 'yetkazilmoqda' || s === 'etkazib berish') return 'Yo\'lda';
    if (s === 'bajarilmoqda') return 'Jarayonda';
    return status;
  };

  const handleCardClick = (order) => {
    if (onSelectOrderClient) {
      onSelectOrderClient({
        full_name: order.client_name,
        phone: order.phone || '',
        address: order.address || ''
      });
    }
  };

  const handleCycleStatus = (order, e) => {
    e.stopPropagation();
    let nextStatus = 'Qabul qilindi';
    const s = order.status.toLowerCase();
    if (s === 'qabul qilindi' || s === 'yangi') nextStatus = 'Bajarilmoqda';
    else if (s === 'bajarilmoqda') nextStatus = 'Yetkazilmoqda';
    else if (s === 'yetkazilmoqda' || s === 'etkazib berish') nextStatus = 'Yakunlandi';
    else nextStatus = 'Qabul qilindi';

    onUpdateStatus(order.id, nextStatus);
  };

  const columns = [
    { id: 'yangi', title: 'Yangi', count: getColumnOrders('yangi').length, color: 'border-t-blue-500 bg-blue-500/2' },
    { id: 'jarayonda', title: 'Jarayonda', count: getColumnOrders('jarayonda').length, color: 'border-t-purple-500 bg-purple-500/2' },
    { id: 'etkazish', title: 'Yo\'lda', count: getColumnOrders('etkazish').length, color: 'border-t-amber-500 bg-amber-500/2' },
    { id: 'yopildi', title: 'Yopildi', count: getColumnOrders('yopildi').length, color: 'border-t-emerald-500 bg-emerald-500/2' }
  ];

  return (
    <div className="grid grid-cols-4 gap-4 h-full min-h-0 select-none">
      {columns.map(col => {
        const colOrders = getColumnOrders(col.id);
        return (
          <div key={col.id} className={`flex flex-col bg-[#111522]/40 border-t-2 border border-white/[0.04] rounded-xl p-3.5 min-h-0 transition duration-300 ${col.color}`}>
            {/* Column Header */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <span className="text-[10.5px] font-extrabold text-slate-350 tracking-wider uppercase font-outfit">
                {col.title} <span className="ml-1 text-slate-500">({col.count})</span>
              </span>
              <button className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5 rounded transition hover:bg-white/5">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards Scroll Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin min-h-[140px]">
              {colOrders.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-slate-650 font-bold uppercase tracking-wider select-none">
                  Bo'sh
                </div>
              ) : (
                colOrders.map(o => {
                  const isNew = o.status.toLowerCase() === 'qabul qilindi' || o.status.toLowerCase() === 'yangi';
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleCardClick(o)}
                      onDoubleClick={(e) => handleCycleStatus(o, e)}
                      className={`p-3 bg-[#161c2e] hover:bg-[#1d253d] border rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-2 shadow-lg hover:shadow-indigo-500/5 active:scale-[0.98] ${
                        isNew ? 'border-blue-500/25 bg-blue-500/[0.02]' : 'border-white/[0.04]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-bold font-mono text-slate-500 tracking-wider">
                          {o.id.replace('ORD-2026-0000', 'ID: ')}
                        </span>
                      </div>

                      <div>
                        <span className="block font-extrabold text-slate-100 text-xs leading-none">
                          {o.client_name}
                        </span>
                        <span className="block text-[9.5px] text-slate-450 truncate mt-1.5">
                          {o.address || 'Kiritilmagan'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-extrabold uppercase tracking-wider ${getBadgeStyle(o.status)}`}>
                          {getBadgeText(o.status)}
                        </span>
                        {o.price > 0 && (
                          <span className="text-[9px] font-mono text-emerald-400 font-extrabold">
                            {o.price.toLocaleString()} UZS
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
