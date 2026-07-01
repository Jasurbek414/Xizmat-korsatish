import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';

const MapPanel = ({ address, onAddressSelect }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const isUpdatingFromMap = useRef(false);

  useEffect(() => {
    if (!window.L || mapRef.current) return;

    // Initialize Leaflet Map
    const initialPos = [41.2995, 69.2401]; // Tashkent Coordinates
    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false // custom placement below
    }).setView(initialPos, 12);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Load OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add Draggable Marker
    const marker = window.L.marker(initialPos, { draggable: true }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    // Geocoding logic helper
    const handleLocationUpdate = async (lat, lng) => {
      try {
        isUpdatingFromMap.current = true;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz,ru,en`);
        const data = await res.json();
        if (data && data.display_name) {
          // Clean up Nominatim's verbose address for a cleaner CRM input
          let shortAddr = data.display_name;
          const parts = shortAddr.split(', ');
          if (parts.length > 3) {
            // Keep specific street, quarter, district, city (ignore zip codes, country)
            shortAddr = parts.slice(0, Math.min(parts.length - 2, 4)).join(', ');
          }
          onAddressSelect(shortAddr);
          setSearchQuery(shortAddr);
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      } finally {
        setTimeout(() => {
          isUpdatingFromMap.current = false;
        }, 800);
      }
    };

    // Click on Map to Move Marker & Get Address
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      handleLocationUpdate(lat, lng);
    });

    // Drag Marker to Get Address
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      handleLocationUpdate(lat, lng);
    });

    // Clean up map on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Bi-directional geocoding when the address from the form is updated
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !address || isUpdatingFromMap.current) return;

    const timer = setTimeout(async () => {
      try {
        // Skip geocoding if user is typing very short strings
        if (address.length < 5) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const newPos = [parseFloat(lat), parseFloat(lon)];
          mapRef.current.setView(newPos, 15);
          markerRef.current.setLatLng(newPos);
        }
      } catch (err) {
        console.error("Geocoding failed", err);
      }
    }, 1000); // Debounce geocoding requests to prevent API hitting limits

    return () => clearTimeout(timer);
  }, [address]);

  // Search Address on Map
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || !mapRef.current || !markerRef.current) return;

    setLoadingSearch(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos = [parseFloat(lat), parseFloat(lon)];
        mapRef.current.setView(newPos, 15);
        markerRef.current.setLatLng(newPos);
        onAddressSelect(display_name);
      } else {
        alert("Manzil topilmadi. Qaytadan kiriting.");
      }
    } catch (err) {
      console.error("Search geocoding error", err);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 w-full h-full flex flex-col gap-3.5 shadow-2xl transition-colors duration-300 relative select-none">
      
      {/* Top Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 shrink-0 relative z-40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Xaritadan qidirish..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none transition-all duration-300"
          />
        </div>
        <button
          type="submit"
          disabled={loadingSearch}
          className="px-4 py-2 bg-[var(--bg-keypad-btn-hover)] hover:bg-[var(--bg-keypad-btn-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] font-extrabold rounded-xl transition cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Navigation className={`w-3.5 h-3.5 text-indigo-500 ${loadingSearch ? 'animate-spin' : ''}`} />
          Qidirish
        </button>
      </form>

      {/* Map Container wrapper */}
      <div className="flex-1 rounded-xl overflow-hidden border border-[var(--border-color)] relative z-10 min-h-[180px]">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

    </div>
  );
};

export default MapPanel;
