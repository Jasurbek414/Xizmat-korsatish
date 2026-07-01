import React, { useState, useEffect } from 'react';
import Dialer from './components/Dialer';
import LoginPage from './components/LoginPage';
import IntakeForm from './components/IntakeForm';
import Header from './components/Header';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import SettingsModal from './components/SettingsModal';
import KanbanBoard from './components/KanbanBoard';
import ClientList from './components/ClientList';
import GlobalFlowMap from './components/GlobalFlowMap';
import FullCallLog from './components/FullCallLog';
import RecentCallerInfo from './components/RecentCallerInfo';
import AddClientModal from './components/AddClientModal';
import sipService from './services/sipService';
import { initMockDb, getDbItem, setDbItem } from './store/mockDb';
import './App.css';

const App = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intakeClient, setIntakeClient] = useState(null);
  const [showDialer, setShowDialer] = useState(false);
  
  // SIP status, settings toggle and incoming call popups
  const [sipStatus, setSipStatus] = useState('DISCONNECTED');
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Multi-line specific states
  const [sipLines, setSipLines] = useState(() => getDbItem('dispatcher_sip_lines') || []);
  const [lineStatuses, setLineStatuses] = useState(sipService.lineStatuses);
  const [activeLineId, setActiveLineId] = useState(sipService.activeLineId);

  // Database lists
  const [clients, setClients] = useState(() => getDbItem('dispatcher_clients') || []);
  const [orders, setOrders] = useState(() => getDbItem('dispatcher_orders') || []);
  const [showAddClient, setShowAddClient] = useState(false);

  useEffect(() => {
    // Ensure dark mode is active
    document.documentElement.classList.add('dark');
    
    // Seed local database
    initMockDb();

    // Immediately synchronize React state from database
    setClients(getDbItem('dispatcher_clients') || []);
    setOrders(getDbItem('dispatcher_orders') || []);
    const initialLines = getDbItem('dispatcher_sip_lines') || [];
    setSipLines(initialLines);
    
    // Check operator auth state
    const storedAuth = localStorage.getItem('dispatcher_auth');
    if (storedAuth) {
      const user = JSON.parse(storedAuth);
      setAuth(user);
      sipService.initialize();
    } else {
      sipService.loadLines();
    }
    setLoading(false);

    // Setup SIP Service event listeners
    const handleStatusChange = (status) => {
      setSipStatus(status);
    };

    const handleIncomingCall = (call) => {
      setIncomingCall(call);
      setShowDialer(true);
      
      // Auto populate caller details into form
      setIntakeClient({
        id: 'cl_incoming_' + Date.now(),
        full_name: call.clientName || 'Noma\'lum Mijoz',
        phone: call.number,
        address: ''
      });
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    const handleLinesStatusChange = (data) => {
      setLineStatuses({ ...data.lineStatuses });
      setActiveLineId(data.activeLineId);
    };

    const handleStorageChange = () => {
      const updatedLines = getDbItem('dispatcher_sip_lines') || [];
      setSipLines(updatedLines);
      setClients(getDbItem('dispatcher_clients') || []);
      setOrders(getDbItem('dispatcher_orders') || []);
      sipService.loadLines();
    };

    sipService.addEventListener('statusChange', handleStatusChange);
    sipService.addEventListener('incomingCall', handleIncomingCall);
    sipService.addEventListener('callEnded', handleCallEnded);
    sipService.addEventListener('linesStatusChange', handleLinesStatusChange);
    window.addEventListener('storage', handleStorageChange);

    // Initial state
    setSipStatus(sipService.status);
    setLineStatuses({ ...sipService.lineStatuses });
    setActiveLineId(sipService.activeLineId);

    return () => {
      sipService.removeEventListener('statusChange', handleStatusChange);
      sipService.removeEventListener('incomingCall', handleIncomingCall);
      sipService.removeEventListener('callEnded', handleCallEnded);
      sipService.removeEventListener('linesStatusChange', handleLinesStatusChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dispatcher_auth');
    setAuth(null);
    sipService.disconnect();
  };

  // Quick call triggers
  const handleQuickCallTrigger = (phone, name) => {
    if (sipService.status !== 'CONNECTED' || sipService.callState !== 'IDLE') return;
    sipService.makeCall(phone, name);
  };

  // Incoming Call actions
  const handleAnswerCall = () => {
    sipService.answerCall();
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    sipService.rejectCall();
    setIncomingCall(null);
  };

  const handleCreateOrder = (orderData) => {
    const activeOrders = getDbItem('dispatcher_orders') || [];
    const order = {
      id: 'ORD-2026-0000' + (activeOrders.length + 1),
      client_name: orderData.client_name,
      service_name: orderData.service_name,
      price: orderData.price,
      address: orderData.address,
      payment_method: orderData.payment_method,
      description: orderData.description,
      status: 'Qabul qilindi',
      created_at: new Date().toISOString()
    };

    const updated = [order, ...activeOrders];
    setOrders(updated);
    setDbItem('dispatcher_orders', updated);
    setIntakeClient(null);
  };

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
    setIntakeClient(client);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    setDbItem('dispatcher_orders', updated);
  };

  // Active orders count calculation
  const activeOrdersCount = orders.filter(o => o.status !== 'Yakunlandi' && o.status !== 'Bekor qilindi').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-semibold">
        Yuklanmoqda...
      </div>
    );
  }

  if (!auth) {
    return <LoginPage setAuth={setAuth} />;
  }

  return (
    <div className="flex flex-col bg-[#080b11] h-screen text-slate-200 font-sans w-full overflow-hidden relative">
      
      {/* Top Header */}
      <Header
        auth={auth}
        sipStatus={sipStatus}
        onToggleSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
      />

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 overflow-hidden h-[calc(100vh-3.5rem)] relative flex flex-col lg:flex-row gap-6 z-10">
        
        {/* Column 1: Dialer Keypad & Call Logs (Permanently Visible) */}
        <div className="w-[280px] shrink-0 h-full bg-[#111522] border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between overflow-hidden relative z-10 shadow-2xl">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.04] mb-3.5 select-none shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold font-outfit">SIP Softphone</span>
          </div>
          <div className="flex-1 min-h-0">
            <Dialer />
          </div>
        </div>

        {/* Column 2: Kanban Active board, Clients list, Map, and Full Call Log Table */}
        <div className="flex-1 min-w-[500px] h-full flex flex-col overflow-hidden">
          
          {/* Top Panel: Faol Buyurtmalar (Kanban Board) */}
          <div className="bg-[#111522] border border-white/[0.04] rounded-2xl p-5 flex flex-col shadow-2xl h-[48%] shrink-0">
            <div className="border-b border-white/[0.04] pb-3 mb-3.5 shrink-0">
              <span className="text-[10.5px] font-extrabold text-slate-100 uppercase tracking-widest font-outfit">
                FAOL BUYURTMALAR <span className="ml-1 text-slate-500 font-bold">({activeOrdersCount})</span>
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <KanbanBoard
                orders={orders}
                onUpdateStatus={handleUpdateOrderStatus}
                onSelectOrderClient={setIntakeClient}
              />
            </div>
          </div>

          {/* Bottom Panels Row */}
          <div className="flex-1 flex gap-4 min-h-0 mt-5">
            
            {/* 1. Mijozlar Bazasi */}
            <div className="w-[30%] bg-[#111522] border border-white/[0.04] rounded-2xl p-5 flex flex-col shadow-2xl min-h-0">
              <div className="border-b border-white/[0.04] pb-3 mb-3 shrink-0 flex justify-between items-center">
                <span className="text-[10.5px] font-extrabold text-slate-100 uppercase tracking-widest font-outfit">
                  MIJOZLAR BAZASI
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddClient(true)}
                  className="text-[#5850ec] hover:text-indigo-400 font-bold text-[9px] font-outfit uppercase tracking-wider transition cursor-pointer"
                >
                  + Yangi
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ClientList
                  clients={clients}
                  onSelectClient={setIntakeClient}
                  onAddClientClick={() => setShowAddClient(true)}
                  onCallClick={handleQuickCallTrigger}
                />
              </div>
            </div>

            {/* 2. Global Flow Map */}
            <div className="w-[32%] bg-[#111522] border border-white/[0.04] rounded-2xl p-5 flex flex-col shadow-2xl min-h-0">
              <div className="border-b border-white/[0.04] pb-3 mb-3 shrink-0">
                <span className="text-[10.5px] font-extrabold text-slate-100 uppercase tracking-widest font-outfit">
                  GLOBAL FLOW <span className="text-slate-550 lowercase font-bold font-mono">(Current orders with map)</span>
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <GlobalFlowMap />
              </div>
            </div>

            {/* 3. Full Call Log Table */}
            <div className="w-[38%] min-h-0">
              <FullCallLog onQuickCall={handleQuickCallTrigger} />
            </div>

          </div>

        </div>

        {/* Column 3: Order Intake form, Caller Details, and Actions */}
        <div className="w-[360px] shrink-0 h-full flex flex-col gap-4 overflow-hidden">
          
          {/* Form Panel */}
          <div className="flex-1 min-h-0">
            <IntakeForm
              onAddOrder={handleCreateOrder}
              preSelectedClient={intakeClient}
            />
          </div>

          {/* Caller Details Panel */}
          <div className="shrink-0">
            <RecentCallerInfo 
              activeClient={intakeClient} 
              auth={auth}
            />
          </div>

          {/* Form submit/reset buttons */}
          <div className="bg-[#111522] border border-white/[0.04] rounded-2xl p-4.5 shrink-0 flex justify-end gap-3.5 shadow-2xl">
            <button
              type="reset"
              form="intake-form"
              className="px-5 py-2.5 bg-[#1c243b] hover:bg-[#232d4a] text-slate-350 hover:text-slate-200 font-extrabold rounded-xl transition cursor-pointer text-[10px] uppercase tracking-wider font-outfit flex-1"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="intake-form"
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-xl transition cursor-pointer text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-500/10 active:scale-95 font-outfit flex-1"
            >
              Saqlash
            </button>
          </div>

        </div>

        {/* Global Floating Incoming Call HUD Overlay Card */}
        <IncomingCallOverlay
          incomingCall={incomingCall}
          onAnswerCall={handleAnswerCall}
          onRejectCall={handleRejectCall}
        />

      </main>

      {/* Settings Modal Dialog Overlay */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        auth={auth}
        sipStatus={sipStatus}
      />

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onAdd={handleAddClient}
      />

    </div>
  );
};

export default App;
