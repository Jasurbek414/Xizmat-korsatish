import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { addNotification } from '../store/mockDb';

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
  const [editingOrder, setEditingOrder] = useState(null);
  const [smsToast, setSmsToast] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  
  // Form State
  const [newOrder, setNewOrder] = useState({
    client_phone: '',
    client_name: '',
    service_id: '',
    worker_id: '',
    address: '',
    description: '',
    quantity: 1,
    measurement_unit: 'dona'
  });
  const [companySettings, setCompanySettings] = useState({});

  const mapOrders = (ordersData) => {
    return ordersData.map(o => ({
      id: o.id,
      client_name: o.client ? (o.client.fullName || o.client.full_name) : '',
      service_name: o.service ? (o.service.nameUz || o.service.name_uz) : '',
      worker_name: o.worker ? (o.worker.fullName || o.worker.full_name) : 'Biriktirilmagan',
      worker_id: o.worker ? o.worker.id : '',
      status_id: o.status ? o.status.id : '',
      address: o.address,
      description: o.description,
      price: o.price,
      quantity: 1,
      measurement_unit: 'dona',
      created_at: o.createdAt || o.created_at
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, statusesData, clientsData, servicesData, workersData, settingsData] = await Promise.all([
          api.getOrders(),
          api.getOrderStatuses(),
          api.getClients(),
          api.getServices(),
          api.getDrivers(),
          api.getCompanySettings()
        ]);
        setOrders(mapOrders(ordersData));
        setStatuses(statusesData.map(s => ({
          id: s.id,
          name_uz: s.nameUz || s.name_uz,
          name_ru: s.nameRu || s.name_ru,
          name_en: s.nameEn || s.name_en,
          color_code: s.colorCode || s.color_code,
          sort_order: s.sortOrder || s.sort_order
        })));
        setClients(clientsData);
        setServices(servicesData);
        setWorkers(workersData);
        setCompanySettings(settingsData);
      } catch (err) {
        console.error("Failed to load orders data:", err);
      }
    };
    loadData();
  }, [tab]);

  const triggerSmsSimulation = (event, orderInfo) => {
    if (!companySettings.smsEnabled) return;

    let template = '';
    if (event === 'CREATED') template = companySettings.smsTemplateCreated;
    else if (event === 'ASSIGNED') template = companySettings.smsTemplateAssigned;
    else if (event === 'COMPLETED') template = companySettings.smsTemplateCompleted;

    if (!template) return;

    // Find worker phone
    const workerPhone = orderInfo.worker_phone || '+998 90 000 00 00';

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

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.client_phone || !newOrder.client_name || !newOrder.service_id) return;

    try {
      // Find client in current loaded list (matching phone)
      const cleanNewPhone = newOrder.client_phone.replace(/\D/g, '');
      let client = clients.find(c => {
        const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
        return cleanPhone && cleanPhone.endsWith(cleanNewPhone) && cleanNewPhone.length >= 7;
      });

      if (!client) {
        // Create new client in backend
        const createdClient = await api.createClient({
          fullName: newOrder.client_name,
          phone: newOrder.client_phone,
          address: newOrder.address
        });
        client = createdClient;
        
        // Refresh clients state
        const updatedClients = await api.getClients();
        setClients(updatedClients);
      }

      // Create or update the order
      const firstStatus = statuses.length > 0 ? statuses[0].id : null;
      const orderPayload = {
        client_id: client.id,
        service_id: newOrder.service_id,
        worker_id: newOrder.worker_id || null,
        price: services.find(s => s.id === newOrder.service_id)?.price || 0,
        address: newOrder.address || client.address || '',
        description: newOrder.description || '',
        quantity: parseFloat(newOrder.quantity) || 1,
        measurement_unit: newOrder.measurement_unit || 'dona',
        status_id: firstStatus
      };

      if (editingOrder) {
        await api.updateOrder(editingOrder.id, orderPayload);
      } else {
        await api.createOrder(orderPayload);
      }

      // Reload orders list
      const ordersData = await api.getOrders();
      setOrders(mapOrders(ordersData));
      
      setShowCreateModal(false);
      setEditingOrder(null);
      setNewOrder({
        client_phone: '',
        client_name: '',
        service_id: '',
        worker_id: '',
        address: '',
        description: '',
        quantity: 1,
        measurement_unit: 'dona'
      });

      // Trigger notification
      const service = services.find(s => s.id === newOrder.service_id);
      const worker = workers.find(w => w.id === newOrder.worker_id);
      addNotification(
        `Yangi buyurtma olindi`,
        `Получен новый заказ`,
        `New order received`,
        `${client.fullName || client.full_name} uchun ${service ? service.nameUz : ''} xizmati buyurtmasi yaratildi.`,
        `Created new order for ${client.fullName || client.full_name}.`,
        `Created new order for ${client.fullName || client.full_name}.`,
        'SUCCESS'
      );

      // Trigger SMS simulation
      triggerSmsSimulation('CREATED', {
        id: 'Yangi',
        client_name: client.fullName || client.full_name,
        service_name: service ? service.nameUz : '',
        price: service ? service.price : 0,
        worker_name: worker ? worker.fullName || worker.full_name : '',
        worker_phone: worker ? worker.phone : ''
      });
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  };

  const handleStatusChange = async (orderId, statusId) => {
    try {
      await api.updateOrderStatus(orderId, statusId);
      const ordersData = await api.getOrders();
      const updatedOrders = mapOrders(ordersData);
      setOrders(updatedOrders);

      const targetOrder = updatedOrders.find(o => o.id === orderId);
      if (targetOrder) {
        const sortedStatuses = [...statuses].sort((a, b) => a.sort_order - b.sort_order);
        const isLastStatus = sortedStatuses.length > 0 && sortedStatuses.slice(-1)[0].id === statusId;
        const isSecondStatus = sortedStatuses.length > 1 && sortedStatuses[1].id === statusId;

        if (isSecondStatus) {
          triggerSmsSimulation('ASSIGNED', targetOrder);
        } else if (isLastStatus) {
          triggerSmsSimulation('COMPLETED', targetOrder);
        }

        // Trigger notification
        const statusObj = statuses.find(s => s.id === statusId);
        const statusNameUz = statusObj ? statusObj.name_uz : 'Yangilandi';
        addNotification(
          `Buyurtma holati o'zgardi`,
          `Статус заказа изменен`,
          `Order status changed`,
          `Buyurtma holati "${statusNameUz}" darajasiga o'tkazildi.`,
          `Order status updated to "${statusNameUz}".`,
          `Order status updated to "${statusNameUz}".`,
          isLastStatus ? 'SUCCESS' : 'INFO'
        );
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status_id: statusId }));
      }
    } catch (err) {
      console.error("Failed to change order status:", err);
    }
  };

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    const clientObj = clients.find(c => (c.fullName || c.full_name) === order.client_name);
    setNewOrder({
      client_phone: clientObj ? clientObj.phone : '',
      client_name: order.client_name,
      service_id: services.find(s => s.nameUz === order.service_name || s.name_uz === order.service_name)?.id || '',
      worker_id: order.worker_id || '',
      address: order.address,
      description: order.description || '',
      quantity: order.quantity || 1,
      measurement_unit: order.measurement_unit || 'dona'
    });
    setShowCreateModal(true);
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu buyurtmani o'chirib yubormoqchimisiz?")) return;
    try {
      await api.deleteOrder(id);
      const ordersData = await api.getOrders();
      setOrders(mapOrders(ordersData));
    } catch (err) {
      console.error("Failed to delete order:", err);
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
        onEditOrder={handleOpenEdit}
        onDeleteOrder={handleDeleteOrder}
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
        onClose={() => { setShowCreateModal(false); setEditingOrder(null); }} 
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
