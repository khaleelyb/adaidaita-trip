import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Car, Shield, Trash2, MessageCircle, User } from 'lucide-react';
import { Trip, UserProfile } from '../types';
import { completeTrip, cancelTrip, startTrip } from '../services/tripService';
import { getUserProfile } from '../services/auth';
import ChatUI from './ChatUI';

interface ActiveTripOverlayProps {
  trip: Trip;
  user: UserProfile;
}

export default function ActiveTripOverlay({ trip, user }: ActiveTripOverlayProps) {
  const [showChat, setShowChat] = useState(false);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isDriver = user.role === 'driver';
  const isRider = user.role === 'rider';

  useEffect(() => {
    const otherId = isRider ? trip.driverId : trip.riderId;
    if (otherId) {
      getUserProfile(otherId).then(setOtherUser).catch(console.error);
    }
  }, [trip.riderId, trip.driverId, isRider, trip.status]);

  const handleStart = async () => {
    if (confirm('Start this trip?')) {
      setIsProcessing(true);
      try {
        await startTrip(trip.id);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleComplete = async () => {
    if (confirm('Complete this trip?')) {
      setIsProcessing(true);
      try {
        await completeTrip(trip.id, user.uid, trip.price);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCancel = async () => {
    if (confirm('Cancel this ride?')) {
      setIsProcessing(true);
      try {
        await cancelTrip(trip.id);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const statusLabel = {
    requested: 'Searching...',
    accepted: isDriver ? 'Drive to Pickup' : 'Driver on the way',
    ongoing: 'On your way',
    completed: 'Arrived at Destination',
    cancelled: 'Cancelled'
  }[trip.status] || trip.status;

  const statusColor = {
    requested: 'text-blue-400',
    accepted: 'text-green-400',
    ongoing: 'text-orange-400',
    completed: 'text-green-500',
    cancelled: 'text-red-400'
  }[trip.status] || 'text-white';

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-x-0 bottom-24 z-40 px-6 pointer-events-none"
      >
        <div className="max-w-md mx-auto glass-morphism p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 pointer-events-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                {otherUser?.photoURL ? (
                  <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <Car size={24} />
                )}
              </div>
              <div>
                <h3 className="text-white font-bold capitalize">
                  {otherUser ? otherUser.displayName : statusLabel}
                </h3>
                <p className={`text-[10px] uppercase tracking-widest font-black ${statusColor}`}>
                  {statusLabel}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white">₦{trip.price.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Fixed Fare</p>
            </div>
            <div className="flex gap-2 ml-4">
              {((isRider && trip.status === 'requested') || (isDriver && trip.status === 'accepted')) && (
                <button 
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-500 disabled:opacity-50"
                  title="Cancel Ride"
                >
                  <Trash2 size={20} />
                </button>
              )}
              {trip.status !== 'requested' && (
                <button 
                  onClick={() => setShowChat(true)}
                  className="relative p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                >
                  <MessageCircle size={20} className="text-blue-400" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4">
              <MapPin size={16} className={`${trip.status === 'accepted' && isDriver ? 'text-green-500 animate-pulse' : 'text-blue-500'} mt-1`} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Pickup</p>
                <p className="text-sm text-gray-300 font-medium line-clamp-1">{trip.origin.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Navigation size={16} className={`${trip.status === 'ongoing' ? 'text-green-500 animate-pulse' : 'text-red-500'} mt-1`} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Dropoff</p>
                <p className="text-sm text-gray-300 font-medium line-clamp-1">{trip.destination.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDriver && (
              <>
                {trip.status === 'accepted' && (
                  <button 
                    onClick={handleStart}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Start Trip'}
                  </button>
                )}
                {trip.status === 'ongoing' && (
                  <button 
                    onClick={handleComplete}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Complete Trip'}
                  </button>
                )}
              </>
            )}
            {isRider && trip.status === 'requested' && (
              <div className="flex-1 text-center py-4 text-sm text-gray-400 font-medium animate-pulse">
                Finding a driver nearby...
              </div>
            )}
            <button className="px-6 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all border border-white/5 flex items-center justify-center gap-2">
              <Shield size={18} className="text-blue-400" />
              <span className="hidden sm:inline">Safety</span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showChat && (
          <ChatUI 
            tripId={trip.id} 
            user={user} 
            onClose={() => setShowChat(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
