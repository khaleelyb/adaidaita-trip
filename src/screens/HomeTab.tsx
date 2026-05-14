import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Navigation, Clock, User, Heart, Star, ArrowRight, Loader2 } from 'lucide-react';
import MapScreen from '../components/MapScreen';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { requestTrip, subscribeToAvailableTrips, acceptTrip } from '../services/tripService';
import { updateUserProfile } from '../services/auth';
import { UserProfile, Location, Trip } from '../types';
import { COLORS } from '../constants';

interface HomeTabProps {
  user: UserProfile;
  activeTrip: Trip | null;
}

export default function HomeTab({ user, activeTrip }: HomeTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const placesLib = useMapsLibrary('places');
  const map = useMap();

  // Handle address search suggestions
  useEffect(() => {
    if ((!placesLib && searchQuery.length < 3) || !searchQuery) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (placesLib) {
          const { places } = await (placesLib as any).Place.searchByText({
            textQuery: searchQuery,
            fields: ['displayName', 'location', 'formattedAddress'],
            locationBias: pickup || { lat: 12.0022, lng: 8.5920 },
            maxResultCount: 5,
          });
          setSuggestions(places);
        } else {
          // Fallback to Nominatim (Free)
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`);
          const data = await response.json();
          const nominatimSuggestions = data.map((item: any) => ({
            id: item.place_id,
            displayName: item.display_name.split(',')[0],
            formattedAddress: item.display_name,
            location: {
              lat: () => parseFloat(item.lat),
              lng: () => parseFloat(item.lon)
            }
          }));
          setSuggestions(nominatimSuggestions);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, placesLib, pickup]);

  const handleSelectSuggestion = (suggestion: any) => {
    if (suggestion.location) {
      const lat = typeof suggestion.location.lat === 'function' ? suggestion.location.lat() : suggestion.location.lat();
      const lng = typeof suggestion.location.lng === 'function' ? suggestion.location.lng() : suggestion.location.lng();
      const loc: Location = {
        lat,
        lng,
        address: suggestion.displayName || suggestion.formattedAddress || 'Selected Location'
      };
      setDestination(loc);
      setSearchQuery(loc.address);
      setSuggestions([]);
    }
  };

  // Default to Kano, Nigeria coordinates
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: "My Current Location" }),
      () => setPickup({ lat: 12.0022, lng: 8.5920, address: "Kano Central" })
    );
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    if (selectionMode === 'pickup') {
      setPickup({ lat, lng, address: `Point [${lat.toFixed(4)}, ${lng.toFixed(4)}]` });
      setSelectionMode(null);
    } else if (selectionMode === 'destination') {
      setDestination({ lat, lng, address: `Point [${lat.toFixed(4)}, ${lng.toFixed(4)}]` });
      setSelectionMode(null);
    }
  };

  const calculatePrice = (p1: Location, p2: Location) => {
    const dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
    return Math.max(800, Math.floor(dist * 60000)); // Base 800 Naira
  };

  const handleRequestRide = async () => {
    if (!pickup) {
      setSelectionMode('pickup');
      return;
    }
    if (!destination) {
      setSelectionMode('destination');
      return;
    }

    setIsRequesting(true);
    try {
      const price = calculatePrice(pickup, destination);
      await requestTrip(user.uid, pickup, destination, price);
      setPickup(null);
      setDestination(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
    }
  };

  const isRider = user.role === 'rider';
  const isDriver = user.role === 'driver';
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (isDriver && user.status === 'online') {
      const unsub = subscribeToAvailableTrips((trips) => {
        setAvailableTrips(trips);
      });
      return () => unsub();
    } else {
      setAvailableTrips([]);
    }
  }, [isDriver, user.status]);

  const handleAcceptRide = async (tripId: string) => {
    await acceptTrip(tripId, user.uid);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = user.status === 'online' ? 'offline' : 'online';
    await updateUserProfile(user.uid, { status: newStatus });
  };

  const estimatedPrice = pickup && destination ? calculatePrice(pickup, destination) : 0;

  // Clear local state when trip finishes
  useEffect(() => {
    if (!activeTrip) {
      // Small delay to let animations finish before clearing
      const timer = setTimeout(() => {
        setPickup(null);
        setDestination(null);
        setSearchQuery('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTrip]);

  if (isDriver) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0A]">
        <div className="p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-[#0A0A0A]/80 to-transparent z-10">
          <div className="glass-morphism px-5 py-3 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 text-white">D</div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight text-white">Driver Portal</h1>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Nigeria Operations</p>
            </div>
          </div>
          <button 
            onClick={toggleOnlineStatus}
            className={`glass-morphism px-4 py-2 flex items-center gap-2 transition-all active:scale-95 ${user.status === 'online' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
          >
            <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{user.status === 'online' ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4 pb-32">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Available Requests
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px]">{availableTrips.length}</span>
          </h2>
          
          <AnimatePresence>
            {availableTrips.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center opacity-30"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Navigation size={32} />
                </div>
                <p className="text-sm font-medium">Scanning for nearby requests...</p>
              </motion.div>
            ) : (
              availableTrips.map((trip) => (
                <motion.div 
                  key={trip.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-morphism p-5 rounded-3xl border-white/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Ride Request</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">ID: {trip.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">₦{trip.price.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Estimated Earnings</p>
                    </div>
                  </div>

                  <div className="space-y-3 py-2">
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      <p className="text-xs text-gray-300 font-medium line-clamp-1">{trip.origin.address}</p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0" />
                      <p className="text-xs text-gray-300 font-medium line-clamp-1">{trip.destination.address}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAcceptRide(trip.id)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Accept Ride Request
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const mapOrigin = activeTrip ? activeTrip.origin : pickup || undefined;
  const mapDestination = activeTrip ? activeTrip.destination : destination || undefined;

  return (
    <div className="h-full flex flex-col relative bg-[#0A0A0A]">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapScreen 
          origin={mapOrigin} 
          destination={mapDestination} 
          onMapClick={handleMapClick}
        />
      </div>

      {selectionMode && (
        <div className="absolute inset-x-0 top-32 z-20 flex flex-col items-center pointer-events-none">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold animate-pulse pointer-events-auto border-2 border-white/20 flex items-center gap-3"
          >
            <MapPin size={18} />
            Select {selectionMode} on map
          </motion.div>
          <button 
            onClick={() => setSelectionMode(null)}
            className="mt-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold pointer-events-auto border border-white/10 hover:bg-black/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="relative z-10 p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-[#0A0A0A]/80 to-transparent">
        <div className="glass-morphism px-5 py-3 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 text-white">A</div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-white">adaidata</h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Premium Logistics</p>
          </div>
        </div>
        <div className="glass-morphism px-4 py-2 flex items-center gap-3">
          <span className={`status-badge px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeTrip ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {activeTrip ? activeTrip.status : 'Idle'}
          </span>
          <span className="text-sm font-mono text-blue-400">
            {activeTrip ? `ID: ${activeTrip.id.slice(-6).toUpperCase()}` : 'No Active Trip'}
          </span>
        </div>
      </div>

      {!activeTrip && (
        <>
          {/* Search Input Area */}
          <div className="relative z-20 px-6 mt-4">
            <div className="glass-morphism p-3 flex items-center gap-3 shadow-2xl relative">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                {isSearching ? <Loader2 size={20} className="text-blue-500 animate-spin" /> : <Search size={20} className="text-blue-500" />}
              </div>
              <input 
                type="text" 
                placeholder="Where to?" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-gray-500"
              />
              <div className="w-px h-6 bg-white/10" />
              <Clock size={18} className="text-gray-500 mx-2" />
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-6 right-6 mt-2 glass-morphism border-white/10 shadow-2xl rounded-2xl overflow-hidden z-30"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id || index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full p-4 flex items-start gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left group"
                    >
                      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{suggestion.displayName || suggestion.formattedAddress}</p>
                        <p className="text-[10px] text-gray-500 truncate">{suggestion.formattedAddress}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Actions / Bottom Sheet */}
          <div className={`mt-auto relative z-10 px-6 pb-28 transition-all duration-500 ${selectionMode ? 'translate-y-[80%] opacity-50 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-morphism p-8 space-y-6 shadow-2xl rounded-[2.5rem]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold tracking-tight text-white">Route Selection</h3>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-widest bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20">Live Map</span>
              </div>

              <div className="space-y-4">
                <div 
                  onClick={() => setSelectionMode('pickup')}
                  className={`flex items-center gap-5 p-4 rounded-2xl transition-all border cursor-pointer ${pickup ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className={`p-3 rounded-xl ${pickup ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-500'}`}>
                    <Navigation size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Pickup Location</p>
                    <p className="font-bold text-sm text-white truncate max-w-[180px]">
                      {pickup ? pickup.address : 'Select pickup point'}
                    </p>
                  </div>
                  {pickup && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                </div>

                <div 
                  onClick={() => setSelectionMode('destination')}
                  className={`flex items-center gap-5 p-4 rounded-2xl transition-all border cursor-pointer ${destination ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className={`p-3 rounded-xl ${destination ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-500'}`}>
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Destination</p>
                    <p className="font-bold text-sm text-white truncate max-w-[180px]">
                      {destination ? destination.address : 'Select dropoff point'}
                    </p>
                  </div>
                  {destination && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </div>
              </div>

              <button 
                onClick={handleRequestRide}
                disabled={isRequesting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 mt-2 group"
              >
                {isRequesting ? 'Processing Request...' : (
                  <>
                    {(!pickup || !destination) ? 'Configure Route' : `Confirm Ride (₦${estimatedPrice.toLocaleString()})`} 
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
