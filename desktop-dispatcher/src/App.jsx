import React, { useState, useEffect } from 'react';
import Dialer from './components/Dialer';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import SettingsModal from './components/SettingsModal';
import MijozBuyurtmaForm from './components/MijozBuyurtmaForm';
import SonggiQongiroqlar from './components/SonggiQongiroqlar';
import sipService from './services/sipService';
import { initMockDb, getDbItem, setDbItem } from './store/mockDb';
import './App.css';

const App = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intakeClient, setIntakeClient] = useState(null);
  
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('dispatcher_theme') || 'dark');

  // SIP status, settings toggle and incoming call popups
  const [sipStatus, setSipStatus] = useState('DISCONNECTED');
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dispatcher_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Seed local database
    initMockDb();

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

    sipService.addEventListener('statusChange', handleStatusChange);
    sipService.addEventListener('incomingCall', handleIncomingCall);
    sipService.addEventListener('callEnded', handleCallEnded);

    // Initial state
    setSipStatus(sipService.status);

    return () => {
      sipService.removeEventListener('statusChange', handleStatusChange);
      sipService.removeEventListener('incomingCall', handleIncomingCall);
      sipService.removeEventListener('callEnded', handleCallEnded);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dispatcher_auth');
    setAuth(null);
    sipService.disconnect();
  };

  const handleQuickCallTrigger = (phone, name) => {
    if (sipService.status !== 'CONNECTED' || sipService.callState !== 'IDLE') return;
    sipService.makeCall(phone, name);
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
    setDbItem('dispatcher_orders', updated);
    setIntakeClient(null);
    alert("Buyurtma muvaffaqiyatli qabul qilindi!");
  };

  const handleAnswerCall = () => {
    sipService.answerCall();
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    sipService.rejectCall();
    setIncomingCall(null);
  };

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
    <div className="flex flex-col bg-[var(--bg-app)] h-screen text-[var(--text-primary)] font-sans w-full overflow-hidden relative transition-colors duration-300">
      
      {/* Top Header */}
      <Header
        auth={auth}
        sipStatus={sipStatus}
        onToggleSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 overflow-hidden h-[calc(100vh-3.5rem)] relative flex flex-col lg:flex-row gap-6 z-10">
        
        {/* Column 1 (Left): Dialer Keypad & Call Stats */}
        <div className="w-[280px] shrink-0 h-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-5 rounded-2xl flex flex-col justify-between overflow-hidden relative z-10 shadow-2xl transition-colors duration-300">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)] mb-3.5 select-none shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-extrabold font-outfit">SIP Softphone</span>
          </div>
          <div className="flex-1 min-h-0">
            <Dialer />
          </div>
        </div>

        {/* Column 2 (Right): Top Customer/Order Form, Bottom Call Logs History */}
        <div className="flex-1 h-full flex flex-col gap-6 min-w-[500px] overflow-hidden">
          
          {/* Top Panel: Customer & Order Form Card */}
          <div className="shrink-0">
            <MijozBuyurtmaForm
              onAddOrder={handleCreateOrder}
              preSelectedClient={intakeClient}
            />
          </div>

          {/* Bottom Panel: Call History logs */}
          <div className="flex-1 min-h-0">
            <SonggiQongiroqlar
              onQuickCall={handleQuickCallTrigger}
              onSelectClient={setIntakeClient}
            />
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

    </div>
  );
};

export default App;
