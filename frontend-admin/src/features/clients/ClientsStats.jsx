import React from 'react';
import { Users, CheckCircle2, Star, Calendar } from 'lucide-react';

const ClientsStats = ({ clients, activeCount, vipCount }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[
        { title: 'Jami Mijozlar', val: `${clients.length} ta`, change: 'Barcha CRM ma\'lumotlar', icon: Users, bg: 'bg-indigo-500/5', color: 'text-indigo-600 dark:text-indigo-400' },
        { title: 'Faol Mijozlar', val: `${activeCount} ta`, change: 'Kamida 1 ta buyurtma bergan', icon: CheckCircle2, bg: 'bg-emerald-500/5', color: 'text-emerald-600 dark:text-emerald-400' },
        { title: 'VIP Mijozlar', val: `${vipCount} ta`, change: "Sarfi 200k UZS dan ko'p", icon: Star, bg: 'bg-amber-500/5', color: 'text-amber-600 dark:text-amber-400' },
        { title: 'Yangi Mijozlar', val: `2 ta`, change: 'Bugun qo\'shilganlar', icon: Calendar, bg: 'bg-sky-500/5', color: 'text-sky-600 dark:text-sky-400' }
      ].map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={idx} className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{s.title}</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{s.val}</h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">{s.change}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
              <Icon className="w-5.5 h-5.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientsStats;
