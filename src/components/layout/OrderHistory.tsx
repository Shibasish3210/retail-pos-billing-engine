import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Clock, ChevronRight, ShoppingBag, X } from 'lucide-react';
import { format } from 'date-fns';
import { Order } from '../../types';
import { storage } from '../../storage';

interface OrderHistoryProps {
  refreshTrigger: number;
}

export function OrderHistory({ refreshTrigger }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const allOrders = storage.getOrders();
    const todayOrders = allOrders
      .filter(o => o.date === today)
      .sort((a, b) => b.timestamp - a.timestamp);
    setOrders(todayOrders);
  }, [refreshTrigger]);

  const totalToday = useMemo(() => orders.reduce((acc, o) => acc + o.total, 0), [orders]);

  if (orders.length === 0) return null;

  return (
    <div className="space-y-6 mt-12 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-500">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-1">TODAY'S LOG</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{orders.length} REGISTERED BILLS</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Verified</p>
          <p className="text-2xl font-[1000] text-emerald-600 tracking-tighter leading-none">₹{totalToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-all group text-left border border-transparent hover:border-slate-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                <Clock size={18} />
              </div>
              <div>
                <p className="font-black text-[#0F172A] leading-none mb-1">{format(order.timestamp, 'hh:mm a')}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{order.items.length} items</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-lg text-[#0F172A]">₹{order.total}</span>
              <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Modal for Order Details */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-[#0F172A] p-8 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification Receipt</p>
                      <h4 className="text-2xl font-[1000] tracking-tighter">{format(selectedOrder.timestamp, 'hh:mm a')}</h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification ID</p>
                    <p className="font-mono text-xs opacity-50 uppercase">{selectedOrder.id}</p>
                  </div>
                  <p className="text-4xl font-[1000] tracking-tighter">₹{selectedOrder.total}</p>
                </div>
              </div>

              <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Line Items</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center font-black text-xs text-slate-500">
                        {item.quantity}x
                      </div>
                      <p className="font-black text-[#0F172A]">{item.name}</p>
                    </div>
                    <p className="font-black text-slate-400">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-8 bg-slate-50">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Close Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
