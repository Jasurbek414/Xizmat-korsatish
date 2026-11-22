import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { confirmDialog } from '../services/confirmDialog';
import PageLoader from '../components/PageLoader';
import { addNotification } from '../store/mockDb';

// Import modular sub-components
import OrdersStats from './orders/OrdersStats';
import OrdersFilters from './orders/OrdersFilters';
import OrdersTable from './orders/OrdersTable';
import OrdersKanban from './orders/OrdersKanban';
import OrderDetailsModal from './orders/OrderDetailsModal';
import CreateOrderModal from './orders/CreateOrderModal';
import ReceiptPrintModal from './orders/ReceiptPrintModal';

const Orders = ({ tab }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  // View mode: 'kanban' or 'table'
  const [viewMode, setViewMode] = useState('kanban');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [smsToast, setSmsToast] = useState(null);
  const [createOrderError, setCreateOrderError] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Form State
  const [newOrder, setNewOrder] = useState({
    client_phone: '',
    client_name: '',
    service_id: '',
    worker_id: '',
    address: '',
    description: '',
    price: '',
    carpet_count: null,
    pickup_date: ''
  });
  const [companySettings, setCompanySettings] = useState({});

  const mapOrders = (ordersData) => {
    return ordersData.map(o => ({
      id: o.id,
      client_id: o.client ? o.client.id : '',
      client_name: (o.client ? (o.client.fullName || o.client.full_name) : '') ?? '',
      client_phone: (o.client ? o.client.phone : '') ?? '',
      client_address: (o.client ? o.client.address : '') ?? '',
      service_id: o.service ? o.service.id : '',
      service_name: (o.service ? (o.service.nameUz || o.service.name_uz) : '') ?? '',
      worker_name: (o.worker ? (o.worker.fullName || o.worker.full_name) : 'Biriktirilmagan') ?? 'Biriktirilmagan',
      worker_id: o.worker ? o.worker.id : '',
      worker_phone: o.worker ? (o.worker.phone || '') : '',
      status_id: o.status ? o.status.id : '',
      address: o.address,
      description: o.description,
      price: o.price,
      measurement_unit: o.service ? (o.service.measurementUnit || o.service.measurement_unit || 'm²') : 'm²',
      items: o.items || [],
      payment_status: o.paymentStatus || o.payment_status || 'PENDING',
      collected_price: o.collectedPrice || o.collected_price || 0,
      created_at: o.createdAt || o.created_at,
      updated_at: o.updatedAt || o.updated_at
    }));
  };

  const reloadOrders = async () => {
    try {
      const ordersData = await api.getOrders();
      const mapped = mapOrders(ordersData);
      setOrders(mapped);

      // Keep selected order in sync
      if (selectedOrder) {
        const found = mapped.find(o => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error("Orders reload error:", err);
    }
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
          api.getCompanySettings({ silent403: true }).catch(() => ({}))
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
      } finally {
        setPageLoading(false);
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

    setTimeout(() => {
      setSmsToast(prev => (prev && prev.text === text ? null : prev));
    }, 6000);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.client_phone || !newOrder.client_name) return;
    setCreateOrderError(null);

    try {
      let client = null;
      if (editingOrder && editingOrder.client_id && newOrder.client_phone === editingOrder.client_phone) {
        client = { id: editingOrder.client_id, address: editingOrder.client_address, full_name: editingOrder.client_name };
      }

      const cleanNewPhone = newOrder.client_phone.replace(/\D/g, '');
      if (!client) {
        client = clients.find(c => {
          const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
          return cleanPhone && cleanPhone.endsWith(cleanNewPhone) && cleanNewPhone.length >= 7;
        });
      }

      if (!client) {
        const createdClient = await api.createClient({
          full_name: newOrder.client_name,
          phone: newOrder.client_phone,
          address: newOrder.address
        });
        client = createdClient;
        const updatedClients = await api.getClients();
        setClients(updatedClients);
      } else {
        const currentName = (client.full_name || client.fullName || '').trim();
        const typedName = newOrder.client_name.trim();
        if (typedName && typedName !== currentName) {
          await api.updateClient(client.id, {
            full_name: typedName,
            phone: newOrder.client_phone,
            address: client.address || ''
          });
          const updatedClients = await api.getClients();
          setClients(updatedClients);
        }
      }

      // Default service fallback if not chosen
      let serviceId = newOrder.service_id;
      if (!serviceId && services.length > 0) {
        serviceId = services[0].id;
      }

      const firstStatus = statuses.length > 0 ? statuses[0].id : null;
      const orderPayload = {
        client_id: client.id,
        service_id: serviceId,
        worker_id: newOrder.worker_id || null,
        price: newOrder.price !== '' && newOrder.price != null
          ? Number(newOrder.price)
          : 0,
        address: newOrder.address || client.address || '',
        description: newOrder.description || '',
        status_id: editingOrder ? editingOrder.status_id : firstStatus
      };

      if (selectedDate && !editingOrder) {
        orderPayload.created_at = selectedDate;
      }

      let createdOrder = null;
      if (editingOrder) {
        await api.updateOrder(editingOrder.id, orderPayload);
      } else {
        createdOrder = await api.createOrder(orderPayload);

        // If carpet_count is specified, auto-add initial carpets
        if (newOrder.carpet_count && newOrder.carpet_count > 0 && createdOrder && createdOrder.id) {
          const count = Math.min(newOrder.carpet_count, 15);
          for (let i = 1; i <= count; i++) {
            try {
              await api.addOrderItem(createdOrder.id, {
                name: count > 1 ? `Standart gilam ${i}` : 'Standart gilam',
                length: 0,
                width: 0,
                quantity: 1,
                status: 'ACCEPTED'
              });
            } catch (err) {
              console.warn("Item auto-create error:", err);
            }
          }
        }
      }

      await reloadOrders();
      
      setShowCreateModal(false);
      setEditingOrder(null);
      setNewOrder({
        client_phone: '',
        client_name: '',
        service_id: '',
        worker_id: '',
        address: '',
        description: '',
        price: '',
        carpet_count: null,
        pickup_date: ''
      });

      const service = services.find(s => s.id === serviceId);
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

      triggerSmsSimulation('CREATED', {
        id: createdOrder ? createdOrder.id?.slice(0, 6) : 'Yangi',
        client_name: client.fullName || client.full_name,
        service_name: service ? service.nameUz : '',
        price: orderPayload.price,
        worker_name: worker ? worker.fullName || worker.full_name : '',
        worker_phone: worker ? worker.phone : ''
      });
    } catch (err) {
      console.error("Failed to create order:", err);
      setCreateOrderError(err.message || "Buyurtma yaratib bo'lmadi. Qaytadan urinib ko'ring.");
    }
  };

  const handleStatusChange = async (orderId, statusId) => {
    try {
      await api.updateOrderStatus(orderId, statusId);
      await reloadOrders();

      const order = orders.find(o => o.id === orderId);
      const newStatus = statuses.find(s => s.id === statusId);

      if (order && newStatus) {
        const lastStatus = statuses.length > 0 ? statuses[statuses.length - 1] : null;
        const isCompleted = lastStatus && lastStatus.id === statusId;

        if (isCompleted) {
          triggerSmsSimulation('COMPLETED', order);
          addNotification(
            `Buyurtma yakunlandi`,
            `Заказ завершен`,
            `Order completed`,
            `Buyurtma #${order.id} muvaffaqiyatli yakunlandi.`,
            `Order #${order.id} successfully completed.`,
            `Order #${order.id} successfully completed.`,
            'SUCCESS'
          );
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setNewOrder({
      client_phone: order.client_phone,
      client_name: order.client_name,
      service_id: order.service_id,
      worker_id: order.worker_id,
      address: order.address,
      description: order.description,
      price: order.price != null ? String(order.price) : ''
    });
    setCreateOrderError(null);
    setShowCreateModal(true);
  };

  const handleDeleteOrder = async (id) => {
    const isConfirmed = await confirmDialog({
      title: "Buyurtmani o'chirish",
      message: "Haqiqatan ham bu buyurtmani o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger"
    });

    if (isConfirmed) {
      try {
        await api.deleteOrder(id);
        setOrders(prev => prev.filter(o => o.id !== id));
      } catch (err) {
        console.error("Failed to delete order:", err);
      }
    }
  };

  const filteredOrders = orders.filter(o => {
    const s = search.toLowerCase();
    const matchesSearch = (o.client_name || '').toLowerCase().includes(s) ||
                          (o.client_phone || '').toLowerCase().includes(s) ||
                          (o.service_name || '').toLowerCase().includes(s) ||
                          (o.address || '').toLowerCase().includes(s);
    const matchesStatus = selectedStatusId === 'all' || o.status_id === selectedStatusId;
    
    let matchesDate = true;
    if (selectedDate && o.created_at) {
      matchesDate = o.created_at.startsWith(selectedDate);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (pageLoading) {
    return <PageLoader message="Buyurtmalar yuklanmoqda..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Block & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight ">
            {t('orders_page.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Gilam yuvish buyurtmalari oqimi, o'lchovlar va bosqichlar nazorati
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Kanban vs Table */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Doska (Kanban)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Jadval
            </button>
          </div>

          <button 
            onClick={() => { setEditingOrder(null); setCreateOrderError(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 premium-btn text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer w-fit shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> {t('orders_page.add_order')}
          </button>
        </div>
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
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onAddOrderForDate={() => { setEditingOrder(null); setCreateOrderError(null); setShowCreateModal(true); }}
      />

      {/* Orders List View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <OrdersKanban
          orders={filteredOrders}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          onOpenDetails={setSelectedOrder}
          onOpenPrint={setPrintOrder}
        />
      ) : (
        <OrdersTable 
          filteredOrders={filteredOrders} 
          statuses={statuses} 
          onStatusChange={handleStatusChange} 
          onOpenDetails={setSelectedOrder} 
          onEditOrder={handleOpenEdit}
          onDeleteOrder={handleDeleteOrder}
          onOpenPrint={setPrintOrder}
        />
      )}

      {/* Order Details Modal (Gilamlar o'lchov boshqaruvi bilan) */}
      <OrderDetailsModal 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        statuses={statuses}
        onOrderUpdated={reloadOrders}
        onOpenPrint={(ord) => setPrintOrder(ord)}
      />

      {/* Create Order Modal (Gilam soni va mo'ljal bilan) */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingOrder(null); setCreateOrderError(null); }}
        clients={clients}
        services={services}
        workers={workers}
        newOrder={newOrder}
        setNewOrder={setNewOrder}
        onSubmit={handleCreateOrder}
        error={createOrderError}
      />

      {/* Receipt & Birka Print Modal */}
      <ReceiptPrintModal
        isOpen={!!printOrder}
        onClose={() => setPrintOrder(null)}
        order={printOrder}
        companyName={companySettings.name || "Namifor Gilam Yuvish"}
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

