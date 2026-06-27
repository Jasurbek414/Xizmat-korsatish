import React, { useState, useEffect } from 'react';
import { getDbItem } from '../store/mockDb';
import { 
  ShoppingCart, Users, DollarSign, Navigation, Activity, 
  ArrowUpRight, ArrowDownRight, Calendar, Wallet, Trophy, CheckCircle 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminDashboard = ({ tab }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('all'); // 'today', '7days', '30days', 'all'
  
  // Dashboard states
  const [stats, setStats] = useState({ orders: 0, clients: 0, income: 0, drivers: 0 });
  const [sparklines, setSparklines] = useState({ orders: '', income: '', clients: '' });
  const [recentOrders, setRecentOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  
  // Chart and Donut states
  const [chartData, setChartData] = useState({ income: [], expense: [], labels: [] });
  const [donutSegments, setDonutSegments] = useState([]);

  useEffect(() => {
    // Fetch data
    const orders = getDbItem('orders') || [];
    const clients = getDbItem('clients') || [];
    const transactions = getDbItem('transactions') || [];
    const users = getDbItem('users') || [];
    const orderStatuses = getDbItem('order_statuses') || [];
    const dbWallets = getDbItem('wallets') || [];

    setStatuses(orderStatuses);
    setWallets(dbWallets);

    // Calculate cut-off date based on timeRange
    const now = new Date();
    let cutOffDate = new Date(0); // default to epoch (all time)

    if (timeRange === 'today') {
      cutOffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === '7days') {
      cutOffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30days') {
      cutOffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 1. Filter orders and transactions
    const filteredOrders = orders.filter(o => new Date(o.created_at || now) >= cutOffDate);
    const filteredTransactions = transactions.filter(t => new Date(t.created_at || now) >= cutOffDate);

    // 2. Compute Main Stats
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER')
      .reduce((sum, item) => sum + item.amount, 0);

    const activeDriversCount = users.filter(u => u.role === 'WORKER_DRIVER' && u.status === 'ACTIVE').length;

    setStats({
      orders: filteredOrders.length,
      clients: clients.length, // total registered clients is general
      income: totalIncome,
      drivers: activeDriversCount
    });

    // 3. Set recent orders list (up to 5)
    setRecentOrders(filteredOrders.slice(-5).reverse());

    // 4. Generate Sparkline paths (mini SVGs)
    setSparklines({
      orders: generateSparkline(filteredOrders, timeRange, now, 'count'),
      income: generateSparkline(filteredTransactions.filter(t => t.type === 'INCOME' && t.category !== 'TRANSFER'), timeRange, now, 'amount'),
      clients: generateSparkline(clients, timeRange, now, 'count')
    });

    // 5. Generate dynamic chart data (Income vs Expense)
    setChartData(generateChartPoints(filteredTransactions, timeRange, now));

    // 6. Generate Donut Chart Segments (Status distribution)
    setDonutSegments(generateDonutSegments(filteredOrders, orderStatuses));

    // 7. Calculate Top Drivers
    setTopDrivers(calculateTopDrivers(filteredOrders, users));

  }, [tab, timeRange]);

  // Helper: generates sparkline SVG points string
  const generateSparkline = (items, range, now, valueKey) => {
    let intervals = 6;
    let values = new Array(intervals).fill(0);
    const intervalMs = getIntervalMs(range);

    items.forEach(item => {
      const itemTime = new Date(item.created_at || item.date || now).getTime();
      const diff = now.getTime() - itemTime;
      const bucket = Math.min(intervals - 1, Math.max(0, intervals - 1 - Math.floor(diff / intervalMs)));
      if (valueKey === 'amount') {
        values[bucket] += item.amount || 0;
      } else {
        values[bucket] += 1;
      }
    });

    const maxVal = Math.max(...values, 1);
    const width = 80;
    const height = 25;
    return values.map((val, i) => {
      const x = (i * width) / (intervals - 1);
      const y = height - (val * (height - 4)) / maxVal - 2;
      return `${x},${y}`;
    }).join(' ');
  };

  const getIntervalMs = (range) => {
    if (range === 'today') return (24 * 60 * 60 * 1000) / 6;
    if (range === '7days') return (7 * 24 * 60 * 60 * 1000) / 6;
    if (range === '30days') return (30 * 24 * 60 * 60 * 1000) / 6;
    return (365 * 24 * 60 * 60 * 1000) / 6; // default yearly
  };

  // Helper: generates coordinates and labels for main chart
  const generateChartPoints = (txs, range, now) => {
    let buckets = 6;
    let income = new Array(buckets).fill(0);
    let expense = new Array(buckets).fill(0);
    let labels = [];
    const intervalMs = getIntervalMs(range);

    // Populate labels
    for (let i = buckets - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * intervalMs);
      if (range === 'today') {
        labels.push(`${date.getHours()}:00`);
      } else if (range === '7days') {
        labels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
      } else if (range === '30days') {
        labels.push(`${date.getDate()}-${date.toLocaleDateString(undefined, { month: 'short' })}`);
      } else {
        labels.push(date.toLocaleDateString(undefined, { month: 'short' }));
      }
    }

    txs.forEach(t => {
      if (t.category === 'TRANSFER') return;
      const tTime = new Date(t.created_at || now).getTime();
      const diff = now.getTime() - tTime;
      const bucket = Math.min(buckets - 1, Math.max(0, buckets - 1 - Math.floor(diff / intervalMs)));
      if (t.type === 'INCOME') {
        income[bucket] += t.amount;
      } else {
        expense[bucket] += t.amount;
      }
    });

    return { income, expense, labels };
  };

  // Helper: Generates SVG circle segment values for donut ring
  const generateDonutSegments = (orders, statuses) => {
    if (orders.length === 0) return [];
    
    // Count status occurrences
    const counts = {};
    orders.forEach(o => {
      counts[o.status_id] = (counts[o.status_id] || 0) + 1;
    });

    let totalOffset = 0;
    const circumference = 2 * Math.PI * 18; // 2 * pi * r (r=18) -> ~113.1

    return statuses.map(status => {
      const count = counts[status.id] || 0;
      const percentage = (count / orders.length) * 100;
      const strokeLength = (count / orders.length) * circumference;
      const dashArray = `${strokeLength} ${circumference}`;
      const dashOffset = -totalOffset;
      totalOffset += strokeLength;

      return {
        ...status,
        count,
        percentage: Math.round(percentage),
        dashArray,
        dashOffset
      };
    }).filter(s => s.count > 0);
  };

  // Helper: calculates Top Drivers list
  const calculateTopDrivers = (orders, users) => {
    const drivers = users.filter(u => u.role === 'WORKER_DRIVER');
    const driverStats = drivers.map(d => {
      // Completed orders count
      const completedCount = orders.filter(o => o.worker_name === d.full_name && o.status_id === '4').length;
      // 10% commission earnings
      const kpiEarnings = orders
        .filter(o => o.worker_name === d.full_name && o.status_id === '4')
        .reduce((sum, item) => sum + (item.price * 0.1), 0);

      return {
        ...d,
        completedCount,
        kpiEarnings
      };
    });

    // Sort descending by completed count and take top 3
    return driverStats.sort((a, b) => b.completedCount - a.completedCount).slice(0, 3);
  };

  // Generate chart paths
  const getCoordinates = (points) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = Math.max(...points, 100000);
    return points.map((p, i) => {
      const x = padding + (i * (width - padding * 2)) / (points.length - 1);
      const y = height - padding - (p * (height - padding * 2)) / maxVal;
      return `${x},${y}`;
    }).join(' ');
  };

  const incomePath = getCoordinates(chartData.income);
  const expensePath = getCoordinates(chartData.expense);

  const getStatusBadge = (statusId) => {
    const status = statuses.find(s => s.id === statusId);
    if (!status) return null;
    return (
      <span 
        style={{ backgroundColor: status.color_code + '12', color: status.color_code, borderColor: status.color_code + '25' }}
        className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold border tracking-wide uppercase"
      >
        {status.name_uz}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls & time range select */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('menu.dashboard')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('dashboard.analytics_desc')}</p>
        </div>

        {/* Time Period Filter Pill Buttons */}
        <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-1 rounded-xl w-fit text-[10px] font-bold">
          {[
            { id: 'today', label: t('dashboard.today_filter') },
            { id: '7days', label: t('dashboard.last_7_days') },
            { id: '30days', label: t('dashboard.last_30_days') },
            { id: 'all', label: t('dashboard.all_time') }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setTimeRange(btn.id)}
              className={`px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                timeRange === btn.id
                  ? 'bg-white dark:bg-white/10 text-indigo-650 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid with Mini SVG Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            title: t('dashboard.orders'), 
            val: `${stats.orders} ta`, 
            spark: sparklines.orders,
            icon: ShoppingCart, 
            bg: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400' 
          },
          { 
            title: t('dashboard.revenue'), 
            val: `${stats.income.toLocaleString()} ${getDbItem('company_settings')?.currency || 'so\'m'}`, 
            spark: sparklines.income,
            icon: DollarSign, 
            bg: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400' 
          },
          { 
            title: t('dashboard.clients'), 
            val: `${stats.clients} ta`, 
            spark: sparklines.clients,
            icon: Users, 
            bg: 'bg-sky-500/10 text-sky-650 dark:text-sky-400' 
          },
          { 
            title: t('dashboard.active_drivers'), 
            val: `${stats.drivers} ta`, 
            spark: null, // Driver stats don't need sparklines
            icon: Navigation, 
            bg: 'bg-amber-500/10 text-amber-650 dark:text-amber-400' 
          }
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm hover:border-slate-350 dark:hover:border-white/10 transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{s.title}</span>
                <span className={`p-1.5 rounded-lg ${s.bg}`}>
                  <Icon className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="flex items-end justify-between mt-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit'] leading-none">{s.val}</h3>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 font-medium">joriy tanlangan davrda</span>
                </div>
                {s.spark && (
                  <svg className="w-20 h-6 overflow-visible text-indigo-500" viewBox="0 0 80 25">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      points={s.spark}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Row: Income/Expense Graph & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Monthly/Hourly P&L Area Chart (spans 2 columns) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit']">{t('dashboard.monthly_flow')}</h4>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Haqiqiy moliya operatsiyalari va oqimi asosida</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                <span className="text-slate-600 dark:text-gray-400">{t('finance_page.income')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                <span className="text-slate-600 dark:text-gray-400">{t('finance_page.expense')}</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[160px]">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="20" x2="480" y2="20" stroke="currentColor" className="text-slate-100 dark:text-white/3" strokeDasharray="4 4" />
              <line x1="20" y1="75" x2="480" y2="75" stroke="currentColor" className="text-slate-100 dark:text-white/3" strokeDasharray="4 4" />
              <line x1="20" y1="130" x2="480" y2="130" stroke="currentColor" className="text-slate-150 dark:text-white/5" />

              {/* Area Fills */}
              <path d={`M20,130 L${incomePath} L480,130 Z`} fill="url(#incomeGrad)" />
              <path d={`M20,130 L${expensePath} L480,130 Z`} fill="url(#expenseGrad)" />

              {/* Paths */}
              <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" points={incomePath} strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={expensePath} strokeLinecap="round" strokeLinejoin="round" />

              {/* Dots */}
              {chartData.income.map((p, i) => {
                const x = 20 + (i * 460) / 5;
                const maxVal = Math.max(...chartData.income, 100000);
                const y = 150 - 20 - (p * 110) / maxVal;
                return (
                  <circle key={`in-${i}`} cx={x} cy={y} r="3.5" fill="#6366f1" className="stroke-white dark:stroke-[#111827] stroke-2 cursor-pointer" />
                );
              })}
              {chartData.expense.map((p, i) => {
                const x = 20 + (i * 460) / 5;
                const maxVal = Math.max(...chartData.expense, 100000);
                const y = 150 - 20 - (p * 110) / maxVal;
                return (
                  <circle key={`ex-${i}`} cx={x} cy={y} r="3.5" fill="#f43f5e" className="stroke-white dark:stroke-[#111827] stroke-2 cursor-pointer" />
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between px-3 mt-2 text-[10px] font-bold text-slate-400 dark:text-gray-500 font-mono">
            {chartData.labels.map((label, idx) => <span key={idx}>{label}</span>)}
          </div>
        </div>

        {/* Right: SVG Donut status breakdown */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-5">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit']">{t('dashboard.status_distribution')}</h4>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">Buyurtmalar joriy hayotiy holati</p>
          </div>

          <div className="flex items-center justify-around gap-2">
            {/* SVG Donut */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="18" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-white/3" strokeWidth="4.5" />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r="18"
                    fill="transparent"
                    stroke={seg.color_code}
                    strokeWidth="4.5"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{stats.orders}</span>
                <span className="text-[8px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">JAMI</span>
              </div>
            </div>

            {/* Legend indicators */}
            <div className="space-y-1.5 text-[9px] font-bold text-slate-500 dark:text-gray-400 w-full pl-3">
              {donutSegments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span style={{ backgroundColor: seg.color_code }} className="w-2 h-2 rounded-full shrink-0" />
                    <span className="truncate">{seg.name_uz}</span>
                  </div>
                  <span className="font-mono text-slate-700 dark:text-white font-bold">{seg.percentage}%</span>
                </div>
              ))}
              {donutSegments.length === 0 && (
                <div className="text-[10px] text-slate-400 dark:text-gray-500 font-medium text-center">{t('dashboard.no_data')}</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Top Drivers & Kassa Balances & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Top Performing Drivers */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit'] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
            {t('dashboard.top_drivers')}
          </h4>
          
          <div className="space-y-3.5">
            {topDrivers.map((driver, idx) => (
              <div key={driver.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {driver.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-850 dark:text-white">{driver.full_name}</div>
                    <div className="text-[9px] text-slate-400 dark:text-gray-500 font-mono mt-0.5">{driver.completedCount} {t('dashboard.completed_orders_count')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-['Outfit'] text-indigo-650 dark:text-indigo-400">+{driver.kpiEarnings.toLocaleString()}</span>
                  <span className="block text-[8px] text-slate-400 dark:text-gray-500">10% KPI</span>
                </div>
              </div>
            ))}
            {topDrivers.length === 0 && (
              <div className="text-center py-6 text-slate-400 dark:text-gray-500 font-semibold">{t('dashboard.no_data')}</div>
            )}
          </div>
        </div>

        {/* 2. Kassa Wallets Balances (linked dynamically to Finance) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit'] flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            {t('settings_page.wallet_balances')}
          </h4>
          
          <div className="space-y-3">
            {wallets.map(wallet => (
              <div key={wallet.id} className="p-3 bg-slate-50 dark:bg-white/2 border border-slate-150 dark:border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-700 dark:text-white">
                    {t('common.language') === 'ru' ? wallet.name_ru : t('common.language') === 'en' ? wallet.name_en : wallet.name_uz}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-bold">{wallet.id} wallet</span>
                </div>
                <span className="font-bold text-indigo-650 dark:text-indigo-400 font-['Outfit'] text-xs">
                  {wallet.balance.toLocaleString()} {getDbItem('company_settings')?.currency || 'so\'m'}
                </span>
              </div>
            ))}
            {wallets.length === 0 && (
              <div className="text-center py-6 text-slate-400 dark:text-gray-500 font-semibold">{t('dashboard.no_data')}</div>
            )}
          </div>
        </div>

        {/* 3. Recent Orders */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-white text-sm font-['Outfit'] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-500" />
            {t('dashboard.recent_orders')}
          </h4>
          
          <div className="space-y-3.5">
            {recentOrders.slice(0, 3).map((o) => (
              <div key={o.id} className="flex justify-between items-start gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-855 dark:text-white truncate max-w-[140px]">{o.client_name}</div>
                  <div className="text-[9px] text-slate-400 dark:text-gray-500 truncate max-w-[140px] mt-0.5">{o.service_name}</div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="font-bold font-['Outfit'] text-slate-800 dark:text-white">{o.price.toLocaleString()} UZS</div>
                  {getStatusBadge(o.status_id)}
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-center py-6 text-slate-400 dark:text-gray-500 font-semibold">{t('dashboard.no_data')}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
