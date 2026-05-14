import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, MessageCircle } from 'lucide-react';
import { sendMessage, subscribeToMessages } from '../services/chatService';
import { ChatMessage, UserProfile } from '../types';

interface ChatUIProps {
  tripId: string;
  user: UserProfile;
  onClose?: () => void;
}

export default function ChatUI({ tripId, user, onClose }: ChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(tripId, setMessages);
    return () => unsubscribe();
  }, [tripId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    await sendMessage(tripId, user.uid, text);
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#0A0A0A] z-[100] flex flex-col"
    >
      <div className="safe-area-top bg-[#0A0A0A] border-b border-white/5 pt-12 pb-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold">Trip Chat</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Real-time messaging</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400"
        >
          <X size={24} />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 px-12">
            <MessageCircle size={48} className="mb-4 text-blue-500" />
            <h4 className="font-bold text-white mb-2">No messages yet</h4>
            <p className="text-xs text-gray-400">Be the first to start the conversation about this trip.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                msg.senderId === user.uid 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20' 
                  : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
              {msg.createdAt && (
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1 mx-2">
                  {new Date(msg.createdAt.toDate?.() || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <form 
        onSubmit={handleSend}
        className="p-6 bg-gradient-to-t from-[#0A0A0A] to-transparent"
      >
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
