import React, { useState, useEffect } from 'react';
import { addNotification } from '../store/mockDb';
import { Plus, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

// Import modular sub-components
import ClientsStats from './clients/ClientsStats';
import ClientsFilters from './clients/ClientsFilters';
import ClientsTable from './clients/ClientsTable';
import CreateClientModal from './clients/CreateClientModal';
import QuickOrderModal from './clients/QuickOrderModal';
import ClientDetailsModal from './clients/ClientDetailsModal';

const Clients = ({ tab }) => {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  // State for modals and panels
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [filterSpending, setFilterSpending] = useState('ALL'); // ALL, VIP, REGULAR, NEW
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Dynamic fields
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', address: '' });
  const [editingClient, setEditingClient] = useState(null);
  const [quickOrder, setQuickOrder] = useState({ service_id: '', worker_id: '', address: '', description: '' });
  
  // Notes
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, ordersData, servicesData, workersData] = await Promise.all([
          api.getClients(),
          api.getOrders(),
          api.getServices(),
          api.getDrivers()
        ]);
        setClients(clientsData.map(c => ({ id: c.id, full_name: c.fullName, phone: c.phone, address: c.address, notes: [] })));
        setOrders(ordersData.map(o => ({ id: o.id, client_name: o.client ? o.client.fullName : '', price: o.price })));
        setServices(servicesData.map(s => ({ id: s.id, name_uz: s.nameUz, price: s.price })));
        setWorkers(workersData.map(w => ({ id: w.id, full_name: w.fullName, role: w.role })));
      } catch (err) {
        console.error("Failed to load clients data:", err);
      }
    };
    loadData();
  }, [tab]);

  // Aggregate metrics
  const getClientStats = (clientName) => {
    const clientOrders = orders.filter(o => o.client_name.toLowerCase() === clientName.toLowerCase());
    const spent = clientOrders.reduce((sum, o) => sum + o.price, 0);
    return {
      orderCount: clientOrders.length,
      spent,
      lastOrderDate: clientOrders.length > 0 ? '2026-06-26' : '--'
    };
  };

  const getVIPCount = () => {
    return clients.filter(c => getClientStats(c.full_name).spent >= 200000).length;
  };

  const getActiveCount = () => {
    return clients.filter(c => getClientStats(c.full_name).orderCount > 0).length;
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClient.full_name || !newClient.phone) return;

    try {
      const savedClient = await api.createClient({
        full_name: newClient.full_name,
        phone: newClient.phone,
        address: newClient.address
      });

      const client = {
        id: savedClient.id,
        full_name: savedClient.fullName,
        phone: savedClient.phone,
        address: savedClient.address,
        notes: []
      };

      setClients(prev => [...prev, client]);
      setShowAddModal(false);
      setNewClient({ full_name: '', phone: '', address: '' });

      // Trigger notification
      addNotification(
        `Yangi mijoz qo'shildi`,
        `Добавлен новый клиент`,
        `New client added`,
        `Tizimga yangi mijoz ${client.full_name} qo'shildi.`,
        `В систему добавлен новый клиент ${client.full_name}.`,
        `New client ${client.full_name} was added to the system.`,
        'SUCCESS'
      );
    } catch (err) {
      console.error("Failed to add client:", err);
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    if (!editingClient.full_name || !editingClient.phone) return;

    try {
      await api.updateClient(editingClient.id, {
        full_name: editingClient.full_name,
        phone: editingClient.phone,
        address: editingClient.address
      });

      const updated = clients.map(c => c.id === editingClient.id ? editingClient : c);
      setClients(updated);
      setShowEditModal(false);
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient(editingClient);
      }

      addNotification(
        `Mijoz ma'lumotlari yangilandi`,
        `Данные клиента обновлены`,
        `Client details updated`,
        `Mijoz ${editingClient.full_name} ma'lumotlari muvaffaqiyatli tahrirlandi.`,
        `Данные клиента ${editingClient.full_name} успешно обновлены.`,
        `Details of client ${editingClient.full_name} were successfully updated.`,
        'INFO'
      );
    } catch (err) {
      console.error("Failed to update client:", err);
    }
  };

  const handleDeleteClient = async (client, e) => {
    e.stopPropagation();
    if (!window.confirm(`${client.full_name} ni o'chirishni tasdiqlaysizmi?`)) return;

    try {
      await api.deleteClient(client.id);

      const updated = clients.filter(c => c.id !== client.id);
      setClients(updated);
      if (selectedClient && selectedClient.id === client.id) {
        setSelectedClient(null);
      }

      addNotification(
        `Mijoz o'chirildi`,
        `Клиент удален`,
        `Client deleted`,
        `Mijoz ${client.full_name} tizimdan o'chirildi.`,
        `Клиент ${client.full_name} был удален из системы.`,
        `Client ${client.full_name} was deleted from the system.`,
        'ERROR'
      );
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  const handleCreateQuickOrder = async (e) => {
    e.preventDefault();
    if (!quickOrder.service_id || !quickOrder.worker_id) return;

    const service = services.find(s => s.id === quickOrder.service_id);
    const worker = workers.find(w => w.id === quickOrder.worker_id);

    try {
      const savedOrder = await api.createOrder({
        client_id: selectedClient.id,
        service_id: service.id,
        worker_id: worker.id,
        price: service.price,
        description: quickOrder.description || "Tezkor buyurtma",
        address: quickOrder.address || selectedClient.address || "Toshkent"
      });

      const order = {
        id: savedOrder.id,
        client_name: selectedClient.full_name,
        service_name: service.name_uz,
        price: service.price,
        worker_name: worker.full_name,
        status_id: '1',
        address: quickOrder.address || selectedClient.address,
        created_at: new Date().toISOString()
      };

      const updatedOrders = [...orders, order];
      setOrders(updatedOrders);
      setShowOrderModal(false);
      setQuickOrder({ service_id: '', worker_id: '', address: '', description: '' });

      const autoNote = {
        id: 'n_auto_' + Date.now(),
        text: `Tizim: "${service.name_uz}" xizmati uchun yangi buyurtma yaratildi. Summa: ${service.price.toLocaleString()} UZS`,
        date: new Date().toLocaleString()
      };
      
      const clientNotes = selectedClient.notes || [];
      const updatedClient = {
        ...selectedClient,
        notes: [autoNote, ...clientNotes]
      };
      
      const updatedClientsList = clients.map(c => c.id === selectedClient.id ? updatedClient : c);
      setClients(updatedClientsList);
      setSelectedClient(updatedClient);

      addNotification(
        `Yangi buyurtma (Tezkor)`,
        `Новый быстрый заказ`,
        `New Quick Order`,
        `${selectedClient.full_name} uchun tezkor buyurtma yaratildi. Kuryer: ${worker.full_name}.`,
        `Создан быстрый заказ для ${selectedClient.full_name}. Курьер: ${worker.full_name}.`,
        `Quick order created for ${selectedClient.full_name}. Courier: ${worker.full_name}.`,
        'SUCCESS'
      );
    } catch (err) {
      console.error("Failed to create quick order:", err);
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote = {
      id: 'n_' + Date.now(),
      text: noteText,
      date: new Date().toLocaleString()
    };

    const clientNotes = selectedClient.notes || [];
    const updatedClient = {
      ...selectedClient,
      notes: [newNote, ...clientNotes]
    };

    const updatedClientsList = clients.map(c => c.id === selectedClient.id ? updatedClient : c);
    setClients(updatedClientsList);
    setSelectedClient(updatedClient);
    setNoteText('');
  };

  const exportToCSV = () => {
    const headers = ['Mijoz F.I.SH', 'Telefon', 'Manzil', 'Buyurtmalar soni', 'Jami sarflangan (UZS)'];
    const rows = filteredClients.map(c => {
      const stats = getClientStats(c.full_name);
      return [
        `"${c.full_name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        stats.orderCount,
        stats.spent
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ServiceCore_Mijozlar_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.full_name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search) || 
      (c.address || '').toLowerCase().includes(search.toLowerCase());
    
    const stats = getClientStats(c.full_name);
    
    let matchesActivity = true;
    if (filterActivity === 'ACTIVE') matchesActivity = stats.orderCount > 0;
    else if (filterActivity === 'INACTIVE') matchesActivity = stats.orderCount === 0;

    let matchesSpending = true;
    if (filterSpending === 'VIP') matchesSpending = stats.spent >= 200000;
    else if (filterSpending === 'REGULAR') matchesSpending = stats.spent > 0 && stats.spent < 200000;
    else if (filterSpending === 'NEW') matchesSpending = stats.spent === 0;

    return matchesSearch && matchesActivity && matchesSpending;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">{t('clients_page.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{t('clients_page.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 premium-btn text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('clients_page.add_client')}
          </button>
        </div>
      </div>

      <ClientsStats 
        clients={clients} 
        activeCount={getActiveCount()} 
        vipCount={getVIPCount()} 
      />

      <ClientsFilters 
        search={search}
        setSearch={setSearch}
        filterActivity={filterActivity}
        setFilterActivity={setFilterActivity}
        filterSpending={filterSpending}
        setFilterSpending={setFilterSpending}
      />

      <ClientsTable 
        filteredClients={filteredClients}
        getClientStats={getClientStats}
        handleOpenClientDetails={setSelectedClient}
        setSelectedClient={setSelectedClient}
        setShowOrderModal={setShowOrderModal}
        setEditingClient={setEditingClient}
        setShowEditModal={setShowEditModal}
        handleDeleteClient={handleDeleteClient}
      />

      <CreateClientModal 
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newClient={newClient}
        setNewClient={setNewClient}
        handleAddClient={handleAddClient}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingClient={editingClient}
        setEditingClient={setEditingClient}
        handleEditClient={handleEditClient}
      />

      <QuickOrderModal 
        showOrderModal={showOrderModal}
        setShowOrderModal={setShowOrderModal}
        selectedClient={selectedClient}
        quickOrder={quickOrder}
        setQuickOrder={setQuickOrder}
        services={services}
        workers={workers}
        handleCreateQuickOrder={handleCreateQuickOrder}
      />

      <ClientDetailsModal 
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        clientStats={selectedClient ? getClientStats(selectedClient.full_name) : { orderCount: 0, spent: 0 }}
        clientOrders={selectedClient ? orders.filter(o => o.client_name.toLowerCase() === selectedClient.full_name.toLowerCase()) : []}
        noteText={noteText}
        setNoteText={setNoteText}
        handleAddNote={handleAddNote}
        setShowOrderModal={setShowOrderModal}
        setEditingClient={setEditingClient}
        setShowEditModal={setShowEditModal}
      />
    </div>
  );
};

export default Clients;
