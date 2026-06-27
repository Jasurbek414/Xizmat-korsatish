import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Settings as SettingsIcon, LogOut, Radio, X, Check } from 'lucide-react';
import Dialer from './components/Dialer';
import Clients from './components/Clients';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import IntakeForm from './components/IntakeForm';
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
    <div className="flex flex-col bg-[#0d111d] h-screen text-slate-200 font-sans w-full overflow-hidden relative">
      
      {/* Top Header matching reference */}
      <header className="h-14 border-b border-slate-800/40 bg-[#0d111d] flex items-center justify-between px-6 shrink-0 select-none relative z-20">
        
        {/* Left branding */}
        <span className="text-xs font-black text-slate-100 tracking-wider font-mono">
          TERMINAL v1.1
        </span>

        {/* Right profile & control widgets */}
        <div className="flex items-center gap-4">
          
          {/* Active Operator info */}
          <div className="flex items-center gap-2.5">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth.full_name || 'Operator')}&background=5850ec&color=fff&bold=true`}
              alt="Avatar"
              className="w-7 h-7 rounded-full border border-slate-850"
            />
            <div className="text-left leading-none">
              <span className="block text-[11px] font-extrabold text-slate-200 leading-tight">
                {auth.full_name}
              </span>
              <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                @{auth.username || 'operator1'}
              </span>
            </div>
          </div>

          {/* Call Connection indicator & Drawer Toggle */}
          <div className="flex items-center gap-2.5 border-l border-slate-800/40 pl-4">
            <button
              onClick={() => setShowDialer(!showDialer)}
              className={`p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                showDialer 
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                  : 'bg-[#151b2d] border-slate-800/60 text-slate-400 hover:text-white'
              }`}
              title="Telefon paneli"
            >
              <Radio className={`w-3.5 h-3.5 ${sipStatus === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg bg-[#151b2d] border border-slate-800/60 text-slate-400 hover:text-white transition cursor-pointer"
              title="Sozlamalar"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-[#151b2d] border border-slate-800/60 text-slate-400 hover:text-rose-500 transition cursor-pointer"
              title="Tizimdan chiqish"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 overflow-hidden h-[calc(100vh-3.5rem)] relative flex flex-col lg:flex-row gap-6 z-10">
        
        {/* Column 1 (Left drawer): Dialer Keypad & Call Logs */}
        {showDialer && (
          <div className="w-[300px] shrink-0 h-full bg-[#151b2d] border border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between overflow-hidden relative z-20 animate-slide-right">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/40 mb-3 select-none">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">SIP Softphone</span>
              <button onClick={() => setShowDialer(false)} className="text-slate-500 hover:text-slate-350 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <Dialer />
            </div>
          </div>
        )}

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
        {incomingCall && (
          <div className="fixed top-6 right-6 z-[9999] w-80 bg-white/95 dark:bg-[#111622]/95 border border-indigo-500/20 dark:border-indigo-400/20 shadow-2xl p-5 rounded-2xl animate-slide-in text-xs font-semibold select-none">
            
            {/* Pulsing ring visual */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                </div>
              </div>

              <div>
                <span className="block font-bold text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Kiruvchi Call {incomingCall.lineLabel ? `(${incomingCall.lineLabel})` : ''}
                </span>
                <span className="block font-extrabold text-slate-800 dark:text-white text-xs mt-0.5 leading-none">
                  {incomingCall.clientName || 'Noma\'lum mijoz'}
                </span>
                <span className="block text-[9px] text-slate-450 dark:text-gray-550 font-mono mt-0.5">
                  {incomingCall.number}
                </span>
              </div>
            </div>

            {/* Answer/Reject trigger buttons */}
            <div className="flex gap-2 pt-3">
              <button
                onClick={handleRejectCall}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold py-2 rounded-xl transition cursor-pointer border border-rose-500/10 flex items-center justify-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Rad etish
              </button>
              <button
                onClick={handleAnswerCall}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 fill-white" /> Javob berish
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Settings Modal Dialog Overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-xs font-semibold animate-fade-in">
          <div className="bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-white/5 rounded-2xl p-6 max-w-2xl w-full h-[500px] shadow-2xl relative animate-scale-in flex flex-col">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 z-20"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-h-0">
              <Settings auth={auth} sipStatus={sipStatus} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
