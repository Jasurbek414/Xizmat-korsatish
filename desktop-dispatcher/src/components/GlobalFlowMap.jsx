import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Custom SVG map pin generators matching the mockup
const createCustomMarker = (text, color = '#5850ec') => {
  return L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
        <div style="background-color: #111522; border: 1px solid ${color}; color: #f1f5f9; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-bottom: 2px; font-family: sans-serif;">
          ${text}
        </div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 8px ${color};"></div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [80, 45],
    iconAnchor: [40, 45]
  });
};

const GlobalFlowMap = () => {
  // Center of Tashkent
  const position = [41.311081, 69.240562];
  
  // Active deliveries coordinates
  const markers = [
    { id: 1, pos: [41.3195, 69.248], label: 'order 104', color: '#5850ec' },
    { id: 2, pos: [41.3060, 69.229], label: 'order 104', color: '#5850ec' },
    { id: 3, pos: [41.2985, 69.245], label: 'Yo\'lda1', color: '#f59e0b' }
  ];

  // Route paths from central dispatch station [41.311081, 69.240562]
  const routes = [
    [position, [41.3195, 69.248]],
    [position, [41.3060, 69.229]],
    [position, [41.2985, 69.245]]
  ];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/[0.04] relative" style={{ minHeight: '160px' }}>
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0a0d16' }}
        zoomControl={false}
      >
        {/* Dark Matter Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Render markers */}
        {markers.map(m => (
          <Marker 
            key={m.id} 
            position={m.pos} 
            icon={createCustomMarker(m.label, m.color)} 
          />
        ))}

        {/* Render route lines */}
        {routes.map((path, idx) => (
          <Polyline 
            key={idx}
            positions={path} 
            color="#5850ec" 
            weight={1.5}
            dashArray="5, 5"
            opacity={0.6}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default GlobalFlowMap;
