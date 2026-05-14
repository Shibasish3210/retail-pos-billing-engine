import React from 'react';
import { ShoppingCart, Trash2, Minus, Plus, ChevronDown } from 'lucide-react';
import { CartItem } from '../../types';
import { calculateItemTotal } from '../../storage';

interface SidebarProps {
  view: string;
  cart: CartItem[];
  cartTotal: number;
  isCartExpanded: boolean;
  setIsCartExpanded: (val: boolean) => void;
  clearCart: () => void;
  removeFromCart: (id: string) => void;
  addToCart: (item: any) => void;
  handleCompleteOrder: () => void;
}

export function Sidebar({
  view,
  cart,
  cartTotal,
  isCartExpanded,
  setIsCartExpanded,
  clearCart,
  removeFromCart,
  addToCart,
  handleCompleteOrder
}: SidebarProps) {
  return (
    <aside className={`
      fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-15px_40px_rgba(0,0,0,0.15)]
      md:relative md:w-[400px] md:border-t-0 md:border-l border-slate-100 md:shadow-none
      flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-[999]
      ${view !== 'billing' || cart.length === 0 ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}
      ${isCartExpanded ? 'h-[85vh] md:h-full' : 'h-[84px] md:h-full'}
    `}>
      {/* Mobile Header / Expand Toggle */}
      <div 
        onClick={() => setIsCartExpanded(!isCartExpanded)}
        className="md:hidden flex items-center justify-between px-6 py-5 bg-[#0F172A] text-white cursor-pointer  shadow-[0_-20px_50px_rgba(0,0,0,0.3)] shrink-0 z-50 sticky top-0 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-900/40">
            <ShoppingCart size={22} />
          </div>
          <div className="flex flex-col">
            <p className="font-bold text-[18px] leading-tight tracking-tight">Current Bill</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
              {cart.length} {cart.length === 1 ? 'ITEM' : 'ITEMS'} READY
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-2xl font-[1000] tracking-tighter">₹{cartTotal}</p>
          </div>
          <div className={`transition-transform duration-300 ${isCartExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={28} />
          </div>
        </div>
      </div>

      <div className={`p-6 border-b border-slate-100 flex justify-between items-center shrink-0 ${!isCartExpanded && 'hidden md:flex'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-100">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-1">CURRENT BILL</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{cart.length} LINE ITEMS</p>
          </div>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={clearCart}
            className="flex items-center gap-2 text-slate-300 font-extrabold text-[10px] hover:text-rose-500 transition-colors uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"
          >
            <Trash2 size={16} />
            UNDO
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${!isCartExpanded && 'hidden md:block'}`}>
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-200 space-y-4 py-20">
            <ShoppingCart size={72} strokeWidth={1} />
            <p className="font-black text-xs uppercase tracking-[0.3em]">No items selected</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-5 flex-1">
                <div className="bg-[#0F172A] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-[1000] text-xl shadow-lg shadow-slate-200">
                  {item.quantity}
                </div>
                <div>
                  <p className="font-[1000] text-lg text-[#0F172A] leading-tight mb-0.5">{item.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Rate: ₹{item.price}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-[1000] text-2xl text-[#0F172A] tracking-tighter">₹{calculateItemTotal(item)}</p>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button 
                     onClick={() => removeFromCart(item.id)}
                     className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 active:scale-95 transition-all text-slate-500"
                  >
                    <Minus size={18} />
                  </button>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 active:scale-95 transition-all text-slate-500"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`h-[176px] p-6 pb-32 md:pb-8 mt-auto border-t border-slate-100 bg-white shrink-0 ${!isCartExpanded && 'hidden md:block'}`}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-black text-slate-300 uppercase tracking-[0.2em]">Total</span>
          <span className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tighter">₹{cartTotal}</span>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={handleCompleteOrder}
          className={`w-full py-4 md:py-6 rounded-2xl font-black text-lg transition-all shadow-xl relative overflow-hidden uppercase tracking-widest ${
            cart.length > 0 
              ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
          }`}
        >
          Complete Order
        </button>
      </div>
    </aside>
  );
}
