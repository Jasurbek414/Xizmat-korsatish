import React, { useState, useEffect } from 'react';
import { getDbItem, setDbItem, addNotification } from '../store/mockDb';
import { Plus, Search, User, Phone, MapPin, Calendar, Clock, DollarSign, X, Edit2, Trash2, ShoppingBag, Download, FileText, CheckCircle2, Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    setClients(getDbItem('clients') || []);
    setOrders(getDbItem('orders') || []);
    setServices(getDbItem('services') || []);
    setWorkers((getDbItem('users') || []).filter(u => u.role === 'WORKER_DRIVER'));
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

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!newClient.full_name || !newClient.phone) return;

    const newId = 'cl' + (Date.now());
    const updated = [...clients, { ...newClient, id: newId, notes: [] }];
    setClients(updated);
    setDbItem('clients', updated);
    setShowAddModal(false);
    setNewClient({ full_name: '', phone: '', address: '' });

    // Trigger notification
    addNotification(
      `Yangi mijoz qo'shildi`,
      `Добавлен новый клиент`,
      `New client added`,
      `Tizimga yangi mijoz ${newClient.full_name} qo'shildi.`,
      `В систему добавлен новый клиент ${newClient.full_name}.`,
      `New client ${newClient.full_name} was added to the system.`,
      'SUCCESS'
    );
  };

  const handleEditClient = (e) => {
    e.preventDefault();
    if (!editingClient.full_name || !editingClient.phone) return;

    const updated = clients.map(c => c.id === editingClient.id ? editingClient : c);
    setClients(updated);
    setDbItem('clients', updated);
    setShowEditModal(false);
    if (selectedClient && selectedClient.id === editingClient.id) {
      setSelectedClient(editingClient);
    }

    // Trigger notification
    addNotification(
      `Mijoz ma'lumotlari yangilandi`,
      `Данные клиента обновлены`,
      `Client details updated`,
      `Mijoz ${editingClient.full_name} ma'lumotlari muvaffaqiyatli tahrirlandi.`,
      `Данные клиента ${editingClient.full_name} успешно обновлены.`,
      `Details of client ${editingClient.full_name} were successfully updated.`,
      'INFO'
    );
  };

  const handleDeleteClient = (client, e) => {
    e.stopPropagation();
    if (!window.confirm(`${client.full_name} ni o'chirishni tasdiqlaysizmi?`)) return;

    const updated = clients.filter(c => c.id !== client.id);
    setClients(updated);
    setDbItem('clients', updated);
    if (selectedClient && selectedClient.id === client.id) {
      setSelectedClient(null);
    }

    // Trigger notification
    addNotification(
      `Mijoz o'chirildi`,
      `Клиент удален`,
      `Client deleted`,
      `Mijoz ${client.full_name} tizimdan o'chirildi.`,
      `Клиент ${client.full_name} был удален из системы.`,
      `Client ${client.full_name} was deleted from the system.`,
      'ERROR'
    );
  };

  const handleCreateQuickOrder = (e) => {
    e.preventDefault();
    if (!quickOrder.service_id || !quickOrder.worker_id) return;

    const service = services.find(s => s.id === quickOrder.service_id);
    const worker = workers.find(w => w.id === quickOrder.worker_id);
    const statuses = getDbItem('order_statuses') || [];
    const firstStatus = statuses.length > 0 ? statuses[0].id : '1';

    const order = {
      id: 'o' + (orders.length + 1),
      client_name: selectedClient.full_name,
      service_name: service.name_uz,
      price: service.price,
      worker_name: worker.full_name,
      status_id: firstStatus,
      address: quickOrder.address || selectedClient.address,
      created_at: new Date().toISOString()
    };

    // Register transaction
    const transactions = getDbItem('transactions') || [];
    const newTx = {
      id: 't' + (transactions.length + 1),
      type: 'INCOME',
      amount: service.price,
      category: 'ORDER_PAYMENT',
      description: `${selectedClient.full_name} uchun ${service.name_uz} xizmati buyurtmasi to'lovi`,
      created_at: new Date().toISOString()
    };

    const updatedTx = [...transactions, newTx];
    setDbItem('transactions', updatedTx);

    const updatedOrders = [...orders, order];
    setOrders(updatedOrders);
    setDbItem('orders', updatedOrders);
    setShowOrderModal(false);
    setQuickOrder({ service_id: '', worker_id: '', address: '', description: '' });

    // Refresh selected client details
    const clientOrdersFiltered = updatedOrders.filter(o => o.client_name.toLowerCase() === selectedClient.full_name.toLowerCase());
    const spent = clientOrdersFiltered.reduce((sum, o) => sum + o.price, 0);
    
    // Add custom note about quick order
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
    setDbItem('clients', updatedClientsList);
    setSelectedClient(updatedClient);

    // Trigger notification
    addNotification(
      `Yangi buyurtma (Tezkor)`,
      `Новый быстрый заказ`,
      `New Quick Order`,
      `${selectedClient.full_name} uchun tezkor buyurtma yaratildi. Kuryer: ${worker.full_name}.`,
      `Создан быстрый заказ для ${selectedClient.full_name}. Курьер: ${worker.full_name}.`,
      `Quick order created for ${selectedClient.full_name}. Courier: ${worker.full_name}.`,
      'SUCCESS'
    );
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
    setDbItem('clients', updatedClientsList);
    setSelectedClient(updatedClient);
    setNoteText('');
  };

  // CSV Export
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

  // Apply filters
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

      {/* CRM Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'Jami Mijozlar', val: `${clients.length} ta`, change: 'Barcha CRM ma\'lumotlar', icon: Users, bg: 'bg-indigo-500/5', color: 'text-indigo-600 dark:text-indigo-400' },
          { title: 'Faol Mijozlar', val: `${getActiveCount()} ta`, change: 'Kamida 1 ta buyurtma bergan', icon: CheckCircle2, bg: 'bg-emerald-500/5', color: 'text-emerald-600 dark:text-emerald-400' },
          { title: 'VIP Mijozlar', val: `${getVIPCount()} ta`, change: "Sarfi 200k UZS dan ko'p", icon: Star, bg: 'bg-amber-500/5', color: 'text-amber-600 dark:text-amber-400' },
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

      {/* Advanced Search and Filters */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent shadow-sm space-y-3">
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-white/5">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ismi, telefoni yoki manzili bo'yicha qidirish..."
            className="w-full bg-transparent text-xs text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
          />
        </div>
        
        {/* Filters pills */}
        <div className="flex flex-wrap gap-4 text-[10px] font-bold">
          {/* Activity State */}
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
            {[
              { id: 'ALL', label: 'Barcha Mijozlar' },
              { id: 'ACTIVE', label: 'Faollar' },
              { id: 'INACTIVE', label: 'Noaktivlar' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterActivity(f.id)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                  filterActivity === f.id 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Spending range state */}
          <div className="flex items-center bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
            {[
              { id: 'ALL', label: 'Barcha Tranzaksiya Guruhlari' },
              { id: 'VIP', label: 'VIP (>=200k UZS)' },
              { id: 'REGULAR', label: 'O\'rtacha (<200k UZS)' },
              { id: 'NEW', label: 'Sarfsiz (0 UZS)' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterSpending(f.id)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                  filterSpending === f.id 
                    ? 'bg-white dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CRM Client Grid/List */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">{t('clients_page.fullname')}</th>
                <th className="p-4">{t('clients_page.phone')}</th>
                <th className="p-4">{t('clients_page.address')}</th>
                <th className="p-4">Buyurtmalar soni</th>
                <th className="p-4">Jami Sarf</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300 text-xs font-medium">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                    Mijozlar topilmadi
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => {
                  const stats = getClientStats(c.full_name);
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => handleOpenClientDetails(c)}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition cursor-pointer"
                    >
                      <td className="p-4 font-semibold text-slate-800 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {c.full_name.charAt(0)}
                        </div>
                        {c.full_name}
                      </td>
                      <td className="p-4 text-slate-800 dark:text-gray-200 font-mono font-bold">{c.phone}</td>
                      <td className="p-4 text-slate-500 dark:text-gray-400 truncate max-w-[200px]" title={c.address}>
                        {c.address || 'Kiritilmagan'}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-gray-300 font-bold font-['Outfit']">{stats.orderCount} ta</td>
                      <td className="p-4 text-indigo-600 dark:text-indigo-400 font-extrabold font-['Outfit']">
                        {stats.spent.toLocaleString()} UZS
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedClient(c);
                            setShowOrderModal(true);
                          }}
                          title="Buyurtma yaratish"
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingClient(c);
                            setShowEditModal(true);
                          }}
                          title="Tahrirlash"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClient(c, e)}
                          title="O'chirish"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-450 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">{t('clients_page.new_client')}</h3>
            <form onSubmit={handleAddClient} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.fullname')}</label>
                <input 
                  type="text" 
                  value={newClient.full_name} 
                  onChange={(e) => setNewClient({...newClient, full_name: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.phone')}</label>
                <input 
                  type="text" 
                  value={newClient.phone} 
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.address')}</label>
                <input 
                  type="text" 
                  value={newClient.address} 
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Mijozni Tahrirlash</h3>
            <form onSubmit={handleEditClient} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.fullname')}</label>
                <input 
                  type="text" 
                  value={editingClient.full_name} 
                  onChange={(e) => setEditingClient({...editingClient, full_name: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.phone')}</label>
                <input 
                  type="text" 
                  value={editingClient.phone} 
                  onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.address')}</label>
                <input 
                  type="text" 
                  value={editingClient.address || ''} 
                  onChange={(e) => setEditingClient({...editingClient, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Order Dispatch Modal */}
      {showOrderModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Yangi Tezkor Buyurtma</h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">Mijoz: <span className="font-bold text-slate-800 dark:text-gray-200">{selectedClient.full_name}</span></p>
            <form onSubmit={handleCreateQuickOrder} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.service_type')}</label>
                <select 
                  value={quickOrder.service_id}
                  onChange={(e) => setQuickOrder({...quickOrder, service_id: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Tanlang --</option>
                  {services.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">{s.name_uz} ({s.price.toLocaleString()} UZS)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('orders_page.worker')}</label>
                <select 
                  value={quickOrder.worker_id}
                  onChange={(e) => setQuickOrder({...quickOrder, worker_id: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Tanlang --</option>
                  {workers.map(w => <option key={w.id} value={w.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-gray-200">{w.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('dashboard.address')}</label>
                <input 
                  type="text" 
                  value={quickOrder.address} 
                  onChange={(e) => setQuickOrder({...quickOrder, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder={selectedClient.address}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowOrderModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Client Details Drawer/Modal */}
      {selectedClient && !showOrderModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-lg">
                  {selectedClient.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-['Outfit']">{selectedClient.full_name}</h3>
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">ID: {selectedClient.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setEditingClient(selectedClient);
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                </button>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Contact info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3.5 rounded-xl flex items-center gap-3">
                  <Phone className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.phone')}</p>
                    <p className="text-xs text-slate-800 dark:text-gray-200 font-bold mt-0.5">{selectedClient.phone}</p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3.5 rounded-xl flex items-center gap-3 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.address')}</p>
                    <p className="text-xs text-slate-800 dark:text-gray-200 font-semibold mt-0.5">{selectedClient.address || 'Kiritilmagan'}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">{t('clients_page.client_stats')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.total_orders')}</p>
                    <h5 className="text-lg font-extrabold text-slate-800 dark:text-white font-['Outfit']">{clientStats.totalOrders} ta</h5>
                  </div>
                  <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('clients_page.total_spent')}</p>
                    <h5 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">{clientStats.totalSpent.toLocaleString()} UZS</h5>
                  </div>
                  <div className="border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-1 bg-white dark:bg-transparent">
                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">Sevimli Xizmat</p>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate font-['Outfit']" title={clientStats.favoriteService}>
                      {clientStats.favoriteService}
                    </h5>
                  </div>
                </div>
              </div>

              {/* CRM Activity Timeline Notes */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Mijoz Faoliyati va Eslatmalar (CRM Timeline)</h4>
                
                {/* Note creation form */}
                <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Mijoz uchun yangi eslatma yozish..."
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  />
                  <button 
                    type="submit" 
                    className="premium-btn text-white px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Yozish
                  </button>
                </form>

                {/* Notes List */}
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  {(!selectedClient.notes || selectedClient.notes.length === 0) ? (
                    <p className="text-[11px] text-slate-400 dark:text-gray-500 italic">Eslatmalar yozilmagan</p>
                  ) : (
                    selectedClient.notes.map(note => (
                      <div key={note.id} className="bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 p-3 rounded-xl space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 dark:text-gray-500 font-bold">
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-indigo-500" /> Eslatma</span>
                          <span>{note.date}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">{t('clients_page.order_history')}</h4>
                {clientOrders.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-gray-500 font-medium border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                    Sotib olingan xizmatlar mavjud emas
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-transparent">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5 text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500">
                          <th className="p-3">Xizmat</th>
                          <th className="p-3">Xodim</th>
                          <th className="p-3">Narxi</th>
                          <th className="p-3">Sana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px] text-slate-700 dark:text-gray-300 font-medium">
                        {clientOrders.map(o => (
                          <tr key={o.id}>
                            <td className="p-3 text-slate-800 dark:text-white font-semibold">{o.service_name}</td>
                            <td className="p-3 text-slate-500 dark:text-gray-400">{o.worker_name}</td>
                            <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold">{o.price.toLocaleString()} UZS</td>
                            <td className="p-3 text-slate-400 dark:text-gray-500">2026-06-26</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4 flex justify-between items-center">
              <button 
                onClick={() => setShowOrderModal(true)}
                className="flex items-center gap-1.5 premium-btn text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" /> Yangi Buyurtma
              </button>
              <button 
                onClick={() => setSelectedClient(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-750 dark:text-gray-300 text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
