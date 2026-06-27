import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, User, DollarSign, Plus, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';

const DebtManager = ({ debts, wallets, onPayDebt, onCreateDebt }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('RECEIVABLE'); // RECEIVABLE or PAYABLE
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Debt Form State
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletForPayment, setWalletForPayment] = useState({}); // Stores which wallet was chosen per debt for payment

  // Totals calculations
  const receivables = debts.filter(d => d.type === 'RECEIVABLE' && d.status === 'ACTIVE');
  const payables = debts.filter(d => d.type === 'PAYABLE' && d.status === 'ACTIVE');

  const totalReceivables = receivables.reduce((sum, d) => sum + d.amount, 0);
  const totalPayables = payables.reduce((sum, d) => sum + d.amount, 0);

  const filteredDebts = debts.filter(d => d.type === activeTab);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!person || !amount || !description) return;

    const newDebt = {
      id: 'd' + (debts.length + 1),
      type: activeTab,
      person,
      amount: parseFloat(amount),
      description,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    onCreateDebt(newDebt);
    setPerson('');
    setAmount('');
    setDescription('');
    setShowAddForm(false);
  };

  const handleWalletSelect = (debtId, walletId) => {
    setWalletForPayment(prev => ({
      ...prev,
      [debtId]: walletId
    }));
  };

  const handlePay = (debtId) => {
    const chosenWallet = walletForPayment[debtId] || wallets[0]?.id;
    if (!chosenWallet) return;
    onPayDebt(debtId, chosenWallet);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs font-semibold">
      
      {/* Debts Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Receivables */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.total_receivables')}</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
              +{formatCurrency(totalReceivables, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500">Mijozlardan qaytishi kutilayotgan qarzlar</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Payables */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('finance_page.total_payables')}</p>
            <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-['Outfit']">
              -{formatCurrency(totalPayables, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500">Kompaniyaning hamkorlar oldidagi qarzlar</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Net Debt Status */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-transparent">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Net Balans (Farq)</p>
            <h3 className={`text-xl font-extrabold font-['Outfit'] ${totalReceivables - totalPayables >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(totalReceivables - totalPayables, i18n.language)}
            </h3>
            <p className="text-[9px] text-slate-400 dark:text-gray-500">Kutilayotgan umumiy sof balans o'zgarishi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Panel layout */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
        
        {/* Toolbar & Tab headers */}
        <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-white/5 text-[10px] font-bold">
            <button
              onClick={() => { setActiveTab('RECEIVABLE'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                activeTab === 'RECEIVABLE' 
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
              }`}
            >
              {t('finance_page.client_debts')}
            </button>
            <button
              onClick={() => { setActiveTab('PAYABLE'); setShowAddForm(false); }}
              className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                activeTab === 'PAYABLE' 
                  ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'
              }`}
            >
              {t('finance_page.supplier_debts')}
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 premium-btn text-white px-3.5 py-2 rounded-xl transition cursor-pointer w-fit text-[10px]"
          >
            <Plus className="w-3.5 h-3.5" /> {t('finance_page.record_debt')}
          </button>
        </div>

        {/* Add Debt Form Inline */}
        {showAddForm && (
          <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/1">
            <h5 className="font-extrabold text-slate-800 dark:text-white mb-3">
              {activeTab === 'RECEIVABLE' ? 'Mijozdan yangi olinadigan qarz yozish' : 'Ta\'minotchiga yangi to\'lanadigan qarz yozish'}
            </h5>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Kimdan/Kimga</label>
                <input 
                  type="text"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  placeholder="Ism yoki Tashkilot nomi"
                  className="w-full glass-input rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Summa (UZS)</label>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masalan: 150000"
                  className="w-full glass-input rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Izoh / Tafsilot</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nima uchun qarz yozildi"
                  className="w-full glass-input rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>
              <div className="flex items-end justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Debts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">Tomon</th>
                <th className="p-4">Izoh / Tavsif</th>
                <th className="p-4">Ro'yxatga olingan</th>
                <th className="p-4">Qoldiq Summa</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Harakat / To'lash hisobi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                    Qarzdorliklar mavjud emas
                  </td>
                </tr>
              ) : (
                filteredDebts.slice().reverse().map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    
                    {/* Person */}
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-slate-800 dark:text-white font-bold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {d.person}
                      </span>
                    </td>
                    
                    {/* Description */}
                    <td className="p-4 font-semibold text-slate-600 dark:text-gray-300">{d.description}</td>
                    
                    {/* Date */}
                    <td className="p-4 font-medium text-slate-500 dark:text-gray-400 font-['Outfit']">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(d.created_at, i18n.language)}
                      </span>
                    </td>
                    
                    {/* Amount */}
                    <td className={`p-4 font-extrabold font-['Outfit'] ${d.status === 'ACTIVE' ? (d.type === 'RECEIVABLE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600') : 'text-slate-400 line-through'}`}>
                      {formatCurrency(d.amount, i18n.language)}
                    </td>
                    
                    {/* Status */}
                    <td className="p-4 font-bold uppercase text-[9px]">
                      {d.status === 'PAID' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
                          <CheckCircle className="w-3 h-3" /> So'ndirilgan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg w-fit">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> Faol Qarz
                        </span>
                      )}
                    </td>

                    {/* Actions: Select payment account and pay */}
                    <td className="p-4 text-right">
                      {d.status === 'ACTIVE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={walletForPayment[d.id] || (wallets[0]?.id || '')}
                            onChange={(e) => handleWalletSelect(d.id, e.target.value)}
                            className="glass-input rounded-xl px-2 py-1 text-[10px] focus:outline-none cursor-pointer w-28 bg-white dark:bg-[#111827]"
                          >
                            {wallets.map(w => {
                              const wName = i18n.language === 'uz' ? w.name_uz : i18n.language === 'ru' ? w.name_ru : w.name_en;
                              return (
                                <option key={w.id} value={w.id}>
                                  {wName}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            onClick={() => handlePay(d.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            {t('finance_page.pay_debt')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">To'lov tugallangan</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default DebtManager;
