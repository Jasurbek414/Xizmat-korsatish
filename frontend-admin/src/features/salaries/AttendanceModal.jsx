import React, { useState, useEffect, useCallback } from 'react';
import { X, CalendarX2, Trash2, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { confirmDialog } from '../../services/confirmDialog';
import { showToast } from '../../services/toast';

const currentPeriod = () => new Date().toISOString().slice(0, 7);

// Xodimning ishga kelmagan kunlarini belgilash/ko'rish oynasi. Bu yerda
// qayd etilgan kunlar keyingi "Oylik hisobini yaratish" bosilganda kunlik
// stavka bo'yicha avtomatik chegirmaga aylanadi (SalaryController.generatePayroll).
const AttendanceModal = ({ isOpen, onClose, employees = [] }) => {
  const [userId, setUserId] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeEmployees = employees.filter(e => e.status !== 'BLOCKED');

  useEffect(() => {
    if (isOpen) {
      setUserId(activeEmployees[0]?.id || '');
      setPeriod(currentPeriod());
      setDate('');
      setReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadAbsences = useCallback(async () => {
    if (!userId) {
      setAbsences([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getAbsences({ userId, period });
      setAbsences(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      showToast(err.message || "Davomat ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!userId || !date) return;
    setSubmitting(true);
    try {
      await api.markAbsent(userId, date, reason.trim() || undefined);
      setDate('');
      setReason('');
      await loadAbsences();
      showToast("Ishga kelmagan kun belgilandi", 'success');
    } catch (err) {
      showToast(err.message || "Belgilashda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (absence) => {
    if (!(await confirmDialog(`${absence.date} sanasidagi yozuv o'chirilsinmi?`, { danger: true }))) return;
    try {
      await api.removeAbsence(absence.id);
      await loadAbsences();
    } catch (err) {
      showToast(err.message || "O'chirishda xatolik yuz berdi");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-xs font-semibold">
      <div className="glass-card rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <CalendarX2 className="w-4 h-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Davomat (Kelmagan kunlar)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee + period selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Xodim</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {activeEmployees.length === 0 && <option value="">Xodim topilmadi</option>}
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Oy</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Add absence form */}
        <form onSubmit={handleAdd} className="bg-slate-50 dark:bg-white/2 p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Sana</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-gray-400 mb-1">Sabab (ixtiyoriy)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masalan: kasallik"
                className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!userId || !date || submitting}
            className="w-full flex items-center justify-center gap-1.5 premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Kelmagan kun sifatida belgilash
          </button>
        </form>

        {/* List of absences for the selected employee/period */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          <p className="text-slate-500 dark:text-gray-400 font-bold uppercase text-[9px] tracking-wide">
            {period} oyidagi kelmagan kunlar ({absences.length} ta)
          </p>
          {loading ? (
            <p className="text-slate-400 text-center py-4">Yuklanmoqda...</p>
          ) : absences.length === 0 ? (
            <p className="text-slate-400 text-center py-4">Bu davrda qayd etilgan yozuv yo'q</p>
          ) : (
            <div className="border border-slate-100 dark:border-white/5 rounded-xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
              {absences.map(a => (
                <div key={a.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white font-mono">{a.date}</p>
                    {a.reason && <p className="text-[9px] text-slate-400 mt-0.5">{a.reason}</p>}
                  </div>
                  <button
                    onClick={() => handleRemove(a)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};

export default AttendanceModal;
