import React from 'react';
import { X, Calendar, User, ShoppingBag, MapPin, DollarSign, Clock, FileText, CheckCircle2, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrderDetailsModal = ({ order, isOpen, onClose, statuses, clients }) => {
  const { t } = useTranslation();

  if (!isOpen || !order) return null;

  // Find current status details
  const currentStatusIndex = statuses.findIndex(s => s.id === order.status_id);
  const currentStatus = statuses[currentStatusIndex] || statuses[0];

  // Look up client phone
  const clientObj = clients.find(c => {
    const cName = (c.fullName || c.full_name || '').toLowerCase();
    const oName = (order.client_name || '').toLowerCase();
    return cName && cName === oName;
  });
  const clientPhone = clientObj ? clientObj.phone : '+998 90 123 45 67';

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

  // Mocked activity logs based on order status history
  const activityLogs = [
    {
      title: 'Buyurtma yaratildi',
      time: 'Bugun, 10:00',
      desc: `Admin tomonidan "${order.service_name}" xizmati buyurtmasi yaratildi.`,
      statusId: '1'
    }
  ];

  if (currentStatusIndex >= 1) {
    activityLogs.unshift({
      title: 'Kuryer tayinlandi',
      time: 'Bugun, 10:30',
      desc: `Mas'ul haydovchi ${order.worker_name} buyurtmaga biriktirildi.`,
      statusId: '2'
    });
  }
  if (currentStatusIndex >= 2) {
    activityLogs.unshift({
      title: 'Bajarish boshlandi',
      time: 'Bugun, 11:15',
      desc: `Haydovchi ${order.worker_name} xizmat ko'rsatishni boshladi.`,
      statusId: '3'
    });
  }
  if (currentStatusIndex >= 3) {
    activityLogs.unshift({
      title: 'Yakunlandi',
      time: 'Bugun, 12:00',
      desc: 'Buyurtma muvaffaqiyatli yakunlandi va hisob-kitob qilindi.',
      statusId: '4'
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-white/5">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">{t('orders_page.order_detail')}</h3>
              <p className="text-[9px] text-slate-400 dark:text-gray-500 font-mono uppercase tracking-wider">ID: {order.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs font-semibold">
          
          {/* Visual Order Status Tracker Step Bar */}
          <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-5 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-5">Buyurtma Holati (Status Tracker)</h4>
            
            <div className="relative flex items-center justify-between">
              {/* Connector lines behind steps */}
              <div className="absolute left-0 right-0 h-0.5 bg-slate-200 dark:bg-white/5 z-0" />
              <div 
                className="absolute left-0 h-0.5 bg-indigo-500 transition-all duration-300 z-0" 
                style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
              />

              {steps.map((st, idx) => (
                <div key={st.id} className="relative z-10 flex flex-col items-center">
                  <div 
                    style={{ 
                      backgroundColor: st.isCompleted ? st.color_code : undefined,
                      borderColor: st.isCompleted ? st.color_code : undefined
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      st.isCompleted 
                        ? 'text-white shadow-sm' 
                        : 'bg-white dark:bg-[#111827] border-slate-300 dark:border-white/10 text-slate-400 dark:text-gray-500'
                    } ${st.isCurrent ? 'ring-4 ring-indigo-500/20 scale-110' : ''}`}
                  >
                    {st.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={`text-[9px] font-bold mt-2 text-center absolute top-6 w-24 truncate ${
                    st.isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-gray-500'
                  }`}>
                    {st.name_uz}
                  </span>
                </div>
              ))}
            </div>
            {/* Spacing for labels */}
            <div className="h-6" />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Left: Client & Worker info */}
            <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Aloqa ma'lumotlari</h5>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">Mijoz</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.client_name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">{clientPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('orders_page.worker')}</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.worker_name}</p>
                </div>
              </div>
            </div>

            {/* Right: Order details */}
            <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Xizmat va Vaqt</h5>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('orders_page.service_type')}</p>
                  <p className="text-xs text-slate-800 dark:text-white font-bold">{order.service_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">Olingan / Yaratilgan Vaqti</p>
                  <p className="text-xs text-slate-800 dark:text-white font-mono font-bold">
                    {order.created_at ? new Date(order.created_at).toLocaleString('uz-UZ') : "Kiritilmagan"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-gray-500">{t('orders_page.price')} & To'lov</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold font-['Outfit']">
                    {order.price.toLocaleString()} UZS
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                    Holati: {order.payment_status === 'HANDED_OVER' ? 'Kassaga topshirilgan' : order.payment_status === 'COLLECTED' ? 'Topshirish kutilmoqda' : 'Kutilmoqda'}
                    {order.collected_price ? ` (${order.collected_price.toLocaleString()} UZS)` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buyurtma Tarkibi (Gilamlar ro'yxati) */}
          <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
            <div className="flex justify-between items-center mb-1">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                Buyurtma Tarkibi ({order.items ? order.items.length : 0} ta mahsulot)
              </h5>
            </div>
            
            {(!order.items || order.items.length === 0) ? (
              <p className="text-xs text-slate-400 dark:text-gray-500 italic">Hozircha mahsulot/gilamlar kiritilmagan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 px-2">Mahsulot Nomi</th>
                      <th className="py-2 px-2">O'lchami (Bo'yi x Eni)</th>
                      <th className="py-2 px-2">Yuzi / Soni</th>
                      <th className="py-2 pl-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {order.items.map((item, iIdx) => {
                      const isArea = (item.length > 0 && item.width > 0);
                      const area = (item.length * item.width * item.quantity).toFixed(1);
                      return (
                        <tr key={item.id || iIdx}>
                          <td className="py-2 pr-2 text-slate-400 font-mono text-[10px]">{iIdx + 1}</td>
                          <td className="py-2 px-2 font-bold text-slate-800 dark:text-white">{item.name || 'Gilam'}</td>
                          <td className="py-2 px-2 font-mono text-slate-600 dark:text-gray-300">
                            {isArea ? `${item.length}m x ${item.width}m` : '-'}
                          </td>
                          <td className="py-2 px-2 font-semibold text-indigo-600 dark:text-indigo-400">
                            {isArea ? `${area} m² (${item.quantity} dona)` : `${item.quantity} dona`}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.status === 'READY' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              item.status === 'DRIED' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                              item.status === 'WASHED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {item.status === 'READY' ? 'Tayyor' : item.status === 'DRIED' ? 'Quritildi' : item.status === 'WASHED' ? 'Yuvildi' : 'Qabul qilingan'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Address & Description */}
          <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 bg-white dark:bg-transparent shadow-xs">
            <div className="flex gap-2">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] text-slate-400 dark:text-gray-500">Manzil</p>
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
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Buyurtma tarixi (Activity Timeline)</h4>
            
            <div className="relative border-l border-slate-200 dark:border-white/5 pl-4 ml-2 space-y-4 py-1">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-[#111827]" />
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-gray-500 font-bold">
                      <span>{log.title}</span>
                      <span className="font-mono">{log.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-gray-300 font-medium">{log.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
