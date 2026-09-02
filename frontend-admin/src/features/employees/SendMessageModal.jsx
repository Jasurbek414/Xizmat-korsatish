import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, Send, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Administrator/menejer o'z kompaniyasi xodimlariga (haydovchi, ishchi,
 * sex xodimi) qisqa e'lon-xabar yuboradi - push bildirishnoma + ilova
 * ichidagi bildirishnomalar tarixiga tushadi.
 */
const SendMessageModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const res = await api.broadcastToEmployees(title.trim(), body.trim());
      setSuccess(`Xabar ${res.recipientCount ?? ''} xodimga yuborildi.`);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.message || 'Xabar yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-['Outfit'] flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-500" />
            Xodimlarga xabar yuborish
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4 text-xs font-semibold">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Sarlavha</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none"
              placeholder="Masalan: Ish jadvali o'zgardi"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Xabar matni</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none min-h-[100px]"
              placeholder="Xabar matnini kiriting..."
              required
            />
          </div>

          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium leading-relaxed">
            Xabar barcha faol xodimlarning mobil ilovasiga push bildirishnoma sifatida yuboriladi
            va bildirishnomalar bo'limida saqlanadi.
          </p>

          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 premium-btn text-white font-bold py-2.5 rounded-xl transition duration-300 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendMessageModal;
