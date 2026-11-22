import React, { useEffect, useState } from 'react';
import { X, Phone, User, MapPin, Truck, Calendar, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PHONE_PREFIX = '+998 ';
const QUICK_CARPET_COUNTS = [1, 2, 3, 4, 5, 6, 8, 10];

const CreateOrderModal = ({ isOpen, onClose, clients, services, workers, newOrder, setNewOrder, onSubmit, error }) => {
  const { t } = useTranslation();
  const [selectedCarpetCount, setSelectedCarpetCount] = useState(null);

  // Phone prefix initialization
  useEffect(() => {
    if (isOpen && !newOrder.client_phone) {
      setNewOrder(prev => ({ ...prev, client_phone: PHONE_PREFIX }));
    }
  }, [isOpen]);

  // Default driver selection
  useEffect(() => {
    if (!isOpen || workers.length === 0) return;
    const exists = workers.some(w => w.id === newOrder.worker_id);
    if (!exists) {
      setNewOrder(prev => ({ ...prev, worker_id: workers[0].id }));
    }
  }, [isOpen, workers]);

  // Default service selection ("Gilam yuvish" or first service)
  useEffect(() => {
    if (!isOpen || services.length === 0) return;
    if (!newOrder.service_id) {
      const defaultSvc = services.find(s => (s.name_uz || '').toLowerCase().includes('gilam')) || services[0];
      if (defaultSvc) {
        setNewOrder(prev => ({ ...prev, service_id: defaultSvc.id, price: prev.price || '' }));
      }
    }
  }, [isOpen, services]);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith(PHONE_PREFIX)) {
      const digitsOnly = val.replace(/\D/g, '').replace(/^998/, '');
      val = PHONE_PREFIX + digitsOnly;
    }
    const cleanInput = val.replace(/\D/g, '');
    const found = clients.find(c => {
      const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
      return cleanPhone && cleanPhone.endsWith(cleanInput) && cleanInput.length >= 7;
    });

    if (found) {
      setNewOrder(prev => ({
        ...prev,
        client_phone: val,
        client_name: prev.client_name || found.fullName || found.full_name || '',
        address: prev.address || found.address || ''
      }));
    } else {
      setNewOrder(prev => ({
        ...prev,
        client_phone: val
      }));
    }
  };

  const handleQuickCount = (count) => {
    setSelectedCarpetCount(count);
    setNewOrder(prev => {
      const desc = prev.description ? prev.description.replace(/Taxminan \d+ dona gilam\.?\s*/i, '') : '';
      return {
        ...prev,
        carpet_count: count,
        description: `Taxminan ${count} dona gilam. ${desc}`.trim()
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white ">
                Yangi Gilam Yuvish Buyurtmasi
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-gray-500 font-medium">
                Mijoz ma'lumotlari va olib ketish topshirig'ini kiritish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl px-3.5 py-2.5 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 text-xs font-medium">
          
          {/* Client Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-500" /> Mijoz Telefoni *
              </label>
              <input
                type="text"
                value={newOrder.client_phone || PHONE_PREFIX}
                onChange={handlePhoneChange}
                placeholder="+998 (90) 123-45-67"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Mijoz Ism Familiyasi *
              </label>
              <input
                type="text"
                value={newOrder.client_name || ''}
                onChange={(e) => setNewOrder({ ...newOrder, client_name: e.target.value })}
                placeholder="Masalan: Jamshid Rasulov"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Address & Landmark */}
          <div>
            <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Manzil va Mo'ljal (Orientir) *
            </label>
            <input
              type="text"
              value={newOrder.address || ''}
              onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })}
              placeholder="Masalan: Go'zal mahallasi, 14-maktab orqasi, 12-uy (3-etaj)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Quick Carpet Count Selector */}
          <div className="bg-slate-50 dark:bg-white/2 p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                🔢 Taxminiy gilamlar soni
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {newOrder.carpet_count ? `${newOrder.carpet_count} dona tanlandi` : 'Ixtiyoriy'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_CARPET_COUNTS.map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleQuickCount(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                    selectedCarpetCount === num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {num} dona
                </button>
              ))}
            </div>
          </div>

          {/* Driver & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-indigo-500" /> Mas'ul Haydovchi (Kuryer) *
              </label>
              <select
                value={newOrder.worker_id || ''}
                onChange={(e) => setNewOrder({ ...newOrder, worker_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.fullName || w.full_name} ({w.phone || "Telefon yo'q"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Olib ketish vaqti / sanasi
              </label>
              <input
                type="date"
                value={newOrder.pickup_date || ''}
                onChange={(e) => setNewOrder({ ...newOrder, pickup_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Price & Service (Optional / Auto) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1">
                Xizmat turi
              </label>
              <select
                value={newOrder.service_id}
                onChange={(e) => setNewOrder({ ...newOrder, service_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-800 dark:text-white font-semibold focus:outline-none"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name_uz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1">
                Boshlang'ich narx (UZS)
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                value={newOrder.price ?? ''}
                onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                placeholder="0 (Sexda o'lchangach hisoblanadi)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white font-bold font-mono focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Bo'sh qolsa 0 deb saqlanadi va sexda hisoblanadi</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-600 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Qo'shimcha Izoh (Eslatma)
            </label>
            <textarea
              rows="2"
              value={newOrder.description || ''}
              onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
              placeholder="Masalan: Uyda 18:00 dan keyin bo'lishadi, kuchuk bor"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              Buyurtmani Yaratish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;

