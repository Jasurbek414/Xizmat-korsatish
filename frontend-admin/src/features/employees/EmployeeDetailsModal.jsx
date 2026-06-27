import React from 'react';
import { X, User, Phone, Briefcase, Star, MapPin, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

const EmployeeDetailsModal = ({ isOpen, onClose, user, orders = [] }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen || !user) return null;

  // Calculate stats based on orders list
  const workerOrders = orders.filter(o => o.worker_name.toLowerCase() === user.full_name.toLowerCase());
  const completedOrders = workerOrders.filter(o => o.status_id === '4');

  // Map settings
  const lat = user.lat || 41.311081;
  const lng = user.lng || 69.240562;
  const bboxLeft = lng - 0.005;
  const bboxBottom = lat - 0.003;
  const bboxRight = lng + 0.005;
  const bboxTop = lat + 0.003;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft}%2C${bboxBottom}%2C${bboxRight}%2C${bboxTop}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-white/5 text-xs font-semibold">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <User className="w-4 h-4" />
            <span className="font-extrabold text-sm font-['Outfit']">Xodim Tafsilotlari</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 my-3">
          {/* Card Summary */}
          <div className="bg-slate-50 dark:bg-white/2 p-4 rounded-xl border border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Xodim F.I.SH</p>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1">{user.full_name}</h4>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">@{user.username} (ID: {user.id})</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('employees_page.role')}</p>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold inline-block mt-1.5 ${
                user.role === 'WORKER_DRIVER'
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/10'
                  : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/10'
              }`}>
                {user.role === 'WORKER_DRIVER' ? t('employees_page.worker_driver') : t('employees_page.office_staff')}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('employees_page.phone')}</p>
              <p className="text-[11px] font-mono text-slate-700 dark:text-gray-300 mt-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Muvaffaqiyat ko'rsatkichi</p>
              <div className="flex items-center gap-1 mt-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-500" />
                <span>4.8 / 5.0 Rating</span>
              </div>
            </div>
          </div>

          {/* Workload Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-100 dark:border-white/5 rounded-xl p-4 flex items-center justify-between bg-slate-50/50 dark:bg-white/1">
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Jami Biriktirilgan</p>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white font-['Outfit'] mt-1">{workerOrders.length} ta</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="border border-slate-100 dark:border-white/5 rounded-xl p-4 flex items-center justify-between bg-slate-50/50 dark:bg-white/1">
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{t('employees_page.orders_completed')}</p>
                <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit'] mt-1">{completedOrders.length} ta</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* Live Location tracking - only for WORKER_DRIVER */}
          {user.role === 'WORKER_DRIVER' && (
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {t('employees_page.osm_title')}
              </h5>
              
              <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 relative">
                <iframe 
                  title="OSM Live Tracking" 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight="0" 
                  marginWidth="0" 
                  src={mapUrl}
                  style={{ border: '0px' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>Latitude: {lat.toFixed(6)}</span>
                <span>Longitude: {lng.toFixed(6)}</span>
              </div>
            </div>
          )}

          {/* Recent completed orders list */}
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[9px]">Oxirgi bajarilgan buyurtmalari</h5>
            <div className="border border-slate-100 dark:border-white/5 rounded-xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
              {completedOrders.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">Hozircha yakunlangan buyurtmalar yo'q</p>
              ) : (
                completedOrders.slice(0, 3).map(ord => (
                  <div key={ord.id} className="p-3 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{ord.service_name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">ID: {ord.id} | Mijoz: {ord.client_name}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600 font-['Outfit']">+{formatCurrency(ord.price, i18n.language)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 dark:border-white/5 pt-3">
          <button 
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDetailsModal;
