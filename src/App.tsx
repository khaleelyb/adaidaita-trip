import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Grid, User as UserIcon, Phone, Video, X, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, getUserProfile } from './services/auth';
import { webrtcService } from './services/webrtcService';
import { notificationService } from './services/notificationService';
import AuthScreen from './components/AuthScreen';
import HomeTab from './screens/HomeTab';
import ServicesTab from './screens/ServicesTab';
import AccountTab from './screens/AccountTab';
import ActivityTab from './screens/ActivityTab';
import AdminTab from './screens/AdminTab';
import ActiveTripOverlay from './components/ActiveTripOverlay';
import { UserProfile, Trip } from './types';
import { COLORS } from './constants';
import { db, handleFirestoreError, OperationType } from './services/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, doc } from 'firebase/firestore';
import { APIProvider } from '@vis.gl/react-google-maps';
import { acceptTrip } from './services/tripService';

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

type Tab = 'home' | 'services' | 'activity' | 'account' | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [callingTripId, setCallingTripId] = useState<string | null>(null);
  
  // Call State
  const [isCalling, setIsCalling] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      if (!u) {
        notificationService.stop();
        setActiveTrip(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      notificationService.stop();
      return;
    }

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const newProfile = docSnap.data() as UserProfile;
        setProfile(newProfile);
        notificationService.init(user.uid);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return unsubProfile;
  }, [user]);

  useEffect(() => {
    const handleNotification = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 5000);
    };

    window.addEventListener('app-notification', handleNotification);

    const handleInitiateCall = async (e: any) => {
      const { receiverId, tripId } = e.detail;
      if (!profile) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsCalling(true);
        setCallingTripId(tripId || null);
        webrtcService.startCall(profile.uid, receiverId, stream, (rs) => {
          setRemoteStream(rs);
        });
      } catch (err) {
        console.error("Call initiation error:", err);
      }
    };

    window.addEventListener('initiate-video-call', handleInitiateCall);

    // FIX: Replace compound or() + orderBy query (requires composite index) with
    // two simple queries merged client-side. This avoids index errors entirely.
    let tripUnsubscribeRider: (() => void) | null = null;
    let tripUnsubscribeDriver: (() => void) | null = null;

    if (user) {
      let riderTrip: Trip | null = null;
      let driverTrip: Trip | null = null;

      const mergeAndSetTrip = () => {
        // Prefer driver trip if both somehow exist (shouldn't happen normally)
        const best = riderTrip || driverTrip || null;
        setActiveTrip(best);
      };

      // Query 1: trips where user is rider
      const qRider = query(
        collection(db, 'trips'),
        where('riderId', '==', user.uid),
        where('status', 'in', ['requested', 'accepted', 'ongoing']),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      tripUnsubscribeRider = onSnapshot(qRider, (snapshot) => {
        riderTrip = !snapshot.empty
          ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Trip)
          : null;
        mergeAndSetTrip();
      }, (error) => {
        console.warn('Active trip (rider) subscription error:', error.message);
      });

      // Query 2: trips where user is driver
      const qDriver = query(
        collection(db, 'trips'),
        where('driverId', '==', user.uid),
        where('status', 'in', ['accepted', 'ongoing']),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      tripUnsubscribeDriver = onSnapshot(qDriver, (snapshot) => {
        driverTrip = !snapshot.empty
          ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Trip)
          : null;
        mergeAndSetTrip();
      }, (error) => {
        console.warn('Active trip (driver) subscription error:', error.message);
      });
    }

    // Listen for incoming calls
    let callUnsubscribe: (() => void) | null = null;
    if (user) {
      const qCall = query(
        collection(db, 'calls'),
        where('receiverId', '==', user.uid),
        where('status', '==', 'negotiating'),
        limit(1)
      );
      callUnsubscribe = onSnapshot(qCall, async (snapshot) => {
        if (!snapshot.empty) {
          const callData = snapshot.docs[0];
          if (confirm(`Incoming video call from ${callData.data().callerId.slice(0, 5)}. Accept?`)) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            setIsCalling(true);
            webrtcService.receiveCall(callData.id, stream, (rs) => {
              setRemoteStream(rs);
            });
          }
        }
      });
    }

    return () => {
      window.removeEventListener('app-notification', handleNotification);
      window.removeEventListener('initiate-video-call', handleInitiateCall);
      if (tripUnsubscribeRider) tripUnsubscribeRider();
      if (tripUnsubscribeDriver) tripUnsubscribeDriver();
      if (callUnsubscribe) callUnsubscribe();
    };
  }, [user, profile]);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsCalling(true);
    } catch (e) {
      console.error("Camera access denied", e);
    }
  };

  const endCall = () => {
    setIsCalling(false);
    setCallingTripId(null);
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    webrtcService.endCall();
  };

  useEffect(() => {
    if (!profile || profile.role !== 'driver' || !activeTrip || activeTrip.status !== 'ongoing') return;

    const interval = setInterval(() => {
      const loc = {
        lat: activeTrip.origin.lat + (Math.random() - 0.5) * 0.01,
        lng: activeTrip.origin.lng + (Math.random() - 0.5) * 0.01,
        address: 'Moving...'
      };
      import('./services/tripService').then(m => m.updateTripLocation(activeTrip.id, loc));
    }, 10000);

    return () => clearInterval(interval);
  }, [profile, activeTrip]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0A0A0A] p-6 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-white font-bold mb-2">Syncing Profile...</h2>
        <p className="text-gray-500 text-xs">If this takes too long, please try refreshing.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Refresh Now
        </button>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={() => setLoading(true)} />;
  }

  const content = (
    <div className="h-screen flex flex-col bg-[#0A0A0A] overflow-hidden text-[#E5E7EB]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 overflow-auto"
          >
            {activeTab === 'home' && <HomeTab user={profile!} activeTrip={activeTrip} />}
            {activeTab === 'services' && <ServicesTab />}
            {activeTab === 'activity' && <ActivityTab user={profile!} />}
            {activeTab === 'account' && <AccountTab user={profile!} />}
            {activeTab === 'admin' && <AdminTab />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {activeTrip && profile && <ActiveTripOverlay trip={activeTrip} user={profile} />}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-8 left-6 right-6 z-[60] glass-morphism p-4 rounded-2xl flex items-center gap-4 border-blue-500/30 shadow-2xl"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
                <Phone size={20} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{toast.title}</h4>
                <p className="text-xs text-gray-400 truncate">{toast.body}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCalling && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0A0A0A]/95 flex flex-col p-6 space-y-6"
            >
              <div className="flex-1 rounded-[2.5rem] overflow-hidden bg-gray-900 relative border border-white/10 shadow-2xl">
                 <div className="absolute top-4 left-4 z-20 glass-morphism px-3 py-1.5 rounded-lg flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                   <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">WebRTC Live Feed</span>
                 </div>

                 {remoteStream ? (
                   <video 
                     autoPlay 
                     playsInline 
                     ref={v => v && (v.srcObject = remoteStream)}
                     className="w-full h-full object-cover grayscale-[0.2] brightness-90"
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <p className="text-white/20 font-mono text-[10px] tracking-[0.4em] animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
                   </div>
                 )}
                 
                 <div className="absolute top-4 right-4 w-32 aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20">
                   <video 
                     autoPlay 
                     muted 
                     playsInline 
                     ref={v => v && (v.srcObject = localStream)}
                     className="w-full h-full object-cover"
                   />
                 </div>

                 <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                   <div className="glass-morphism px-4 py-2 flex items-center gap-3">
                     <div className="w-2 h-2 bg-blue-500 rounded-full" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End-to-End Encrypted</span>
                   </div>
                 </div>
              </div>

              <div className="flex items-center justify-center gap-8 pb-4">
                 {profile?.role === 'driver' && callingTripId && (
                   <button 
                     onClick={async () => {
                       await acceptTrip(callingTripId, profile.uid);
                       setCallingTripId(null);
                       endCall();
                     }}
                     className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all border-4 border-white/10 gap-2"
                   >
                     <CheckCircle2 size={24} />
                     Accept Ride
                   </button>
                 )}
                 <button 
                   onClick={endCall}
                   className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/20 active:scale-90 transition-all border-4 border-white/10"
                 >
                   <X size={32} />
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Navigation */}
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 z-30 pointer-events-none">
          <div className="max-w-md mx-auto glass-morphism rounded-[2.5rem] shadow-2xl p-2.5 flex items-center justify-around pointer-events-auto">
            {[
              { id: 'home', icon: Map, label: 'Explore' },
              { id: 'services', icon: Grid, label: 'Services' },
              { id: 'activity', icon: Clock, label: 'Activity' },
              { id: 'account', icon: UserIcon, label: 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex flex-col items-center p-3.5 rounded-2xl transition-all relative group ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'scale-110 transition-transform' : ''} />
                <span className={`text-[8px] font-bold uppercase tracking-[0.1em] mt-1.5 ${activeTab === tab.id ? 'block' : 'hidden'}`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="tab-indicator"
                    className="absolute -top-1 w-1 h-1 bg-white rounded-full"
                  />
                )}
              </button>
            ))}
            
            <div className="w-px h-10 bg-white/5 mx-2" />
            
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`p-3.5 rounded-2xl transition-all ${
                  activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Shield size={20} />
              </button>
            )}

            <button 
              onClick={startVideoCall}
              className="p-4 bg-white/5 hover:bg-white/10 text-blue-400 rounded-2xl shadow-lg transition-all active:scale-90 border border-white/5"
            >
              <Video size={20} />
            </button>
          </div>
        </div>
      </div>
  );

  return hasValidKey ? (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      {content}
    </APIProvider>
  ) : content;
}
