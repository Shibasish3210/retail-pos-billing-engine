import React from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { Item, DraftBill } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { calculateItemTotal } from '../storage';
import { IconComponent } from '../components/shared/IconComponent';
import { OrderHistory } from '../components/layout/OrderHistory';

interface BillingViewProps {
  bills: DraftBill[];
  activeBillId: string;
  setActiveBillId: (id: string) => void;
  deleteBill: (id: string, e: React.MouseEvent) => void;
  addNewBill: () => void;
  allItemsByGroup: Record<string, Item[]>;
  addToCart: (item: Item) => void;
  refreshTrigger: number;
}

export function BillingView({
  bills,
  activeBillId,
  setActiveBillId,
  deleteBill,
  addNewBill,
  allItemsByGroup,
  addToCart,
  refreshTrigger
}: BillingViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 md:p-8 flex flex-col gap-8 pb-32 md:pb-12"
    >
      {/* Bills Management */}
      <div className="flex gap-6 overflow-x-auto py-6 scrollbar-hide px-4 md:px-8 -mx-4 md:-mx-8">
        {bills.map(bill => {
          const billTotal = bill.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
          return (
            <button
              key={bill.id}
              onClick={() => setActiveBillId(bill.id)}
              className={`relative p-8 rounded-[40px] border-4 transition-all min-w-[180px] md:min-w-[220px] text-left shrink-0 flex flex-col justify-between h-[160px] ${
                activeBillId === bill.id 
                  ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-2xl scale-105 z-10' 
                  : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[12px] font-black uppercase tracking-[0.3em] ${activeBillId === bill.id ? 'text-slate-500' : 'text-slate-300'}`}>
                  {bill.name}
                </span>
                {bills.length > 1 && (
                  <div 
                    onClick={(e) => deleteBill(bill.id, e)} 
                    className={`p-2 rounded-xl transition-colors ${activeBillId === bill.id ? 'hover:bg-white/10 text-white/20' : 'hover:bg-slate-100 text-slate-200'}`}
                  >
                      <X size={16} />
                  </div>
                )}
              </div>
              <div className="text-5xl font-[1000] tracking-tighter">₹{billTotal}</div>
            </button>
          );
        })}
        <button 
          onClick={addNewBill}
          className="p-6 rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-500 transition-all flex flex-col items-center justify-center min-w-[120px] shrink-0 bg-slate-50/50"
        >
          <Plus size={24} />
          <span className="text-[10px] font-black uppercase mt-1 tracking-widest">Add Bill</span>
        </button>
      </div>

      {/* Items Grouped by Category */}
      <div className="flex flex-col gap-12 pb-48 md:pb-12 px-4 md:px-8">
        {(Object.entries(allItemsByGroup) as [string, Item[]][]).map(([category, items]) => (
          <div key={category} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-8 rounded-full ${CATEGORY_COLORS[category]?.split(' ')[0] || 'bg-slate-500'}`} />
              <h3 className="text-sm font-[1000] text-slate-400 uppercase tracking-[0.3em]">{category}</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`${item.color} p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all flex flex-col items-center justify-between text-center relative overflow-hidden group border-2 border-transparent hover:border-white/20`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] group-hover:scale-110 transition-transform pointer-events-none">
                    <IconComponent name={item.iconName} size={120} />
                  </div>
                  
                  <div className="relative z-10 w-full mb-6">
                     <span className="text-2xl md:text-3xl font-[1000] uppercase tracking-tighter leading-tight drop-shadow-sm">
                      {item.name.split(' ₹')[0]}
                    </span>
                  </div>
                  
                  <div className="bg-white/40 backdrop-blur-md px-6 py-2.5 rounded-2xl w-full flex justify-between items-center relative z-10 border border-white/40">
                    <span className="text-sm font-black uppercase tracking-widest opacity-60">₹{item.price}</span>
                    <Plus size={16} className="opacity-60" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* History Section for Present Day */}
      <OrderHistory refreshTrigger={refreshTrigger} />
    </motion.div>
  );
}
