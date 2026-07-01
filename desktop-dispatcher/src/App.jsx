import React, { useState, useEffect } from 'react';
import Dialer from './components/Dialer';
import Clients from './components/Clients';
import LoginPage from './components/LoginPage';
import IntakeForm from './components/IntakeForm';
import Header from './components/Header';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import SettingsModal from './components/SettingsModal';
import sipService from './services/sipService';
import { initMockDb, getDbItem } from './store/mockDb';
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
  const [showLineDropdown, setShowLineDropdown] = useState(false);

  useEffect(() => {
    // Ensure dark mode is active
    document.documentElement.classList.add('dark');
    
    // Seed local database
    initMockDb();

    // Immediately synchronize React state from seeded database
    const initialLines = getDbItem('dispatcher_sip_lines') || [];
    setSipLines(initialLines);
    
    // Check operator auth state
    const storedAuth = localStorage.getItem('dispatcher_auth');
    if (storedAuth) {
      const user = JSON.parse(storedAuth);
      setAuth(user);
      
      // Initialize multiple lines simulation on launch
      sipService.initialize();
    } else {
      // Even if not logged in yet, load lines in the service
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

  // Quick call from Clients panel
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
    const orders = getDbItem('dispatcher_orders') || [];
    const order = {
      id: 'ORD-2026-0000' + (orders.length + 1),
      client_name: orderData.client_name,
      service_name: orderData.service_name,
      price: orderData.price,
      address: orderData.address,
      payment_method: orderData.payment_method,
      description: orderData.description,
      status: 'Qabul qilindi',
      created_at: new Date().toISOString()
    };

    const updated = [order, ...orders];
    setDbItem('dispatcher_orders', updated);
    setIntakeClient(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] flex items-center justify-center text-slate-800 dark:text-white font-semibold">
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

        {/* Column 2: Clients list, search and Kanban Active board */}
        <div className="flex-1 min-w-[320px] h-full overflow-hidden">
          <Clients 
            onCallTrigger={handleQuickCallTrigger} 
            onSelectIntakeClient={setIntakeClient}
          />
        </div>

        {/* Column 3: Always-Open Order Intake Form */}
        <div className="w-[360px] shrink-0 h-full">
          <IntakeForm
            onAddOrder={handleCreateOrder}
            onCancel={() => setIntakeClient(null)}
            preSelectedClient={intakeClient}
          />
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

    </div>
  );
};

export default App;
