import React from 'react';
import { Phone, MapPin, User, ChevronRight, Ruler, Printer, Eye, Clock, CheckCircle2 } from 'lucide-react';

const OrdersKanban = ({ orders, statuses, onStatusChange, onOpenDetails, onOpenPrint }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[600px] items-start">
      {statuses.map((status, colIdx) => {
        const colOrders = orders.filter(o => o.status_id === status.id);
        const colTotalSum = colOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const colTotalArea = colOrders.reduce((sum, o) => {
          const orderArea = (o.items || []).reduce((iSum, i) => iSum + ((parseFloat(i.length) || 0) * (parseFloat(i.width) || 0)), 0);
          return sum + orderArea;
        }, 0).toFixed(1);

        const nextStatus = colIdx < statuses.length - 1 ? statuses[colIdx + 1] : null;

        return (
          <div
            key={status.id}
            className="w-80 shrink-0 flex flex-col max-h-[80vh] rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 backdrop-blur-md"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: status.color_code || '#3b82f6' }}
                  />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {status.name_uz}
                  </h4>
                </div>
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-white dark:bg-white/10 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/5 shadow-2xs">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Stats */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-gray-500 mt-2 px-0.5">
                <span>{colTotalArea > 0 ? `${colTotalArea} m²` : '0 m²'}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {colTotalSum > 0 ? `${colTotalSum.toLocaleString()} UZS` : '0 UZS'}
                </span>
              </div>
            </div>

            {/* Column Cards Container */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {colOrders.length === 0 ? (
                <div className="text-center py-10 text-[11px] font-medium text-slate-400 dark:text-gray-500 italic">
                  Buyurtmalar yo'q
                </div>
              ) : (
                colOrders.map(order => {
                  const itemsCount = (order.items || []).length;
                  const orderArea = (order.items || []).reduce((sum, i) => sum + ((parseFloat(i.length) || 0) * (parseFloat(i.width) || 0)), 0).toFixed(1);

                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-[#161f30] rounded-xl p-3.5 shadow-xs border border-slate-200/70 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition group space-y-2.5"
                    >
                      {/* Card Top: Client & Phone */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5
                            onClick={() => onOpenDetails(order)}
                            className="text-xs font-bold text-slate-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer truncate"
                          >
                            {order.client_name || 'Noma\'lum mijoz'}
                          </h5>
                          {order.client_phone && (
                            <a
                              href={`tel:${order.client_phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-500 dark:text-gray-400 hover:text-indigo-600 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5 text-indigo-500" />
                              {order.client_phone}
                            </a>
                          )}
                        </div>

                        {/* Order ID Tag */}
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 shrink-0">
                          #{order.id?.slice(0, 4)}
                        </span>
                      </div>

                      {/* Address */}
                      {order.address && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-600 dark:text-gray-300 font-medium line-clamp-2">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span>{order.address}</span>
                        </div>
                      )}

                      {/* Carpets & Size Badge */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                          <Ruler className="w-2.5 h-2.5" />
                          {itemsCount > 0 ? `${itemsCount} dona (${orderArea} m²)` : "O'lchov kiritilmagan"}
                        </span>
                      </div>

                      {/* Price & Driver Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Summa</div>
                          <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            {order.price ? `${Number(order.price).toLocaleString()} UZS` : "0 UZS"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Kuryer</div>
                          <div className="text-[11px] font-bold text-slate-700 dark:text-gray-200 truncate max-w-[110px]">
                            {order.worker_name || 'Biriktirilmagan'}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenDetails(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                            title="Batafsil / Gilamlar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {onOpenPrint && (
                            <button
                              type="button"
                              onClick={() => onOpenPrint(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                              title="Chek va Birka"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {nextStatus && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(order.id, nextStatus.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition cursor-pointer"
                            title={`Statusni "${nextStatus.name_uz}"ga o'tkazish`}
                          >
                            <span>O'tkazish</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
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

export default OrdersKanban;
