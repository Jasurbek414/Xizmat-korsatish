import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getDbItem, setDbItem } from '../store/mockDb';

// Child components
import ClientList from './ClientList';
import AddClientModal from './AddClientModal';
import KanbanBoard from './KanbanBoard';

const Clients = ({ onCallTrigger, onSelectIntakeClient }) => {
  const [clients, setClients] = useState(() => getDbItem('dispatcher_clients') || []);
  const [orders, setOrders] = useState(() => getDbItem('dispatcher_orders') || []);
  const [showAddClient, setShowAddClient] = useState(false);

  // Reload data reactively when localStorage is updated
  useEffect(() => {
    const handleStorageChange = () => {
      setClients(getDbItem('dispatcher_clients') || []);
      setOrders(getDbItem('dispatcher_orders') || []);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Client actions
  const handleAddClient = (clientData) => {
    const client = {
      id: 'cl_' + Date.now(),
      full_name: clientData.full_name,
      phone: clientData.phone,
      address: clientData.address || 'Kiritilmagan',
      client_type: clientData.client_type || 'Standard'
    };

    const updated = [client, ...clients];
    setClients(updated);
    setDbItem('dispatcher_clients', updated);
    setShowAddClient(false);
    
    // Automatically load newly created client to intake sheet
    if (onSelectIntakeClient) {
      onSelectIntakeClient(client);
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    setDbItem('dispatcher_orders', updated);
  };

  const handleCallClient = (client) => {
    if (onCallTrigger) {
      onCallTrigger(client.phone, client.full_name);
    }
  };

  // Get active order count
  const activeOrdersCount = orders.filter(o => o.status !== 'Yakunlandi' && o.status !== 'Bekor qilindi').length;

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 text-xs font-semibold select-none">
      
      {/* Top Panel: Faol Buyurtmalar (Kanban Board) */}
      <div className="flex-1 min-h-0 bg-[#111522] border border-white/[0.04] rounded-2xl p-5 flex flex-col shadow-2xl">
        <div className="border-b border-white/[0.04] pb-3.5 mb-4 shrink-0">
          <span className="text-[11px] font-extrabold text-slate-100 uppercase tracking-widest border-b-2 border-indigo-500 pb-2.5 font-outfit">
            Faol Buyurtmalar <span className="ml-1 text-slate-500 font-bold">({activeOrdersCount})</span>
          </span>
        </div>
        
        <div className="flex-1 min-h-0">
          <KanbanBoard
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onSelectOrderClient={onSelectIntakeClient}
          />
        </div>
      </div>

      {/* Bottom Panel: Mijozlar List */}
      <div className="flex-1 min-h-0 bg-[#111522] border border-white/[0.04] rounded-2xl p-5 flex flex-col shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/[0.04] pb-3 mb-4 shrink-0">
          <span className="text-[11px] font-extrabold text-slate-100 uppercase tracking-widest border-b-2 border-indigo-500 pb-2 font-outfit">
            Mijozlar Bazasi <span className="ml-1 text-slate-500 font-bold">({clients.length})</span>
          </span>
          <button
            type="button"
            onClick={() => setShowAddClient(true)}
            className="text-[10px] text-indigo-400 font-extrabold hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer font-outfit uppercase tracking-wider"
          >
            + Yangi mijoz qo'shish
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <ClientList
            clients={clients}
            onSelectClient={onSelectIntakeClient}
            onAddClientClick={() => setShowAddClient(true)}
            onCallClick={handleCallClient}
          />
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onAdd={handleAddClient}
      />

    </div>
  );
};

export default Clients;
