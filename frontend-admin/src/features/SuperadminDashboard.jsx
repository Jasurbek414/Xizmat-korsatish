import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem } from '../store/mockDb';
import { Building2, Plus, CheckCircle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SuperadminDashboard = ({ tab }) => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', sub_domain: '', status: 'ACTIVE', plan: 'BASIC', expires: '' });

  useEffect(() => {
    setCompanies(getDbItem('companies') || []);
  }, [tab]);

  const handleCreateCompany = (e) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.sub_domain) return;
    
    const updated = [...companies, { ...newCompany, id: 'c' + (companies.length + 1) }];
    setCompanies(updated);
    setDbItem('companies', updated);
    setShowModal(false);
    setNewCompany({ name: '', sub_domain: '', status: 'ACTIVE', plan: 'BASIC', expires: '' });
  };

  const toggleCompanyStatus = (id) => {
    const updated = companies.map(c => 
      c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } : c
    );
    setCompanies(updated);
    setDbItem('companies', updated);
  };

  if (tab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Superadmin Analytics</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Barcha kompaniyalar (tenants) umumiy nazorati</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: 'Jami Kompaniyalar', val: companies.length, icon: Building2, bg: 'bg-indigo-500/5', color: 'text-indigo-600 dark:text-indigo-400' },
            { title: 'Faol Kompaniyalar', val: companies.filter(c => c.status === 'ACTIVE').length, icon: CheckCircle, bg: 'bg-emerald-500/5', color: 'text-emerald-600 dark:text-emerald-400' },
            { title: 'Bloklanganlar', val: companies.filter(c => c.status === 'BLOCKED').length, icon: ShieldAlert, bg: 'bg-rose-500/5', color: 'text-rose-600 dark:text-rose-400' }
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{s.title}</p>
                  <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{s.val}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Kompaniyalar Ro'yxati</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Faol va bloklangan tizim ijarachilari</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Kompaniya Qo'shish
        </button>
      </div>

      {/* Companies List */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">Kompaniya</th>
                <th className="p-4">Subdomain</th>
                <th className="p-4">Tarif</th>
                <th className="p-4">Amal muddati</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                  <td className="p-4 font-semibold text-slate-800 dark:text-white">{c.name}</td>
                  <td className="p-4 text-indigo-600 dark:text-indigo-400 font-mono">https://{c.sub_domain}.servicecore.uz</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                      c.plan === 'PREMIUM' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10' 
                        : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/10'
                    }`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="p-4 font-['Outfit'] text-slate-600 dark:text-gray-300">{c.expires}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => toggleCompanyStatus(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        c.status === 'ACTIVE' 
                          ? 'border-rose-500/20 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                          : 'border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? 'Bloklash' : 'Aktivlashtirish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Yangi Kompaniya Yaratish</h3>
            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Kompaniya Nomi</label>
                <input 
                  type="text" 
                  value={newCompany.name} 
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">Subdomain</label>
                <input 
                  type="text" 
                  value={newCompany.sub_domain} 
                  onChange={(e) => setNewCompany({...newCompany, sub_domain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="masalan: expressmail"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-gray-400 mb-1">Tarif Plan</label>
                  <select 
                    value={newCompany.plan} 
                    onChange={(e) => setNewCompany({...newCompany, plan: e.target.value})}
                    className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="BASIC" className="bg-white dark:bg-[#111827]">BASIC</option>
                    <option value="PREMIUM" className="bg-white dark:bg-[#111827]">PREMIUM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-gray-400 mb-1">Amal qilish muddati</label>
                  <input 
                    type="date" 
                    value={newCompany.expires} 
                    onChange={(e) => setNewCompany({...newCompany, expires: e.target.value})}
                    className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboard;
