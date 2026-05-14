import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Truck, User } from 'lucide-react';
import { signInWithGoogle } from '../services/auth';
import { UserRole } from '../types';
import { COLORS } from '../constants';

interface AuthScreenProps {
  onLogin: () => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [role, setRole] = useState<UserRole>('rider');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(role);
      onLogin();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0A0A]" style={{ backgroundColor: COLORS.bg }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-morphism p-8 rounded-[2rem] shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-3xl mx-auto shadow-lg shadow-blue-500/20 mb-4">A</div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">adaidata</h1>
          <p className="text-gray-400 text-sm">Premium Logistics Network</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRole('rider')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all gap-3 ${
              role === 'rider' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:bg-white/5'
            }`}
          >
            <User className={role === 'rider' ? 'text-blue-400' : 'text-gray-500'} size={32} />
            <span className={`font-semibold text-sm ${role === 'rider' ? 'text-blue-400' : 'text-gray-400'}`}>Rider</span>
          </button>
          
          <button
            onClick={() => setRole('driver')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all gap-3 ${
              role === 'driver' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:bg-white/5'
            }`}
          >
            <Truck className={role === 'driver' ? 'text-blue-400' : 'text-gray-500'} size={32} />
            <span className={`font-semibold text-sm ${role === 'driver' ? 'text-blue-400' : 'text-gray-400'}`}>Driver</span>
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-600/20"
          style={{ backgroundColor: COLORS.primary }}
        >
          <LogIn size={20} />
          {loading ? 'Authenticating...' : 'Sign in with Google'}
        </button>

        <p className="text-center text-[10px] text-gray-500 px-4 uppercase tracking-widest font-semibold">
          Secure P2P Connection established
        </p>
      </motion.div>
    </div>
  );
}
