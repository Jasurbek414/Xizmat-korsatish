import React from 'react';
import { X, Calendar, User, ShoppingBag, MapPin, DollarSign, Clock, FileText, CheckCircle2, Layers, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderItemsManager from './OrderItemsManager';

const OrderDetailsModal = ({ order, isOpen, onClose, statuses, onOrderUpdated, onOpenPrint }) => {
  const { t } = useTranslation();

  if (!isOpen || !order) return null;

  // Find current status details
  const currentStatusIndex = statuses.findIndex(s => s.id === order.status_id);
  const currentStatus = statuses[currentStatusIndex] || statuses[0];

  const clientPhone = order.client_phone || "Kiritilmagan";

  // Generate dynamic tracker steps
  const steps = statuses.map((st, idx) => {
    const isCompleted = idx <= currentStatusIndex;
    const isCurrent = idx === currentStatusIndex;
    return {
      ...st,
      isCompleted,
      isCurrent
    };
  });

  const formatDt = (val) => val ? new Date(val).toLocaleString('uz-UZ') : null;
  const activityLogs = [];
  if (order.updated_at && order.updated_at !== order.created_at) {
    activityLogs.push({
      title: `Joriy holat: ${currentStatus ? currentStatus.name_uz : 'Noma\'lum'}`,
      time: formatDt(order.updated_at),
      desc: `Buyurtma oxirgi marta yangilandi.`
    });
  }
  activityLogs.push({
    title: 'Buyurtma yaratildi',
    time: formatDt(order.created_at) || "Sana noma'lum",
    desc: `"${order.service_name || 'Gilam yuvish'}" xizmati uchun buyurtma yaratildi.`
  });

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 dark:border-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white ">{t('orders_page.order_detail')}</h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono uppercase tracking-wider">ID: {order.id?.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={() => onOpenPrint(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Chek va Birka
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs font-semibold">
          
          {/* Visual Order Status Tracker Step Bar */}
          <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-4">Buyurtma Holati (Status Tracker)</h4>
            
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 right-0 h-0.5 bg-slate-200 dark:bg-white/5 z-0" />
              <div 
                className="absolute left-0 h-0.5 bg-indigo-500 transition-all duration-300 z-0" 
                style={{ width: `${statuses.length > 1 ? (currentStatusIndex / (statuses.length - 1)) * 100 : 100}%` }}
              />

              {steps.map((st, idx) => (
                <div key={st.id} className="relative z-10 flex flex-col items-center">
                  <div 
                    style={{ 
                      backgroundColor: st.isCompleted ? (st.color_code || '#3b82f6') : undefined,
                      borderColor: st.isCompleted ? (st.color_code || '#3b82f6') : undefined
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      st.isCompleted 
                        ? 'text-white shadow-sm' 
                        : 'bg-white dark:bg-[#111827] border-slate-300 dark:border-white/10 text-slate-400 dark:text-gray-500'
                    } ${st.isCurrent ? 'ring-4 ring-indigo-500/20 scale-110' : ''}`}
                  >
                    {st.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] mt-1.5 max-w-[80px] text-center truncate ${
                    st.isCurrent ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500'
                  }`}>
                    {st.name_uz}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client & Worker Card */}
            <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('dashboard.client')}</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.client_name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">{clientPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">Mas'ul Haydovchi</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.worker_name || 'Biriktirilmagan'}</p>
                  {order.worker_phone && (
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">{order.worker_phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service & Price Card */}
            <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('orders_page.service_type')}</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.service_name || 'Gilam yuvish'}</p>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500 font-mono mt-0.5">Birlik: {order.measurement_unit || 'm²'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('orders_page.price')} & To'lov</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-extrabold ">
                    {Number(order.price || 0).toLocaleString()} UZS
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                    Holati: {order.payment_status === 'HANDED_OVER' ? "To'langan (Kassada)" : order.payment_status === 'COLLECTED' ? "Haydovchida (Topshirilmagan)" : 'Kutilmoqda'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buyurtma Tarkibi (Gilamlar ro'yxati va O'lchovlar boshqaruvi) */}
          <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
            <h5 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
              Gilamlar Ro'yxati va O'lchovlari
            </h5>
            
            <OrderItemsManager order={order} onOrderUpdated={onOrderUpdated} />
          </div>

          {/* Address & Description */}
          <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
            <div className="flex gap-2">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500">Manzil va Mo'ljal</p>
                <p className="text-xs text-slate-800 dark:text-white font-semibold mt-0.5">{order.address}</p>
              </div>
            </div>
            {order.description && (
              <div className="flex gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">Qo'shimcha Izoh</p>
                  <p className="text-xs text-slate-700 dark:text-gray-300 font-medium mt-0.5">{order.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Activity Logs Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Buyurtma tarixi</h4>
            
            <div className="relative border-l border-slate-200 dark:border-white/5 pl-4 ml-2 space-y-4 py-1">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-[#111827]" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white">{log.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">{log.time}</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400">{log.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;

