import React from 'react';
import { ShoppingCart, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrdersStats = ({ orders, statuses }) => {
  const { t } = useTranslation();

  // Completed status is '4' (from mockDb DEFAULT_STATUSES)
  const completedStatusId = '4'; 
  const totalCount = orders.length;
  const completedCount = orders.filter(o => o.status_id === completedStatusId).length;
  const activeCount = totalCount - completedCount;
  const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);

  const stats = [
    {
      title: 'Jami Buyurtmalar',
      val: `${totalCount} ta`,
      desc: 'Barcha buyurtmalar soni',
      icon: ShoppingCart,
      bg: 'bg-indigo-500/5',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      title: 'Faol Buyurtmalar',
      val: `${activeCount} ta`,
      desc: 'Hozirda bajarilayotgan',
      icon: Clock,
      bg: 'bg-amber-500/5',
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Yakunlanganlar',
      val: `${completedCount} ta`,
      desc: 'Muvaffaqiyatli tugatilgan',
      icon: CheckCircle2,
      bg: 'bg-emerald-500/5',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Umumiy Qiymat',
      val: `${totalRevenue.toLocaleString()} UZS`,
      desc: 'Buyurtmalar aylanmasi',
      icon: DollarSign,
      bg: 'bg-sky-500/5',
      color: 'text-sky-600 dark:text-sky-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={idx} className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none bg-white dark:bg-transparent">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{s.title}</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{s.val}</h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">{s.desc}</p>
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

export default OrdersStats;
