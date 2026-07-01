import React, { useState, useEffect } from 'react';
import { ClipboardList, Trash2, Clock, Check, AlertCircle } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

const STATUS_OPTS = [
  { name: 'Qabul qilindi', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { name: 'Tayyorlanmoqda', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { name: 'Yo\'lda', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { name: 'Yetkazildi', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
];

const ZakazHolati = () => {
  const [orders, setOrders] = useState([]);

  const loadOrders = () => {
    const list = getDbItem('dispatcher_orders') || [];
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
    const handleStorageChange = () => {
      loadOrders();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleStatusChange = (orderId, newStatus) => {
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, status: newStatus };
      }
      return ord;
    });
    setOrders(updated);
    setDbItem('dispatcher_orders', updated);
  };

  const handleDeleteOrder = (orderId) => {
    if (!window.confirm("Buyurtmani o'chirmoqchimisiz?")) return;
    const updated = orders.filter(ord => ord.id !== orderId);
    setOrders(updated);
    setDbItem('dispatcher_orders', updated);
  };

  const getStatusClass = (statusName) => {
    const opt = STATUS_OPTS.find(o => o.name === statusName);
    return opt ? opt.color : 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 w-full h-full flex flex-col gap-4 text-xs font-semibold text-[var(--text-primary)] shadow-2xl transition-colors duration-300 min-h-0 select-none">
      
      {/* Header title */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3.5 shrink-0 select-none">
        <ClipboardList className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-[var(--text-secondary)] font-outfit">Zakaz Holati</span>
      </div>

      {/* Orders Scroll container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin min-h-[140px]">
        {orders.length === 0 ? (
          <div className="text-center py-10 text-[9.5px] text-[var(--text-muted)] font-bold uppercase tracking-wider select-none">
            Hozircha buyurtmalar yo'q
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)]/80 transition-all duration-200 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[var(--text-primary)] text-xs leading-none truncate">
                    {order.client_name}
                  </span>
                  <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] leading-none">
                    ({order.phone})
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[var(--text-secondary)] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-mono text-[9px]">
                    {order.tovar_nomi || 'Nomalum'}
                  </span>
                  {order.izoh && (
                    <span className="truncate opacity-85">
                      • {order.izoh}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[8.5px] text-[var(--text-muted)] font-mono mt-1.5 leading-none">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{order.created_at}</span>
                </div>
              </div>

              {/* Status Select Badge & Delete */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Custom Styled Select Badge */}
                <div className={`relative border rounded-lg px-2 py-1 flex items-center justify-center transition ${getStatusClass(order.status)}`}>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="bg-transparent border-none text-[8.5px] font-extrabold uppercase cursor-pointer focus:outline-none appearance-none pr-1"
                  >
                    {STATUS_OPTS.map(opt => (
                      <option key={opt.name} value={opt.name} className="bg-[var(--bg-card)] text-[var(--text-primary)] font-bold">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(order.id)}
                  className="w-7 h-7 rounded-lg bg-[var(--bg-keypad-btn)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-550 flex items-center justify-center transition cursor-pointer border border-[var(--border-color)]"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default ZakazHolati;
