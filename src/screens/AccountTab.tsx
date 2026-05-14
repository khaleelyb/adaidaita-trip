import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Shield, 
  MessageSquare,
  Video,
  ArrowLeft,
  Plus,
  Clock,
} from 'lucide-react';
import { UserProfile, PaymentMethod, SupportTicket } from '../types';
import { logout, updateUserProfile } from '../services/auth';
import { getPaymentMethods, addPaymentMethod } from '../services/userService';
import { getMyTickets, createTicket } from '../services/ticketService';

interface AccountTabProps {
  user: UserProfile;
}

export default function AccountTab({ user }: AccountTabProps) {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (activeSubView === 'Payment') {
      getPaymentMethods(user.uid).then(setPayments);
    } else if (activeSubView === 'Help & Support') {
      getMyTickets(user.uid).then(setTickets);
    }
  }, [activeSubView, user.uid]);

  const handleUpdate = async (field: 'displayName' | 'photoURL') => {
    const val = prompt(`New ${field}:`, user[field]);
    if (val) {
      setIsUpdating(true);
      try {
        await updateUserProfile(user.uid, { [field]: val });
      } catch (error) {
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const menuItems = [
    { icon: CreditCard, label: 'Payment', color: '#4A90E2', desc: 'Manage your payment methods' },
    { icon: Video, label: 'Video Call Support', color: '#3B82F6', desc: 'Live assistance via video' },
    { icon: Shield, label: 'Safety', color: '#50E3C2', desc: 'Emergency contacts & tracking' },
    { icon: MessageSquare, label: 'Messages', color: '#D0021B', desc: 'Chat with support' },
    { icon: Settings, label: 'Settings', color: '#1f2937', desc: 'Account & app preferences' },
    { icon: HelpCircle, label: 'Help & Support', color: '#8E9299', desc: 'Support history & FAQ' },
  ];

  const handleAddPayment = async () => {
    await addPaymentMethod(user.uid, 'card', Math.floor(1000 + Math.random() * 9000).toString());
    getPaymentMethods(user.uid).then(setPayments);
  };

  const handleCreateTicket = async () => {
    const subject = prompt('Subject:');
    const message = prompt('Message:');
    if (subject && message) {
      await createTicket(user.uid, subject, message);
      getMyTickets(user.uid).then(setTickets);
    }
  };

  if (activeSubView) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 pt-12">
        <button 
          onClick={() => setActiveSubView(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span className="font-bold uppercase text-xs tracking-widest">Back to Profile</span>
        </button>

        <h2 className="text-3xl font-bold text-white mb-8">{activeSubView}</h2>

        <div className="space-y-4">
          {activeSubView === 'Payment' && (
            <>
              {payments.map(p => (
                <div key={p.id} className="glass-morphism p-5 rounded-3xl flex items-center justify-between border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <CreditCard size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white uppercase tracking-tight">{p.type} **** {p.lastFour}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Default Method</p>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={handleAddPayment}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all"
              >
                <Plus size={20} />
                Add New Card
              </button>
            </>
          )}

          {activeSubView === 'Help & Support' && (
            <>
              {tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map(t => (
                    <div key={t.id} className="glass-morphism p-5 rounded-3xl border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-white">{t.subject}</p>
                        <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded-full ${
                          t.status === 'open' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{t.message}</p>
                      <p className="text-[10px] text-gray-600 font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 glass-morphism rounded-3xl border-white/5">
                  <p className="text-gray-500 font-bold">No active support tickets</p>
                </div>
              )}
              <button 
                onClick={handleCreateTicket}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white p-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all"
              >
                <MessageSquare size={20} />
                Open New Ticket
              </button>
            </>
          )}

          {activeSubView === 'Settings' && (
            <div className="space-y-4">
              <div className="glass-morphism p-6 rounded-3xl border-white/5 space-y-6">
                <div onClick={() => handleUpdate('displayName')} className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <h4 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-1">Full Name</h4>
                    <p className="text-white font-bold">{user.displayName}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <div className="h-px bg-white/5" />
                <div onClick={() => handleUpdate('photoURL')} className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <h4 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-1">Avatar URL</h4>
                    <p className="text-white font-bold truncate max-w-[200px]">{user.photoURL}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              
              <div className="glass-morphism p-6 rounded-3xl border-white/5">
                <h4 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-4">Notifications</h4>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">Push Notifications</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubView === 'Safety' && (
            <div className="space-y-4">
              <div className="glass-morphism p-6 rounded-3xl border-red-500/20 bg-red-500/5">
                <h4 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                  <Shield size={18} />
                  Emergency Guard
                </h4>
                <p className="text-sm text-gray-400 mb-6">Instantly share your live location with emergency services and contacts.</p>
                <button className="w-full bg-red-600 text-white p-4 rounded-2xl font-bold active:scale-95 transition-all">
                  ACTIVATE SOS
                </button>
              </div>
            </div>
          )}

          {activeSubView === 'Video Call Support' && (
            <div className="text-center py-20 px-8 glass-morphism rounded-[3rem] border-white/5">
              <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Video size={40} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Assistance</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">Connect with our support team instantly over video for any verification or logistics issues.</p>
              <button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">
                Start Video Call
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-32">
      {/* Header Profile Section */}
      <div className="glass-morphism p-8 pt-20 rounded-b-[3.5rem] shadow-2xl space-y-8 border-t-0 border-x-0">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
              alt={user.displayName}
              className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 border-4 border-[#1A1A1A] rounded-full shadow-lg" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">{user.displayName}</h2>
            <div className="flex items-center gap-2">
              <span className="status-badge px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{user.role}</span>
              <p className="text-gray-500 text-xs font-mono">ID: 8820-USR</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', val: user.rating ? user.rating.toFixed(1) : 'New', icon: '⭐' },
            { label: user.role === 'driver' ? 'Earnings' : 'Status', val: user.role === 'driver' ? `₦${(user.earnings || 0).toLocaleString()}` : 'Member', icon: '🌐' },
            { label: 'Trips', val: user.tripCount || '0', icon: '🏆' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 p-4 rounded-[1.5rem] text-center border border-white/5 hover:bg-white/10 transition-colors">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.1em]">{stat.label}</p>
              <p className="font-bold text-white mt-1">{stat.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="p-6 space-y-3">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveSubView(item.label)}
            className="glass-morphism flex items-center justify-between p-4 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group border-white/5"
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: item.color }}
              >
                <item.icon size={20} />
              </div>
              <span className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
          </motion.div>
        ))}

        <button 
          onClick={() => logout()}
          className="w-full mt-8 glass-morphism border-red-500/10 flex items-center justify-center gap-3 p-5 rounded-2xl text-red-400 font-bold hover:bg-red-500/5 transition-all active:scale-[0.98]"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-600 mt-6 uppercase tracking-[0.3em] font-bold">
        adaidata • Premium Logistics
      </p>
    </div>
  );
}
