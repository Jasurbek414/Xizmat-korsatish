import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { confirmDialog } from '../services/confirmDialog';
import PageLoader from '../components/PageLoader';
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
  const [pageLoading, setPageLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [smsToast, setSmsToast] = useState(null);
  const [createOrderError, setCreateOrderError] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  // Kalendar orqali tanlangan sana (YYYY-MM-DD) yoki null. Ro'yxatni shu kun
  // bo'yicha filtrlaydi VA yangi buyurtma o'sha kunga yoziladi.
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Form State
  const [newOrder, setNewOrder] = useState({
    client_phone: '',
    client_name: '',
    service_id: '',
    worker_id: '',
    address: '',
    description: '',
    // Summa xizmat tanlanganda avtomatik to'ladi, lekin qo'lda
    // o'zgartirilishi mumkin (kelishilgan narx katalogdan farq qilsa).
    price: ''
  });
  const [companySettings, setCompanySettings] = useState({});

  const mapOrders = (ordersData) => {
    return ordersData.map(o => ({
      id: o.id,
      // `?? ''` MUHIM: obyekt kelgan-u, ichida nom maydoni bo'lmagan holat
      // (lazy proxy) `undefined` qoldirardi - pastdagi filtr va jadval shunda
      // yiqilardi. Endi eng yomon holatda bo'sh satr bo'ladi.
      client_id: o.client ? o.client.id : '',
      client_name: (o.client ? (o.client.fullName || o.client.full_name) : '') ?? '',
      client_phone: (o.client ? o.client.phone : '') ?? '',
      client_address: (o.client ? o.client.address : '') ?? '',
      // MUHIM (audit'da topilgan xato, tuzatildi): avval faqat xizmat NOMI
      // saqlanardi, ID emas - tahrirlashda xizmat ISM bo'yicha QAYTA
      // qidirilardi (pastga q. handleOpenEdit). Ikkita bir xil nomli xizmat
      // bo'lsa (yoki nom keyin o'zgartirilgan bo'lsa), buyurtma BOSHQA
      // xizmatga bog'lanib, narx xato hisoblanishi mumkin edi.
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // MUHIM: har bir so'rov ALOHIDA .catch bilan o'ralgan (Promise.all
        // o'rniga) - aks holda BITTA ruxsat yetishmasa (masalan Dispetcher/
        // Menejerda "settings" huquqi yo'q, shuning uchun getCompanySettings
        // 403 qaytaradi), butun Buyurtmalar sahifasi bo'sh qolardi. Jonli
        // aniqlangan: bu sabab Buyurtmalar moduli DISPATCHER va MANAGER
        // rollari uchun butunlay ishlamas edi. companySettings faqat SMS
        // simulyatsiyasi uchun ishlatiladi - yo'q bo'lsa shu funksiya jimgina
        // o'chadi, qolgan sahifa to'liq ishlayveradi.
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
    setCreateOrderError(null);

    try {
      // MUHIM (jonli holatda topilgan xato, tuzatildi): buyurtma
      // TAHRIRLANAYOTGANDA, agar telefon raqami o'zgartirilmagan bo'lsa,
      // ASL mijoz ID'si to'g'ridan-to'g'ri ishlatiladi - pastdagi
      // `endsWith` qidiruvi ATLAB O'TILADI. Sabab: `endsWith` raqamning
      // faqat OXIRGI qismini solishtiradi - agar ikkita mijozning raqami
      // bir xil oxirgi raqamlar bilan tugasa (yoki oldin xato mijoz
      // yaratilgan bo'lsa), tahrirlash BOSHQA mijozga o'tkazib yuborishi
      // mumkin edi. Raqam ATAYIN o'zgartirilsa - pastdagi mantiq
      // (topilsa ishlatish, topilmasa yangi mijoz yaratish) ishlayveradi.
      let client = null;
      if (editingOrder && editingOrder.client_id && newOrder.client_phone === editingOrder.client_phone) {
        client = { id: editingOrder.client_id, address: editingOrder.client_address, full_name: editingOrder.client_name };
      }

      // Find client in current loaded list (matching phone)
      const cleanNewPhone = newOrder.client_phone.replace(/\D/g, '');
      if (!client) {
        client = clients.find(c => {
          const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
          return cleanPhone && cleanPhone.endsWith(cleanNewPhone) && cleanNewPhone.length >= 7;
        });
      }

      if (!client) {
        // Create new client in backend
        const createdClient = await api.createClient({
          full_name: newOrder.client_name,
          phone: newOrder.client_phone,
          address: newOrder.address
        });
        client = createdClient;

        // Refresh clients state
        const updatedClients = await api.getClients();
        setClients(updatedClients);
      } else {
        // MUHIM (jonli holatda topilgan xato, tuzatildi): mavjud mijoz
        // (ID orqali yoki telefon bo'yicha) topilganda, shu forma
        // maydonidagi ISM hech qachon Mijoz yozuvining o'ziga qaytarilmasdi -
        // faqat YANGI mijoz yaratilganda ism to'g'ri saqlanardi. Buyurtmani
        // TAHRIRLAB, "Mijoz ismi"ni o'zgartirsa (masalan kirillchadan
        // lotinchaga), bu o'zgarish jimgina yo'qolib ketardi. Endi ism
        // saqlangan qiymatdan farq qilsa, mijoz yozuvi ham yangilanadi.
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

      // Create or update the order
      const firstStatus = statuses.length > 0 ? statuses[0].id : null;
      const orderPayload = {
        client_id: client.id,
        service_id: newOrder.service_id,
        worker_id: newOrder.worker_id || null,
        // Qo'lda kiritilgan summa ustuvor; bo'sh qoldirilsa xizmat narxi.
        price: newOrder.price !== '' && newOrder.price != null
          ? Number(newOrder.price)
          : (services.find(s => s.id === newOrder.service_id)?.price || 0),
        address: newOrder.address || client.address || '',
        description: newOrder.description || '',
        status_id: firstStatus
      };

      // Kalendarda sana tanlangan bo'lsa, buyurtma O'SHA kunga yoziladi -
      // shunda ro'yxatdan tushib qolgan eski buyurtmani keyin ham to'g'ri
      // sana bilan kiritish mumkin. Yangi buyurtma yaratilgandagina
      // qo'llanadi: mavjud buyurtmani tahrirlashda sanasi o'zgarmasligi kerak.
      if (selectedDate && !editingOrder) {
        orderPayload.created_at = selectedDate;
      }

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
        price: ''
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
      setCreateOrderError(err.message || "Buyurtma yaratib bo'lmadi. Qaytadan urinib ko'ring.");
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
    // MUHIM (jonli holatda topilgan xato, tuzatildi): avval mijoz ISM
    // bo'yicha `clients` ro'yxatidan qidirilardi - agar boshqa mijoz ham
    // XUDDI SHU ismga ega bo'lsa (masalan bir nechta "Aziz"), `.find()`
    // ro'yxatdagi BIRINCHI mos kelganini qaytarardi, ya'ni bu buyurtmaga
    // umuman aloqasi yo'q boshqa odamning telefon raqami tahrirlash
    // formasiga yozilib qolardi. `order.client_phone` (mapOrders orqali
    // buyurtmaning O'Z mijozidan to'g'ridan-to'g'ri olingan) - hech qanday
    // qidiruvsiz, doim to'g'ri.
    setNewOrder({
      client_phone: order.client_phone || '',
      client_name: order.client_name,
      // MUHIM (audit'da topilgan, tuzatildi): avval nom bo'yicha QAYTA
      // qidirilardi (yuqoridagi client_phone bilan bir xil turdagi xato) -
      // endi buyurtmaning O'Z xizmat ID'si (mapOrders orqali) to'g'ridan-to'g'ri
      // ishlatiladi.
      service_id: order.service_id || '',
      worker_id: order.worker_id || '',
      address: order.address,
      description: order.description || '',
      // MUHIM (audit'da topilgan): bu maydon to'ldirilmasa, saqlashda
      // "bo'sh bo'lsa katalog narxi" fallback'i doim ishga tushib, kelishilgan
      // narxni jim-jit katalog narxi bilan almashtirib yuborardi.
      price: order.price != null ? order.price : ''
    });
    setShowCreateModal(true);
  };

  const handleDeleteOrder = async (id) => {
    if (!(await confirmDialog("Haqiqatan ham ushbu buyurtmani o'chirib yubormoqchimisiz?"))) return;
    try {
      await api.deleteOrder(id);
      const ordersData = await api.getOrders();
      setOrders(mapOrders(ordersData));
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  // Filter orders by search and status tab
  //
  // MUHIM (jonli xatolik, 2026-08-04): avval bu yerda to'g'ridan-to'g'ri
  // `o.client_name.toLowerCase()` chaqirilardi. Agar backend buyurtma bilan
  // birga `client`/`service` obyektini TO'LIQ yubormasa (masalan Hibernate
  // lazy proxy tufayli faqat `{id}` kelsa), mapOrders o'sha maydonga
  // `undefined` yozardi va bu qator butun Buyurtmalar sahifasini yiqitardi -
  // tashqaridan bu "qidiruv ishlamayapti" bo'lib ko'rinadi. Endi barcha
  // qiymatlar String()'ga o'raladi, ya'ni bitta nuqsonli yozuv sahifani
  // buzmaydi.
  //
  // Qidiruv maydoni ham kengaytirildi: foydalanuvchilar ko'pincha TELEFON
  // RAQAMI yoki MANZIL bo'yicha qidiradi, lekin avval faqat mijoz/xodim/
  // xizmat nomi tekshirilardi va natija bo'sh chiqardi.
  const query = search.trim().toLowerCase();

  // Sana filtri mahalliy vaqt bo'yicha solishtiriladi. `toISOString()`
  // ATAYIN ishlatilmadi - u UTC'ga o'tkazadi va O'zbekiston (UTC+5)
  // ertalabki buyurtmalarini oldingi kunga tashlab yuborardi.
  const localDateKey = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = selectedStatusId === 'all' || o.status_id === selectedStatusId;
    if (!matchesStatus) return false;

    if (selectedDate && localDateKey(o.created_at) !== selectedDate) return false;

    if (!query) return true;

    const haystack = [
      o.client_name,
      o.client_phone,
      o.worker_name,
      o.service_name,
      o.address,
      o.client_address,
      o.description
    ]
      .map(v => String(v ?? '').toLowerCase())
      .join(' ');

    return haystack.includes(query);
  });

  if (pageLoading) return <PageLoader />;

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
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onAddOrderForDate={() => { setEditingOrder(null); setCreateOrderError(null); setShowCreateModal(true); }}
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
      />

      {/* Create Order Modal */}
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
