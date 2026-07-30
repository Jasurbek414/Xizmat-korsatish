import React from 'react';

// Buyurtma tarkibidagi gilamlar (OrderItem) jadvali - OrderDetailsModal va
// Buxgalteriya (FinanceTable) bo'limlarida bir xil ko'rinishda ishlatiladi.
const OrderItemsBreakdownTable = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-400 dark:text-gray-500 italic">Hozircha mahsulot/gilamlar kiritilmagan</p>;
  }

  return (
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
          {items.map((item, iIdx) => {
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
  );
};

export default OrderItemsBreakdownTable;
