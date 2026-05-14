/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, ShoppingCart, Plus, Settings, Trash2, ChevronRight, X,
  CheckCircle2, Minus, LayoutGrid, Coffee, Zap, Box, Wind, Container,
  Cake, Wheat, Utensils, Flame, Cookie, ChevronUp, ChevronDown,
  BarChart3, TrendingUp, AlertTriangle, RefreshCcw, LogOut, User as UserIcon,
  Clock, Calendar, ArrowUpRight, ArrowDownRight, Filter, Download,
  LogIn, Package
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { 
  format, subDays, startOfMonth, startOfWeek, isSameDay, 
  isWithinInterval, parseISO, eachDayOfInterval 
} from 'date-fns';
import { DEFAULT_ITEMS, CATEGORY_COLORS, ITEM_CARD_COLORS } from './constants';
import { Item, CartItem, Order, DailySummary, DraftBill } from './types';
import { storage, calculateItemTotal } from './storage';
import { auth, loginWithGoogle } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [view, setView] = useState<'billing' | 'insights' | 'settings'>('billing');
  const [user, setUser] = useState<User | null>(null);
  const [bills, setBills] = useState<DraftBill[]>(() => {
    const saved = localStorage.getItem('chai_draft_bills');
    return saved ? JSON.parse(saved) : [{ id: 'b1', items: [], name: 'Bill 1', updatedAt: Date.now() }];
  });
  const [activeBillId, setActiveBillId] = useState<string>(() => {
    const saved = localStorage.getItem('chai_active_bill_id');
    return saved || 'b1';
  });
  const [customItems, setCustomItems] = useState<Item[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(() => storage.getPriceOverrides());
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Sync bills and activeBillId to localStorage
  useEffect(() => {
    localStorage.setItem('chai_draft_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('chai_active_bill_id', activeBillId);
  }, [activeBillId]);

  const activeBill = useMemo(() => 
    bills.find(b => b.id === activeBillId) || bills[0], 
    [bills, activeBillId]
  );
  
  const cart = activeBill?.items || [];

  // Reset cart expansion when empty
  useEffect(() => {
    if (cart.length === 0) {
      setIsCartExpanded(false);
    }
  }, [cart.length]);

  // Load custom items on mount
  useEffect(() => {
    setCustomItems(storage.getCustomItems());
  }, []);

  const allItemsByGroup = useMemo(() => {
    const items = [...DEFAULT_ITEMS, ...customItems].map(item => ({
      ...item,
      price: priceOverrides[item.id] || item.price,
      color: ITEM_CARD_COLORS[item.category] || item.color
    }));
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, Item[]>);
  }, [customItems, priceOverrides]);

  const IconComponent = ({ name, size = 24 }: { name?: string; size?: number }) => {
    switch (name) {
      case 'Coffee': return <Coffee size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'Box': return <Box size={size} />;
      case 'Wind': return <Wind size={size} />;
      case 'Container': return <Container size={size} />;
      case 'Cake': return <Cake size={size} />;
      case 'Wheat': return <Wheat size={size} />;
      case 'Utensils': return <Utensils size={size} />;
      case 'Flame': return <Flame size={size} />;
      case 'Cookie': return <Cookie size={size} />;
      default: return <Plus size={size} />;
    }
  };

  const addToCart = (item: Item) => {
    setBills(prev => prev.map(bill => {
      if (bill.id !== activeBillId) return bill;
      const existing = bill.items.find(i => i.id === item.id);
      let newItems;
      if (existing) {
        newItems = bill.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        newItems = [...bill.items, { ...item, quantity: 1 }];
      }
      return { ...bill, items: newItems, updatedAt: Date.now() };
    }));
  };

  const removeFromCart = (id: string) => {
    setBills(prev => prev.map(bill => {
      if (bill.id !== activeBillId) return bill;
      const existing = bill.items.find(i => i.id === id);
      let newItems;
      if (existing && existing.quantity > 1) {
        newItems = bill.items.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      } else {
        newItems = bill.items.filter(i => i.id !== id);
      }
      return { ...bill, items: newItems, updatedAt: Date.now() };
    }));
  };

  const addNewBill = () => {
    const newId = Math.random().toString(36).substring(7);
    const newBill = {
      id: newId,
      items: [],
      name: `Bill ${bills.length + 1}`,
      updatedAt: Date.now()
    };
    setBills(prev => [...prev, newBill]);
    setActiveBillId(newId);
  };

  const deleteBill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (bills.length === 1) {
      setBills([{ id: 'b1', items: [], name: 'Bill 1', updatedAt: Date.now() }]);
      setActiveBillId('b1');
      return;
    }
    const newBills = bills.filter(b => b.id !== id);
    setBills(newBills);
    if (activeBillId === id) {
      setActiveBillId(newBills[0].id);
    }
  };

  const clearCart = () => {
    setBills(prev => prev.map(bill => 
      bill.id === activeBillId ? { ...bill, items: [], updatedAt: Date.now() } : bill
    ));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart]);

  const undoLastItem = () => {
    setBills(prev => prev.map(bill => {
      if (bill.id !== activeBillId || bill.items.length === 0) return bill;
      const newItems = [...bill.items];
      const last = newItems[newItems.length - 1];
      if (last.quantity > 1) {
        newItems[newItems.length - 1] = { ...last, quantity: last.quantity - 1 };
      } else {
        newItems.pop();
      }
      return { ...bill, items: newItems, updatedAt: Date.now() };
    }));
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) return;

    const order: Order = {
      id: Math.random().toString(36).substring(7),
      items: [...cart],
      total: cartTotal,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };

    storage.saveOrder(order);
    
    // Sync with Firebase if logged in
    if (user) {
      firebaseService.saveOrder(order).catch(console.error);
    }
    
    // Remove completed bill and create new one if needed
    setBills(prev => {
      const remaining = prev.filter(b => b.id !== activeBillId);
      if (remaining.length === 0) {
        const nextId = Math.random().toString(36).substring(7);
        setActiveBillId(nextId);
        return [{ id: nextId, items: [], name: 'Bill 1', updatedAt: Date.now() }];
      }
      setActiveBillId(remaining[0].id);
      return remaining;
    });

    setShowOrderSuccess(true);
    setTimeout(() => setShowOrderSuccess(false), 2000);
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Login popup was blocked! Please allow popups for this site or open it in a full browser tab.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Domain Not Authorized: Please add this URL to 'Authorized Domains' in your Firebase console (Authentication > Settings).");
      } else {
        alert(`Login failed: ${error.message || 'Unknown error'}. On mobile, please ensure you're in a regular browser tab (not a Home Screen shortcut) and have added this domain to Firebase authorized domains.`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#0F172A] font-sans selection:bg-blue-100 selection:text-blue-900 pb-20 md:pb-0 h-screen flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-3 md:p-6 shrink-0 z-50">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl md:text-3xl font-[1000] tracking-tighter leading-none">CHAI POINT</h1>
            <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 hidden sm:block">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-50 px-2 md:px-3 py-1.5 rounded-2xl border border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-[12px] font-black text-slate-800 uppercase leading-none">{user.displayName?.split(' ')[0]}</p>
                  <p className="text-[8px] font-bold text-emerald-500 tracking-[0.2em]">SYNCED</p>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border border-blue-100 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
              >
                <LogIn size={16} />
                <span className="hidden md:inline">Login</span>
              </button>
            )}

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2 ml-4">
              <DesktopNavButton active={view === 'billing'} onClick={() => setView('billing')} icon={<LayoutGrid size={20} />} label="POS" />
              <DesktopNavButton active={view === 'insights'} onClick={() => setView('insights')} icon={<BarChart3 size={20} />} label="Stats" />
              <DesktopNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={20} />} label="Config" />
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
            {view === 'billing' && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 md:p-8 flex flex-col gap-8"
              >
                {/* Bills Management */}
                <div className="flex gap-6 overflow-x-auto py-6 scrollbar-hide px-4 md:px-8 -mx-4 md:-mx-8">
                  {bills.map(bill => {
                    const billTotal = bill.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
                    return (
                      <button
                        key={bill.id}
                        onClick={() => {
                          setActiveBillId(bill.id);
                        }}
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
              </motion.div>
            )}

            {view === 'insights' && (
              <div className="p-4 md:p-8 overflow-y-auto h-full">
                <InsightsView />
              </div>
            )}

            {view === 'settings' && (
              <div className="p-4 md:p-8 overflow-y-auto h-full">
                <SettingsView 
                  onAdd={() => setCustomItems(storage.getCustomItems())} 
                  onPriceUpdate={() => setPriceOverrides(storage.getPriceOverrides())}
                />
              </div>
            )}
          </AnimatePresence>
        </main>

        {/* Sidebar (Cart) - Desktop fixed / Mobile Overlay or Bottom Drawer */}
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
      </div>

      {/* Hidden Stats Bar on Mobile, Sticky Footer on Wide Screens */}
      {view === 'billing' && (
        <div className="hidden lg:flex bg-[#0F172A] text-white p-4 px-10 border-t border-slate-800 justify-between items-center z-50">
          <DailyStats />
        </div>
      )}

      {/* Success Notification */}
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-2xl rounded-3xl p-6 flex items-center gap-5 border border-emerald-100"
          >
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="font-[1000] text-lg tracking-tight">Order Finalized</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Recorded</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around p-2 pb-6 z-50">
        <MobileNavButton active={view === 'billing'} onClick={() => setView('billing')} icon={<LayoutGrid size={24} />} label="POS" />
        <MobileNavButton active={view === 'insights'} onClick={() => setView('insights')} icon={<BarChart3 size={24} />} label="Stats" />
        <MobileNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={24} />} label="Config" />
      </nav>
    </div>
  );
}

function DesktopNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
        active 
          ? 'bg-[#0F172A] text-white shadow-lg' 
          : 'text-slate-400 hover:bg-slate-50 border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center h-12 w-16 rounded-2xl transition-all ${
        active 
          ? 'text-[#0F172A] scale-110' 
          : 'text-slate-300'
      }`}
    >
      {icon}
      <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{label}</span>
      {active && <motion.div layoutId="activeTab" className="absolute -bottom-1 w-1 h-1 bg-[#0F172A] rounded-full" />}
    </button>
  );
}

function DailyStats() {
  const [stats, setStats] = useState<DailySummary | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStats(storage.getDailySummary(today));
  }, []);

  if (!stats) return null;

  return (
    <>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Sales Today</span>
        <span className="text-lg font-bold text-[#10B981]">₹{stats.totalSales}</span>
      </div>
      <div className="flex flex-col border-l border-slate-700 pl-6">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Orders</span>
        <span className="text-lg font-bold text-[#10B981]">{stats.totalOrders}</span>
      </div>
      <div className="flex flex-col border-l border-slate-700 pl-6">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Tea Sold</span>
        <span className="text-lg font-bold text-[#10B981]">{Object.entries(stats.itemCounts).filter(([name]) => name.toLowerCase().includes('tea')).reduce((acc, [_, count]) => acc + (count as number), 0)}</span>
      </div>
      <div className="flex flex-col border-l border-slate-700 pl-6">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Current Hour</span>
        <span className="text-lg font-bold text-[#10B981]">₹{stats.hourlySales[new Date().getHours()] || 0}</span>
      </div>
    </>
  );
}

function InsightsView() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [date1, setDate1] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [date2, setDate2] = useState<string>(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'overview' | 'comparison'>('overview');

  useEffect(() => {
    async function load() {
      const data = await firebaseService.getSummaries();
      if (data.length > 0) {
        setSummaries(data.sort((a, b) => b.date.localeCompare(a.date)));
        setDate1(data[0].date);
        if (data[1]) setDate2(data[1].date);
      } else {
        const today = format(new Date(), 'yyyy-MM-dd');
        setSummaries([storage.getDailySummary(today)]);
        setDate1(today);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <RefreshCcw className="animate-spin text-slate-300" size={48} />
    </div>
  );

  // Helper to aggregate data for charts
  const getChartData = () => {
    // Show last 7 days or last 30 days
    const daysToShow = period === 'monthly' ? 30 : 7;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), daysToShow - 1),
      end: new Date()
    });

    return interval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const found = summaries.find(s => s.date === dateStr);
      return {
        date: format(day, 'MMM dd'),
        fullDate: dateStr,
        sales: found?.totalSales || 0,
        orders: found?.totalOrders || 0
      };
    });
  };

  const currentSummary = summaries.find(s => s.date === date1) || summaries[0];
  const comparisonSummary = summaries.find(s => s.date === date2);
  const chartData = getChartData();

  // Aggregate stats for the current period
  const totalRevenue = chartData.reduce((acc, d) => acc + d.sales, 0);
  const totalOrders = chartData.reduce((acc, d) => acc + d.orders, 0);

  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32 max-w-[1400px] mx-auto px-4 md:px-8"
    >
      {/* Header & controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200">
            <BarChart3 className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-1">DASHBOARD</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Advanced Business Analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {(['overview', 'comparison'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  viewMode === mode ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  period === p ? 'bg-white text-[#0F172A] shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <div className="space-y-8">
          {/* Main Trend Chart */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Sales Velocity</h3>
                <p className="text-2xl font-[1000] text-[#0F172A] tracking-tighter">Revenue Trendline</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                 </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label={`${period} Revenue`} 
              value={`₹${totalRevenue}`} 
              sub={`Target period total`}
              trend={period === 'daily' ? getGrowth(currentSummary.totalSales, comparisonSummary?.totalSales || 0) : undefined}
              icon={<TrendingUp className="text-emerald-500" size={20} />}
            />
            <StatCard 
              label="Active Orders" 
              value={totalOrders.toString()} 
              sub={`${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0} avg ticket`}
              icon={<ShoppingCart className="text-blue-500" size={20} />}
            />
            <StatCard 
              label="Top Seller" 
              value={Object.entries(currentSummary.itemCounts).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A'} 
              sub={`${Object.entries(currentSummary.itemCounts).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[1] || 0} units sold`}
              icon={<BarChart3 className="text-amber-500" size={20} />}
            />
            <StatCard 
              label="Peak Time" 
              value={`${Object.entries(currentSummary.hourlySales).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 0}:00`} 
              sub="Highest velocity"
              icon={<Clock className="text-purple-500" size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Detailed Item Performance */}
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Inventory Pulse</h3>
                  <p className="text-2xl font-[1000] text-[#0F172A] tracking-tighter">Product Velocity</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <Filter size={20} className="text-slate-400" />
                </div>
              </div>
              
              <div className="space-y-6">
                {Object.entries(currentSummary.itemCounts).length > 0 ? (
                  Object.entries(currentSummary.itemCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => {
                    const prevCount = comparisonSummary?.itemCounts[name] || 0;
                    const growth = getGrowth(count as number, prevCount as number);
                    return (
                      <div key={name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all`}>
                             {name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-[#0F172A] text-lg leading-none mb-1">{name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               {count as number} units sold
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="bg-white border-2 border-slate-50 px-5 py-2 rounded-2xl font-black text-lg text-[#0F172A] shadow-sm">
                            {count as number}
                          </span>
                          <div className={`flex items-center gap-1 mt-1 ${growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                             <span className="text-[10px] font-black tracking-widest">{Math.abs(growth).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-200 gap-6">
                    <LayoutGrid size={72} strokeWidth={1} />
                    <p className="font-black text-xs uppercase tracking-widest">No Activity Recorded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Trend Table */}
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Historical Log</h3>
                  <p className="text-2xl font-[1000] text-[#0F172A] tracking-tighter">Business Record</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <Download size={20} className="text-emerald-500" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50">
                      <th className="pb-6 text-left">Date</th>
                      <th className="pb-6 text-center">Orders</th>
                      <th className="pb-6 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {summaries.slice(0, 10).map(s => (
                      <tr key={s.date} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5">
                          <p className="font-black text-slate-800">{format(parseISO(s.date), 'EEEE')}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.date}</p>
                        </td>
                        <td className="py-5 text-center">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-black text-xs">
                             {s.totalOrders}
                          </span>
                        </td>
                        <td className="py-5 text-right font-black text-lg text-[#0F172A]">
                           ₹{s.totalSales}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Comparison Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded-full bg-blue-500" />
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">PRIMARY TARGET</label>
              </div>
              <select 
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 font-black text-2xl text-white outline-none focus:border-blue-500 transition-all appearance-none"
              >
                {summaries.map(s => <option key={s.date} value={s.date} className="bg-slate-900">{s.date} - ₹{s.totalSales}</option>)}
              </select>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded-full bg-purple-500" />
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">COMPARISON TARGET</label>
              </div>
              <select 
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 font-black text-2xl text-white outline-none focus:border-purple-500 transition-all appearance-none"
              >
                {summaries.map(s => <option key={s.date} value={s.date} className="bg-slate-900">{s.date} - ₹{s.totalSales}</option>)}
              </select>
            </div>
          </div>

          {currentSummary && comparisonSummary && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ComparisonCard 
                  label="Sales Volume" 
                  val1={currentSummary.totalSales} 
                  val2={comparisonSummary.totalSales} 
                  prefix="₹"
                  isCurrency
                />
                <ComparisonCard 
                  label="Order Count" 
                  val1={currentSummary.totalOrders} 
                  val2={comparisonSummary.totalOrders} 
                />
                <ComparisonCard 
                  label="Efficiency" 
                  val1={currentSummary.totalOrders > 0 ? currentSummary.totalSales / currentSummary.totalOrders : 0} 
                  val2={comparisonSummary.totalOrders > 0 ? comparisonSummary.totalSales / comparisonSummary.totalOrders : 0}
                  prefix="₹"
                  round
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Item-by-item comparison */}
                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                   <h3 className="text-[11px] font-[1000] text-slate-300 uppercase tracking-[0.3em] mb-10 border-b border-slate-50 pb-6">Product Delta Analysis</h3>
                   <div className="space-y-6">
                      {Array.from(new Set([...Object.keys(currentSummary.itemCounts), ...Object.keys(comparisonSummary.itemCounts)])).map(name => {
                        const v1 = currentSummary.itemCounts[name] || 0;
                        const v2 = comparisonSummary.itemCounts[name] || 0;
                        const delta = (v1 as number) - (v2 as number);
                        const pDelta = v2 !== 0 ? ((v1 as number) - (v2 as number)) / (v2 as number) * 100 : 0;

                        return (
                          <div key={name} className="flex items-center justify-between group">
                            <div>
                               <p className="font-black text-lg text-[#0F172A] leading-none mb-1">{name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {v2 as number} → {v1 as number} units
                               </p>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                  {Math.abs(delta)}
                               </div>
                               <div className="text-[10px] font-black text-slate-300 w-12 text-right">
                                  {pDelta === 0 ? '0%' : `${pDelta > 0 ? '+' : ''}${pDelta.toFixed(0)}%`}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Velocity Pulse Overlay */}
                <div className="bg-[#0F172A] p-10 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                   
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-6">Hourly Pulse Comparison</h3>
                   <div className="space-y-6">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const h1 = currentSummary.hourlySales[i] || 0;
                      const h2 = comparisonSummary.hourlySales[i] || 0;
                      if (h1 === 0 && h2 === 0 && (i < 8 || i > 22)) return null;

                  const values1 = Object.values(currentSummary.hourlySales) as number[];
                  const values2 = Object.values(comparisonSummary.hourlySales) as number[];
                  const max = Math.max(...values1, ...values2, 1);

                  return (
                    <div key={i} className="space-y-2">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{i}:00</span>
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-black text-emerald-400">₹{h1}</span>
                                 <span className="text-[10px] font-black text-blue-400/50">₹{h2}</span>
                              </div>
                           </div>
                           <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                             <motion.div 
                                className="absolute inset-y-0 left-0 bg-blue-500/20"
                                initial={{ width: 0 }}
                                animate={{ width: `${(h2/max)*100}%` }}
                             />
                             <motion.div 
                                className="absolute inset-y-0 left-0 bg-emerald-500 h-[60%] my-auto shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(h1/max)*100}%` }}
                             />
                           </div>
                        </div>
                      );
                    })}
                   </div>

                   <div className="mt-10 pt-6 border-t border-white/5 flex gap-8">
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-emerald-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{date1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-blue-500/30" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{date2}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, sub, icon, trend }: { label: string; value: string; sub: string; icon: React.ReactNode; trend?: number }) {
  return (
    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm group hover:border-blue-100 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 font-black text-[10px] px-3 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{label}</p>
      <p className="text-3xl font-[1000] text-[#0F172A] tracking-tighter mb-1">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
    </div>
  );
}

