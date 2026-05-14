import React from 'react';
import { motion } from 'motion/react';
import { Truck, Package, ShoppingBag, Gift, MoreHorizontal, ArrowRight } from 'lucide-react';
import { COLORS } from '../constants';

const services = [
  { id: 'ride', name: 'Ride', icon: Truck, color: '#F27D26', desc: 'Go anywhere' },
  { id: 'delivery', name: 'Delivery', icon: Package, color: '#4A90E2', desc: 'Send items' },
  { id: 'food', name: 'Food', icon: ShoppingBag, color: '#50E3C2', desc: 'Eat hearty' },
  { id: 'gift', name: 'Gifts', icon: Gift, color: '#D0021B', desc: 'Surprise them' },
];

export default function ServicesTab() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 pb-32 pt-20 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Services</h1>
        <p className="text-gray-400 text-sm font-medium">What can we help you with today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {services.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-morphism p-6 rounded-3xl space-y-4 cursor-pointer hover:bg-white/5 transition-all border border-white/5 shadow-xl"
          >
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: service.id === 'ride' ? '#3B82F6' : service.color }}
            >
              <service.icon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">{service.name}</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{service.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-morphism rounded-3xl p-6 text-white overflow-hidden relative group cursor-pointer border-blue-500/20 bg-blue-600/5">
        <div className="relative z-10 space-y-4">
          <div className="bg-white/10 w-fit p-2.5 rounded-xl border border-white/10">
            <MoreHorizontal size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">adaidata Business</h2>
            <p className="text-xs text-gray-400">Premium corporate logistics network</p>
          </div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            Configure Fleet <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        
        {/* Abstract background element */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Member Exclusive</h3>
        <div className="glass-morphism rounded-3xl p-5 flex items-center gap-5 border border-blue-500/10 hover:border-blue-500/30 transition-colors cursor-pointer group">
          <div className="bg-blue-500/10 p-4 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
            <Gift className="text-blue-500" size={24} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-white">50% Off First Delivery</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Limited time partner offer</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20">Claim</button>
        </div>
      </div>
    </div>
  );
}
