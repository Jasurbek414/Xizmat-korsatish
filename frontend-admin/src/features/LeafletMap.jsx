import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Navigation, RefreshCw, Info, Phone, Compass, Layers } from 'lucide-react';
import { api } from '../services/api';

// Haydovchi shu vaqt ichida GPS yubormasa "OFFLINE" deb hisoblanadi (mobil
// ilova har 15 soniyada bir marta yuboradi - 45s ~ 3 marta ketma-ket
// o'tkazib yuborilsa, haqiqatan ham signal yo'qolgan deb hisoblaymiz).
const GPS_STALE_MS = 45_000;

const formatLastSeen = (lastSeenMs) => {
  if (!lastSeenMs) return 'Hech qachon';
  const diffSec = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
  if (diffSec < 60) return 'Hozirgina';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  return `${Math.floor(diffHour / 24)} kun oldin`;
};

const LeafletMap = ({ tab }) => {
  const { t, i18n } = useTranslation();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  // State variables
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, FREE, BUSY, OFFLINE
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [mapStyle, setMapStyle] = useState(() => 
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  // Load data from API
  const loadData = async () => {
    try {
      const [driversData, allOrders, statusesData] = await Promise.all([
        api.getDriversGps(),
        api.getOrders(),
        api.getOrderStatuses()
      ]);

      // "Yakunlangan" - ro'yxatdagi eng oxirgi bosqich (sort_order bo'yicha),
      // chunki har bir kompaniya statuslarni o'zi moslashtirib sozlaydi.
      const sortedStatuses = [...statusesData].sort((a, b) => a.sortOrder - b.sortOrder);
      const completedStatusId = sortedStatuses.length > 0 ? sortedStatuses.slice(-1)[0].id : null;

      const driverUsers = driversData.map(d => ({
        id: d.id,
        full_name: d.fullName,
        username: d.username,
        role: d.role,
        phone: d.phone,
        status: d.status,
        // Haqiqiy GPS ma'lumoti bo'lmasa null qoldiramiz - Toshkent markaziga
        // "soxta" joylashtirib, hali hech qachon signal yubormagan haydovchini
        // xaritada "onlayn"dek ko'rsatib yubormaslik uchun.
        lat: d.latitude ?? null,
        lng: d.longitude ?? null,
        lastSeenMs: d.lastLocationAt ? new Date(d.lastLocationAt).getTime() : null
      }));

      const mappedOrders = allOrders.map(o => ({
        id: o.id,
        client_name: o.client ? o.client.fullName : '',
        worker_name: o.worker ? o.worker.fullName : '',
        status_id: o.status ? o.status.id : null,
        latitude: o.latitude || 41.311081,
        longitude: o.longitude || 69.240562,
        price: o.price
      }));

      const now = Date.now();
      const enrichedDrivers = driverUsers.map(driver => {
        const activeOrder = mappedOrders.find(o =>
          o.worker_name === driver.full_name && o.status_id !== completedStatusId
        );

        const hasLocation = driver.lat != null && driver.lng != null;
        const isStale = !driver.lastSeenMs || (now - driver.lastSeenMs) > GPS_STALE_MS;

        let status = 'FREE';
        if (driver.status === 'BLOCKED' || !hasLocation || isStale) {
          status = 'OFFLINE';
        } else if (activeOrder) {
          status = 'BUSY';
        }

        return {
          ...driver,
          status,
          hasLocation,
          activeOrder
        };
      });

      setDrivers(enrichedDrivers);
      setOrders(mappedOrders);
    } catch (err) {
      console.error("Failed to load map data:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll the backend GPS coordinates every 6 seconds
    const dbInterval = setInterval(() => {
      loadData();
    }, 6000);

    return () => clearInterval(dbInterval);
  }, [tab]);

  // Determine active driver status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'FREE': return 'bg-emerald-500 text-emerald-600 dark:text-emerald-400 border-emerald-500/10';
      case 'BUSY': return 'bg-indigo-500 text-indigo-600 dark:text-indigo-400 border-indigo-500/10';
      default: return 'bg-slate-400 text-slate-500 dark:text-gray-400 border-slate-500/10';
    }
  };

  // Filtered drivers based on search input and status tabs
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (driver.phone && driver.phone.includes(search));
    
    const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate order coordinates deterministically near the driver's initial coords
  const getOrderCoords = (order, driver) => {
    if (order.latitude && order.longitude) {
      return [order.latitude, order.longitude];
    }
    const seed = order.id.charCodeAt(order.id.length - 1) || 0;
    const latOffset = 0.0035 + (seed % 4) * 0.001;
    const lngOffset = 0.0035 + (seed % 3) * 0.0012;
    return [driver.lat + latOffset, driver.lng + lngOffset];
  };

  // Fly/Pan map to a driver marker
  const handleLocateDriver = (driver) => {
    if (!mapRef.current || !driver.lat || !driver.lng) return;
    setSelectedDriverId(driver.id);
    mapRef.current.flyTo([driver.lat, driver.lng], 15, {
      animate: true,
      duration: 1.5
    });
  };

  // Center/Fit all driver markers on map
  const handleFitBounds = () => {
    if (!mapRef.current || drivers.length === 0) return;
    const validCoords = drivers
      .filter(d => d.lat && d.lng)
      .map(d => [d.lat, d.lng]);
    
    if (validCoords.length > 0) {
      mapRef.current.fitBounds(validCoords, { padding: [50, 50] });
    }
  };

  const markerGroupRef = useRef(null);
  const routeGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Hook 1: Initialize Leaflet Map instance once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([41.311081, 69.240562], 12);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // Create layer groups for markers and routes
    markerGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Hook 2: Update tile layer style when mapStyle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = mapStyle === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap contributors, © CartoDB'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapStyle]);

  // Hook 3: Draw markers and route polylines when drivers list updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerGroupRef.current || !routeGroupRef.current) return;

    // Clear existing layers
    markerGroupRef.current.clearLayers();
    routeGroupRef.current.clearLayers();

    // Render Driver markers and order destination routes
    drivers.forEach(driver => {
      if (!driver.lat || !driver.lng) return;

      const initials = driver.full_name
        ? driver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

      const colorClass = driver.status === 'FREE' 
        ? 'bg-emerald-500' 
        : driver.status === 'BUSY'
        ? 'bg-indigo-500'
        : 'bg-slate-400';

      const pulseClass = driver.status === 'FREE'
        ? 'bg-emerald-500/30'
        : driver.status === 'BUSY'
        ? 'bg-indigo-500/30'
        : 'bg-slate-400/20';

      // Custom marker icon showing driver initials and pulse aura
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker-icon',
        html: `<div class="relative flex items-center justify-center cursor-pointer">
                 <div class="absolute w-8 h-8 rounded-full ${pulseClass} ${driver.status !== 'OFFLINE' ? 'animate-ping' : ''}"></div>
                 <div class="w-7 h-7 rounded-full ${colorClass} border-2 border-white dark:border-slate-800 shadow-xl flex items-center justify-center text-[9px] font-bold text-white font-sans">
                   ${initials}
                 </div>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const driverMarker = L.marker([driver.lat, driver.lng], { icon: driverIcon })
        .addTo(markerGroupRef.current);

      // Bind custom popup
      driverMarker.bindPopup(`
        <div style="color: #1e293b; font-family: 'Outfit', sans-serif; padding: 6px; font-size: 11px; width: 180px;">
          <h4 style="margin: 0 0 3px; font-weight: 800; font-size: 12px; color: #1e1b4b;">${driver.full_name}</h4>
          <p style="margin: 0; color: #64748b; font-weight: 550;">Tel: ${driver.phone || '—'}</p>
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${
              driver.status === 'FREE' ? '#10b981' : driver.status === 'BUSY' ? '#6366f1' : '#94a3b8'
            }"></span>
            <span style="font-weight: 700; text-transform: uppercase; font-size: 9px; color: ${
              driver.status === 'FREE' ? '#059669' : driver.status === 'BUSY' ? '#4f46e5' : '#64748b'
            };">
              ${driver.status === 'FREE' ? 'Online / Bo\'sh' : driver.status === 'BUSY' ? 'Buyurtmada' : 'Offline'}
            </span>
          </div>
          <div style="margin-top: 4px; color: #94a3b8; font-size: 9px;">So'nggi signal: ${formatLastSeen(driver.lastSeenMs)}</div>
          ${driver.activeOrder ? `
            <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 6px; font-size: 10px;">
              <span style="font-weight: bold; color: #4f46e5; display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Faol Buyurtma:</span>
              <span style="color: #334155; font-weight: 600; display: block; margin-top: 1px;">${driver.activeOrder.service_name}</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 1px;">Manzil: ${driver.activeOrder.address}</span>
            </div>
          ` : ''}
        </div>
      `);

      // If driver is busy on an order, show route and destination on the map
      if (driver.status === 'BUSY' && driver.activeOrder) {
        const orderCoords = getOrderCoords(driver.activeOrder, driver);
        
        // Order Destination Icon
        const orderIcon = L.divIcon({
          className: 'custom-order-destination-icon',
          html: `<div class="flex items-center justify-center cursor-pointer">
                   <div class="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center">
                     <div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                   </div>
                 </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Add order marker
        L.marker(orderCoords, { icon: orderIcon })
          .addTo(routeGroupRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
              <strong style="color: #e11d48;">Mijoz manzili</strong>
              <p style="margin: 3px 0 0; color: #475569;">${driver.activeOrder.address}</p>
            </div>
          `);

        // Draw transit route line
        L.polyline([[driver.lat, driver.lng], orderCoords], {
          color: '#f43f5e', // rose-500
          dashArray: '4, 6',
          weight: 2,
          opacity: 0.8
        }).addTo(routeGroupRef.current);
      }
    });
  }, [drivers]);

  return (
    <div className="space-y-6 h-[calc(100vh-130px)] flex flex-col animate-fade-in text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Xodimlar Monitoringi</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Haydovchi va kuryerlar joylashuvini real vaqtda OpenStreetMap orqali boshqarish</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 transition cursor-pointer font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yangilash</span>
          </button>
          
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 px-3.5 py-2 rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Real-Time Engine
          </span>
        </div>
      </div>

      {/* Main Console Split-Screen Grid */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Drivers Control Panel */}
        <div className="w-full lg:w-80 shrink-0 glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm flex flex-col gap-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki telefon..."
              className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {['ALL', 'FREE', 'BUSY', 'OFFLINE'].map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setStatusFilter(tabKey)}
                className={`flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer transition font-bold ${
                  statusFilter === tabKey
                    ? 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {tabKey === 'ALL' ? 'Barchasi' : tabKey === 'FREE' ? 'Bo\'sh' : tabKey === 'BUSY' ? 'Band' : 'Offline'}
              </button>
            ))}
          </div>

          {/* Drivers List container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin max-h-[360px] lg:max-h-none">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-gray-500 font-medium">
                Xodimlar topilmadi
              </div>
            ) : (
              filteredDrivers.map(driver => {
                const isSelected = selectedDriverId === driver.id;
                return (
                  <div 
                    key={driver.id}
                    onClick={() => handleLocateDriver(driver)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-500/5 border-indigo-500/30' 
                        : 'border-slate-150 dark:border-white/5 bg-slate-50/30 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="space-y-1">
                      {/* Driver Name & status badge */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-white leading-tight">
                          {driver.full_name}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          driver.status === 'FREE' ? 'bg-emerald-500' : driver.status === 'BUSY' ? 'bg-indigo-500' : 'bg-slate-400'
                        }`}></span>
                      </div>

                      {/* Phone */}
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{driver.phone || '—'}</span>
                      </div>

                      {/* Last GPS signal - especially useful when OFFLINE */}
                      {driver.status === 'OFFLINE' && (
                        <div className="text-[9px] text-rose-400 dark:text-rose-400/80 font-medium">
                          So'nggi signal: {formatLastSeen(driver.lastSeenMs)}
                        </div>
                      )}

                      {/* Order info details */}
                      {driver.activeOrder && (
                        <div className="mt-2 text-[9px] bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-lg p-1.5 space-y-0.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-wide text-[8px]">
                            Yetkazib berilmoqda:
                          </span>
                          <span className="text-slate-700 dark:text-gray-300 font-semibold block">
                            {driver.activeOrder.service_name}
                          </span>
                          <span className="text-slate-400 dark:text-gray-500 block truncate max-w-[220px]">
                            {driver.activeOrder.address}
                          </span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLocateDriver(driver); }}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-gray-300 transition cursor-pointer"
                      title="Xaritada topish"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Map Viewport with floating controls */}
        <div className="flex-1 bg-white dark:bg-[#111827]/85 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden p-1 relative shadow-sm min-h-[480px]">
          
          {/* OpenStreetMap viewport container */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full rounded-[22px] z-10" />

          {/* Floating Map Controls HUD */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            
            {/* Map Theme Toggle */}
            <button
              onClick={() => setMapStyle(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-lg flex items-center gap-1.5 font-bold"
              title="Xarita uslubini o'zgartirish"
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] hidden sm:inline">
                {mapStyle === 'dark' ? 'Kunduzgi xarita' : 'Tungi xarita'}
              </span>
            </button>

            {/* Fit Zoom Button */}
            <button
              onClick={handleFitBounds}
              className="p-2.5 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-lg flex items-center gap-1.5 font-bold"
              title="Barcha xodimlarni sig'dirish"
            >
              <Compass className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] hidden sm:inline">Hammani markazlash</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeafletMap;