function ComparisonCard({ label, val1, val2, prefix = "", isCurrency = false, round = false }: { 
  label: string; 
  val1: number; 
  val2: number; 
  prefix?: string; 
  isCurrency?: boolean;
  round?: boolean;
}) {
  const diff = val1 - val2;
  const percentDiff = val2 !== 0 ? (diff / val2) * 100 : 0;
  
  return (
    <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${diff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-6">{label}</p>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-5xl font-[1000] text-[#0F172A] tracking-tighter">
          {prefix}{round ? val1.toFixed(0) : val1}
        </span>
        <span className="text-slate-300 font-bold text-sm tracking-tighter">vs {prefix}{round ? val2.toFixed(0) : val2}</span>
      </div>
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-widest ${diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {diff >= 0 ? <TrendingUp size={14} /> : <AlertTriangle size={14} />}
        {diff >= 0 ? '+' : ''}{diff.toFixed(round ? 0 : 0)} ({percentDiff.toFixed(1)}%)
      </div>
    </div>
  );
}

function SettingsView({ onAdd, onPriceUpdate }: { onAdd: () => void; onPriceUpdate: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Item['category']>('Other');
  const [search, setSearch] = useState('');

  const customItems = useMemo(() => storage.getCustomItems(), []);
  const allItems = useMemo(() => {
    const overrides = storage.getPriceOverrides();
    return [...DEFAULT_ITEMS, ...customItems].map(i => ({
      ...i,
      price: overrides[i.id] || i.price
    }));
  }, [customItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [allItems, search]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const newItem: Item = {
      id: Math.random().toString(36).substring(7),
      name,
      price: Number(price),
      category,
      color: ITEM_CARD_COLORS[category] || 'bg-slate-700',
    };

    storage.saveCustomItem(newItem);
    setName('');
    setPrice('');
    onAdd();
  };

  const handleUpdatePrice = (itemId: string, currentPrice: number) => {
    const newPrice = prompt(`Enter new price for this item:`, currentPrice.toString());
    if (newPrice !== null && !isNaN(Number(newPrice))) {
      storage.savePriceOverride(itemId, Number(newPrice));
      onPriceUpdate();
      // Reload is needed to refresh the list memo if we don't lift state further
      // But we call onPriceUpdate which updates the parent state
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl space-y-12 pb-24"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-2">SETTINGS</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Product & Data Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Add Item */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
            <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                <Plus size={20} />
              </div>
              Create New Product
            </h3>
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Masala Omelette"
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#0F172A] text-white font-black py-5 rounded-[20px] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 tracking-widest text-xs mt-4"
              >
                CONFIRM & ADD
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
            <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
                <Trash2 size={20} />
              </div>
              Danger Zone
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-black text-rose-900 text-sm">Clear Sales Data</p>
                  <p className="text-[10px] font-bold text-rose-700/60 uppercase">Reset daily orders & stats</p>
                </div>
                <button 
                  onClick={() => {
                    if(confirm('Delete ALL sales history? This cannot be undone.')) {
                      storage.clearOrders();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all"
                >
                  Clear Data
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-black text-rose-900 text-sm">Delete Custom Menu</p>
                  <p className="text-[10px] font-bold text-rose-700/60 uppercase">Remove all manually added items</p>
                </div>
                <button 
                  onClick={() => {
                    if(confirm('Delete ALL custom menu items?')) {
                      storage.clearCustomItems();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all"
                >
                  Wipe Menu
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Manage Prices */}
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col h-[600px]">
          <div className="shrink-0 mb-6">
            <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Settings size={20} />
              </div>
              Edit Item Prices
            </h3>
            <div className="relative">
              <X size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 cursor-pointer ${!search && 'hidden'}`} onClick={() => setSearch('')} />
              <input 
                type="text" 
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] p-4 pl-5 font-bold outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ITEM_CARD_COLORS[item.category]?.split(' ')[0] || 'bg-slate-300'}`} />
                  <div>
                    <p className="font-black text-slate-800 text-sm leading-none mb-1">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUpdatePrice(item.id, item.price)}
                  className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl group-hover:border-emerald-500 group-hover:text-emerald-600 transition-all"
                >
                  <span className="font-black text-sm">₹{item.price}</span>
                  <ChevronRight size={14} className="opacity-30" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
