import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../types';
import { Target } from 'lucide-react';

// Fix for default marker icons in Leaflet
const markerIcon2x = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const markerIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowIcon = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: shadowIcon,
});

const KANO_CENTER: [number, number] = [12.0022, 8.5920];

interface MapScreenProps {
  origin?: Location;
  destination?: Location;
  currentLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapResizer({ center, bounds }: { center: [number, number], bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, map.getZoom());
    }
    map.invalidateSize();
  }, [center, bounds, map]);
  return null;
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function RecenterControl({ bounds }: { bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  if (!bounds) return null;

  return (
    <div className="absolute bottom-48 right-6 z-[1000] pointer-events-auto">
      <button
        onClick={(e) => {
          e.stopPropagation();
          map.fitBounds(bounds, { padding: [50, 50] });
        }}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20 transition-all active:scale-90 border border-white/10"
        title="Recenter Map"
      >
        <Target size={24} />
      </button>
    </div>
  );
}

export default function MapScreen({ origin, destination, currentLocation, onMapClick }: MapScreenProps) {
  const [center, setCenter] = useState<[number, number]>(KANO_CENTER);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | undefined>(undefined);

  useEffect(() => {
    if (origin && destination) {
      const b = L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ]);
      setBounds(b);
    } else {
      setBounds(undefined);
      if (currentLocation) {
        setCenter([currentLocation.lat, currentLocation.lng]);
      } else if (origin) {
        setCenter([origin.lat, origin.lng]);
      }
    }
  }, [origin, destination, currentLocation]);

  return (
    <div className="w-full h-full relative" id="map-root">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%', borderRadius: '0' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapResizer center={center} bounds={bounds} />
        <MapClickHandler onClick={onMapClick} />
        <RecenterControl bounds={bounds} />

        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>Pickup: {origin.address}</Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Dropoff: {destination.address}</Popup>
          </Marker>
        )}

        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="relative flex items-center justify-center">
                      <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
                      <div class="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                    </div>`,
              iconSize: [30, 42],
              iconAnchor: [15, 42]
            })}
          >
            <Popup>Current Location</Popup>
          </Marker>
        )}

        {origin && destination && (
          <Polyline 
            positions={[
              [origin.lat, origin.lng],
              [destination.lat, destination.lng]
            ]} 
            color="#3B82F6"
            weight={4}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
      
      <style>{`
        .leaflet-container {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
          background: #0A0A0A !important;
        }
        .leaflet-tile-pane {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
