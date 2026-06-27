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
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (s === 'yakunlandi' || s === 'completed') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (s === 'bekor qilindi') {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    }
    if (s === 'yetkazilmoqda' || s === 'etkazib berish' || s === 'to delivery') {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
    return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'; // Processing
  };

  const getBadgeText = (status) => {
    const s = status.toLowerCase();
    if (s === 'qabul qilindi' || s === 'yangi') return 'New';
    if (s === 'yakunlandi') return 'Completed';
    if (s === 'yetkazilmoqda' || s === 'etkazib berish') return 'To Delivery';
    if (s === 'bajarilmoqda') return 'Processing';
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

  // Simple cycle status on card double click or menu click
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
    { id: 'yangi', title: 'YANGI', count: getColumnOrders('yangi').length },
    { id: 'jarayonda', title: 'JARAYONDA', count: getColumnOrders('jarayonda').length },
    { id: 'etkazish', title: 'ETKAZIB BERISH', count: getColumnOrders('etkazish').length },
    { id: 'yopildi', title: 'YOPILDI', count: getColumnOrders('yopildi').length }
  ];

  return (
    <div className="grid grid-cols-4 gap-4 h-full min-h-0 select-none">
      {columns.map(col => {
        const colOrders = getColumnOrders(col.id);
        return (
          <div key={col.id} className="flex flex-col bg-[#161e31]/40 border border-slate-800/40 rounded-xl p-3.5 min-h-0">
            {/* Column Header */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <span className="text-[10.5px] font-extrabold text-slate-400 tracking-wider">
                {col.title} ({col.count})
              </span>
              <button className="text-slate-500 hover:text-slate-350 cursor-pointer">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Cards Scroll Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin max-h-[170px] min-h-[140px]">
              {colOrders.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-slate-600 font-bold">
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
                      className={`p-3 bg-[#1c243b] hover:bg-[#232c48] border rounded-xl transition cursor-pointer flex flex-col gap-1.5 shadow ${
                        isNew ? 'border-emerald-500/40 bg-emerald-500/2' : 'border-slate-800/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">
                          {o.id.replace('ORD-2026-0000', 'ORDER ')}
                        </span>
                      </div>

                      <div>
                        <span className="block font-bold text-slate-200 text-xs leading-none">
                          {o.client_name}
                        </span>
                        <span className="block text-[9.5px] text-slate-450 truncate mt-1">
                          {o.address || 'Kiritilmagan'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/40 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${getBadgeStyle(o.status)}`}>
                          {getBadgeText(o.status)}
                        </span>
                        {o.price > 0 && (
                          <span className="text-[9px] font-mono text-emerald-500 font-bold">
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
