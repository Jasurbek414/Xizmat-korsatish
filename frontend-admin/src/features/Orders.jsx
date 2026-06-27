import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem, addNotification } from '../store/mockDb';
import { Plus, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import modular sub-components
import OrdersStats from './orders/OrdersStats';
import OrdersFilters from './orders/OrdersFilters';
import OrdersTable from './orders/OrdersTable';
import OrderDetailsModal from './orders/OrderDetailsModal';
import CreateOrderModal from './orders/CreateOrderModal';

const Orders = ({ tab }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [smsToast, setSmsToast] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  
  // Form State
  const [newOrder, setNewOrder] = useState({ client_id: '', service_id: '', worker_id: '', address: '', description: '', quantity: 1, measurement_unit: 'dona' });
  const [companySettings, setCompanySettings] = useState({});

  useEffect(() => {
    setOrders(getDbItem('orders') || []);
    setStatuses(getDbItem('order_statuses') || []);
    setClients(getDbItem('clients') || []);
    setServices(getDbItem('services') || []);
    setWorkers((getDbItem('users') || []).filter(u => u.role === 'WORKER_DRIVER'));
    setCompanySettings(getDbItem('company_settings') || {});
  }, [tab]);

  const triggerSmsSimulation = (event, orderInfo) => {
    const settings = getDbItem('company_settings') || {};
    if (!settings.sms_enabled) return;

    let template = '';
    if (event === 'CREATED') template = settings.sms_template_created;
    else if (event === 'ASSIGNED') template = settings.sms_template_assigned;
    else if (event === 'COMPLETED') template = settings.sms_template_completed;

    if (!template) return;

    // Find worker phone
    const dbUsers = getDbItem('users') || [];
    const workerObj = dbUsers.find(u => u.full_name === orderInfo.worker_name);
    const workerPhone = workerObj ? workerObj.phone : '+998 90 000 00 00';

    const text = template
      .replace(/{client}/g, orderInfo.client_name)
      .replace(/{order_id}/g, orderInfo.id)
      .replace(/{price}/g, orderInfo.price)
      .replace(/{worker}/g, orderInfo.worker_name)
      .replace(/{worker_phone}/g, workerPhone);

    setSmsToast({
      title: event === 'CREATED' ? 'Yangi buyurtma SMSi' : event === 'ASSIGNED' ? 'Kuryer biriktirish SMSi' : 'Yakunlash SMSi',
      text: text,
      phone: workerPhone
    });

    console.log(`[SMS SIMULATOR] Event: ${event}. To: ${orderInfo.client_name}. Content: ${text}`);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setSmsToast(prev => (prev && prev.text === text ? null : prev));
    }, 6000);
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!newOrder.client_id || !newOrder.service_id || !newOrder.worker_id) return;

    const client = clients.find(c => c.id === newOrder.client_id);
    const service = services.find(s => s.id === newOrder.service_id);
    const worker = workers.find(w => w.id === newOrder.worker_id);
    const firstStatus = statuses.length > 0 ? statuses[0].id : '1';

    const order = {
      id: 'o' + (orders.length + 1),
      client_name: client.full_name,
      service_name: service.name_uz,
      price: service.price,
      worker_name: worker.full_name,
      status_id: firstStatus,
      address: newOrder.address || client.address,
      description: newOrder.description || '',
      quantity: parseFloat(newOrder.quantity) || 1,
      measurement_unit: newOrder.measurement_unit || 'dona',
      created_at: new Date().toISOString()
    };

    // Register transaction & increase Cash Wallet
    const wallets = getDbItem('wallets') || [];
    const updatedWallets = wallets.map(w => {
      if (w.id === 'cash') {
        return { ...w, balance: w.balance + service.price };
      }
      return w;
    });
    setDbItem('wallets', updatedWallets);

    const transactions = getDbItem('transactions') || [];
    const newTx = {
      id: 't' + (transactions.length + 1),
      type: 'INCOME',
      amount: service.price,
      category: 'ORDER_PAYMENT',
      wallet_id: 'cash',
      description: `${client.full_name} uchun ${service.name_uz} xizmati buyurtmasi to'lovi`,
      created_at: new Date().toISOString()
    };

    setDbItem('transactions', [...transactions, newTx]);

    const updated = [...orders, order];
    setOrders(updated);
    setDbItem('orders', updated);
    setShowCreateModal(false);
    setNewOrder({ client_id: '', service_id: '', worker_id: '', address: '', description: '', quantity: 1, measurement_unit: 'dona' });

    // Trigger notification
    addNotification(
      `Yangi buyurtma olindi`,
      `Получен новый заказ`,
      `New order received`,
      `${client.full_name} uchun ${service.name_uz} xizmati buyurtmasi yaratildi. Kuryer: ${worker.full_name}.`,
      `Создан новый заказ на услугу ${service.name_ru} для клиента ${client.full_name}. Курьер: ${worker.full_name}.`,
      `New order for ${service.name_en} created for client ${client.full_name}. Courier: ${worker.full_name}.`,
      'SUCCESS'
    );

    // Trigger SMS
    triggerSmsSimulation('CREATED', order);
  };

  const handleStatusChange = (orderId, statusId) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status_id: statusId } : o);
    setOrders(updated);
    setDbItem('orders', updated);

    const targetOrder = updated.find(o => o.id === orderId);
    if (targetOrder) {
      if (statusId === '2') {
        triggerSmsSimulation('ASSIGNED', targetOrder);
      } else if (statusId === '4') {
        triggerSmsSimulation('COMPLETED', targetOrder);
      }

      // Trigger notification
      const statusObj = statuses.find(s => s.id === statusId);
      const statusNameUz = statusObj ? statusObj.name_uz : 'Yangilandi';
      const statusNameRu = statusObj ? statusObj.name_ru : 'Обновлен';
      const statusNameEn = statusObj ? statusObj.name_en : 'Updated';
      
      addNotification(
        `Buyurtma holati o'zgardi`,
        `Статус заказа изменен`,
        `Order status changed`,
        `Buyurtma #${orderId} holati "${statusNameUz}" darajasiga o'tkazildi.`,
        `Статус заказа #${orderId} изменен на "${statusNameRu}".`,
        `Order #${orderId} status changed to "${statusNameEn}".`,
        statusId === '4' ? 'SUCCESS' : 'INFO'
      );
    }

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, status_id: statusId }));
    }
  };

  // Filter orders by search and status tab
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.client_name.toLowerCase().includes(search.toLowerCase()) || 
      o.worker_name.toLowerCase().includes(search.toLowerCase()) ||
      o.service_name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = selectedStatusId === 'all' || o.status_id === selectedStatusId;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('orders_page.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('orders_page.desc')}</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer w-fit shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('orders_page.add_order')}
        </button>
      </div>

      {/* Orders Statistics Cards */}
      <OrdersStats orders={orders} statuses={statuses} />

      {/* Filters and Search Bar */}
      <OrdersFilters 
        search={search} 
        setSearch={setSearch} 
        selectedStatusId={selectedStatusId} 
        setSelectedStatusId={setSelectedStatusId} 
        statuses={statuses} 
        orders={orders} 
      />

      {/* Orders List Table */}
      <OrdersTable 
        filteredOrders={filteredOrders} 
        statuses={statuses} 
        onStatusChange={handleStatusChange} 
        onOpenDetails={setSelectedOrder} 
      />

      {/* Order Details Modal (Timeline tracker & Audit logs) */}
      <OrderDetailsModal 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        statuses={statuses} 
        clients={clients} 
      />

      {/* Create Order Modal */}
      <CreateOrderModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        clients={clients} 
        services={services} 
        workers={workers} 
        newOrder={newOrder} 
        setNewOrder={setNewOrder} 
        onSubmit={handleCreateOrder} 
        companySettings={companySettings}
      />

      {/* SMS Toast simulation popup */}
      {smsToast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-slate-900/95 dark:bg-[#111827]/95 border border-indigo-500/30 text-white p-5 rounded-2xl shadow-2xl max-w-sm flex gap-3 animate-slide-up font-sans">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-wider">{smsToast.title}</span>
              <button 
                onClick={() => setSmsToast(null)}
                className="text-slate-400 hover:text-white ml-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <p className="font-semibold text-[11px] text-slate-300 leading-relaxed">{smsToast.text}</p>
            <p className="text-[9px] text-slate-500 font-mono pt-1">Yuborilgan raqam: {smsToast.phone}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
