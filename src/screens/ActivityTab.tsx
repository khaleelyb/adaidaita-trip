import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, ChevronRight, Package, Car, Video, CheckCircle2, Trash2 } from 'lucide-react';
import { getTrips, subscribeToAvailableTrips, acceptTrip, deleteTrip } from '../services/tripService';
import { Trip, UserProfile } from '../types';

interface ActivityTabProps {
  user: UserProfile;
}

export default function ActivityTab({ user }: ActivityTabProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const isDriver = user.role === 'driver';

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const history = await getTrips(user.uid, user.role);
        setTrips(history);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();

    let unsubscribeAvailable: (() => void) | null = null;
    if (isDriver) {
      unsubscribeAvailable = subscribeToAvailableTrips(setAvailableTrips);
    }

    return () => {
      if (unsubscribeAvailable) unsubscribeAvailable();
    };
  }, [user.uid, user.role, isDriver]);

  const handleAccept = async (tripId: string) => {
    try {
      await acceptTrip(tripId, user.uid);
      // Trip overlay will pick it up via App.tsx subscription
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const handleVideoVerify = (riderId: string, tripId: string) => {
    // We'll trigger a custom event that App.tsx can listen to
    window.dispatchEvent(new CustomEvent('initiate-video-call', { 
      detail: { receiverId: riderId, tripId } 
    }));
  };

  const handleDelete = async (tripId: string) => {
    if (confirm('Are you sure you want to delete this trip record?')) {
      try {
        await deleteTrip(tripId);
        setTrips(prev => prev.filter(t => t.id !== tripId));
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 pb-32 pt-20 space-y-8">
      {isDriver && availableTrips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Available Requests
            </h2>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{availableTrips.length} nearby</span>
          </div>
          
          <div className="space-y-4">
            {availableTrips.map((trip) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-morphism p-6 rounded-[2rem] border-blue-500/20 bg-blue-600/5 space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                      <Car size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Premium Ride</p>
                      <h4 className="font-bold text-white text-lg">₦{trip.price.toLocaleString()}</h4>
                    </div>
                  </div>
                  <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <p className="text-[10px] text-blue-400 font-bold">EST. 12 MIN</p>
                  </div>
                </div>

                <div className="space-y-3 relative pl-4 border-l border-white/10 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-[#0A0A0A]" />
                    <p className="text-xs text-gray-300 font-medium truncate">{trip.origin.address}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-[#0A0A0A]" />
                    <p className="text-xs text-gray-300 font-medium truncate">{trip.destination.address}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => handleVideoVerify(trip.riderId, trip.id)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/5 transition-all active:scale-95"
                  >
                    <Video size={18} className="text-blue-400" />
                    Video Verify
                  </button>
                  <button 
                    onClick={() => handleAccept(trip.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    <CheckCircle2 size={18} />
                    Accept Ride
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="h-px bg-white/5 my-8" />
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Activity</h1>
        <p className="text-gray-400 text-sm font-medium">Your recent trips and deliveries</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          trips.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-morphism p-5 rounded-3xl space-y-4 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-400">
                    {trip.type === 'ride' ? <Car size={20} /> : <Package size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white capitalize">{trip.type}</h4>
                    <p className="text-[10px] text-gray-500 font-mono">#{trip.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="font-bold text-white">₦{trip.price.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      trip.status === 'completed' ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {trip.status}
                    </p>
                  </div>
                  {['completed', 'cancelled'].includes(trip.status) && (
                    <button 
                      onClick={() => handleDelete(trip.id)}
                      className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 relative pl-4 border-l border-white/10 ml-2">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-[#0A0A0A]" />
                  <p className="text-xs text-gray-400 truncate">{trip.origin.address || 'Origin'}</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-[#0A0A0A]" />
                  <p className="text-xs text-gray-400 truncate">{trip.destination.address || 'Destination'}</p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 glass-morphism rounded-3xl p-8 border-dashed border-white/10">
            <Clock size={40} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm">No recent activity found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
