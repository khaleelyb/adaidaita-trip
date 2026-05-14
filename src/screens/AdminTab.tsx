import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, TrendingUp, Users, Car, LifeBuoy, MoreHorizontal } from 'lucide-react';
import { getAllTickets, updateTicketStatus } from '../services/ticketService';
import { getAllUsers } from '../services/userService';
import { getAllTrips } from '../services/tripService';
import { SupportTicket, UserProfile, Trip } from '../types';

export default function AdminTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, u, tr] = await Promise.all([
          getAllTickets(),
          getAllUsers(),
          getAllTrips(),
        ]);
        setTickets(t);
        setUsers(u);
        setTrips(tr);
      } catch (err) {
        console.error('Admin fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalRevenue = trips
    .filter(t => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.price, 0);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Trips', value: trips.length, icon: Car, color: 'bg-green-500' },
    { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: LifeBuoy, color: 'bg-orange-500' },
    { label: 'Revenue', value: `₦${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 pb-32 pt-20 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="text-purple-500" size={28} />
            HQ Control
          </h1>
          <p className="text-gray-400 text-sm font-medium">Network performance & management</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-morphism p-5 rounded-3xl border border-white/5 space-y-3"
          >
            <div className={`${stat.color}/10 w-10 h-10 rounded-xl flex items-center justify-center`}>
              <stat.icon size={20} className={`text-${stat.color.split('-')[1]}-500`} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Support Tickets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pr-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Active Support Tickets</h3>
          <button className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">View All</button>
        </div>
        
        <div className="space-y-3">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div key={ticket.id} className="glass-morphism p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{ticket.subject}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]">{ticket.message}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                    ticket.status === 'open' ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {ticket.status}
                  </span>
                  <MoreHorizontal size={18} className="text-gray-600" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 text-xs py-8">No active tickets.</p>
          )}
        </div>
      </div>

      {/* User Management Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Live Driver Fleet</h3>
        <div className="space-y-2">
          {users.filter(u => u.role === 'driver').slice(0, 5).map(u => (
            <div key={u.uid} className="flex items-center justify-between p-3 glass-morphism rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <img src={u.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-bold text-white">{u.displayName}</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest font-mono">DRV-{u.uid.slice(0,4)}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
