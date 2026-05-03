/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  ShoppingCart, 
  Plus, 
  Settings, 
  Trash2, 
  ChevronRight, 
  X,
  CheckCircle2,
  Trash,
  Minus,
  LayoutGrid,
  Coffee,
  Zap,
  Box,
  Wind,
  Container,
  Cake,
  Wheat,
  Utensils,
  Flame,
  Cookie,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Package,
  LogIn,
  LogOut,
  TrendingUp,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { DEFAULT_ITEMS, CATEGORY_COLORS, ITEM_CARD_COLORS } from './constants';
import { Item, CartItem, Order, DailySummary, DraftBill } from './types';
import { storage, calculateItemTotal } from './storage';
import { auth, loginWithGoogle } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [view, setView] = useState<'billing' | 'insights' | 'inventory' | 'settings'>('billing');
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
                  <p className="text-[20px] font-black text-slate-800 uppercase leading-none">{user.displayName?.split(' ')[0]}</p>
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
              <DesktopNavButton active={view === 'inventory'} onClick={() => setView('inventory')} icon={<Package size={20} />} label="Stock" />
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
                    <span className="text-[20px] font-black uppercase mt-1 tracking-widest">Add Bill</span>
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
                              <span className="text-[20px] font-black uppercase tracking-widest opacity-60">₹{item.price}</span>
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

            {view === 'inventory' && (
              <div className="p-4 md:p-8 overflow-y-auto h-full">
                <InventoryView onUpdate={() => setCustomItems(storage.getCustomItems())} />
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
                <p className="text-[20px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventory Updated</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around p-2 pb-6 z-50">
        <MobileNavButton active={view === 'billing'} onClick={() => setView('billing')} icon={<LayoutGrid size={24} />} label="POS" />
        <MobileNavButton active={view === 'insights'} onClick={() => setView('insights')} icon={<BarChart3 size={24} />} label="Stats" />
        <MobileNavButton active={view === 'inventory'} onClick={() => setView('inventory')} icon={<Package size={24} />} label="Stock" />
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

  useEffect(() => {
    async function load() {
      const data = await firebaseService.getSummaries();
      if (data.length > 0) {
        setSummaries(data);
      } else {
        // Fallback to local today's summary
        const today = new Date().toISOString().split('T')[0];
        setSummaries([storage.getDailySummary(today)]);
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

  const activeSummary = summaries[0];
  if (!activeSummary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-2">INSIGHTS</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Daily Business Analytics</p>
        </div>
        
        {summaries.length > 1 && (
          <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100">
            <TrendingUp size={20} />
            <span className="font-black text-sm uppercase tracking-widest">Growth Tracking Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <BarChart3 size={120} />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4">Total Revenue</p>
          <div className="text-5xl font-[1000] text-[#10B981] tracking-tighter">₹{activeSummary.totalSales}</div>
          {summaries[1] && (
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              VS YESTERDAY: ₹{summaries[1].totalSales}
            </p>
          )}
        </div>
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4">Orders Processed</p>
          <div className="text-5xl font-[1000] text-[#2563EB] tracking-tighter">{activeSummary.totalOrders}</div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Volume Efficiency</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4">Ticket Avg</p>
          <div className="text-5xl font-[1000] text-[#F59E0B] tracking-tighter">
            ₹{activeSummary.totalOrders > 0 ? (activeSummary.totalSales / activeSummary.totalOrders).toFixed(0) : 0}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Revenue Per Head</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-[0.2em] mb-8 border-b-2 border-slate-50 pb-4">Product Performance</h3>
          <div className="space-y-4">
            {Object.entries(activeSummary.itemCounts).length > 0 ? (
              Object.entries(activeSummary.itemCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between pb-2">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 text-sm">{name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sold Quantity</span>
                  </div>
                  <span className="bg-slate-100 px-4 py-2 rounded-xl font-black text-sm text-[#0F172A]">{count}</span>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-4">
                <LayoutGrid size={48} strokeWidth={1} />
                <p className="text-[20px] font-black uppercase tracking-widest">No Sales Data for {activeSummary.date}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-[0.2em] mb-8 border-b-2 border-slate-50 pb-4">Hourly Sales Velocity</h3>
          <div className="space-y-5">
            {Array.from({ length: 24 }).map((_, i) => {
              const sales = activeSummary.hourlySales[i] || 0;
              if (sales === 0 && (i < 6 || i > 22)) return null;
              return (
                <div key={i} className="flex items-center gap-6">
                  <span className="w-14 text-[10px] text-slate-400 font-black tracking-widest">{i < 10 ? `0${i}` : i}:00</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (sales / (activeSummary.totalSales || 1)) * 300)}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    />
                  </div>
                  <span className="w-20 text-right font-black text-[#0F172A] text-sm tracking-tighter">₹{sales}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Historical List */}
      {summaries.length > 1 && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-[0.2em] mb-8 border-b-2 border-slate-50 pb-4">Historical Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[20px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-4 pr-4 border-b border-slate-50">Date</th>
                  <th className="pb-4 pr-4 border-b border-slate-50">Sales</th>
                  <th className="pb-4 pr-4 border-b border-slate-50">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summaries.map(s => (
                  <tr key={s.date} className="group">
                    <td className="py-4 font-black text-sm text-slate-600">{s.date}</td>
                    <td className="py-4 font-black text-sm text-emerald-600">₹{s.totalSales}</td>
                    <td className="py-4 font-black text-sm text-blue-600">{s.totalOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function InventoryView({ onUpdate }: { onUpdate: () => void }) {
  const customItems = useMemo(() => storage.getCustomItems(), []);
  const [items, setItems] = useState<Item[]>(() => {
    return [...DEFAULT_ITEMS, ...customItems];
  });

  const handleUpdateStock = (id: string) => {
    const newStock = prompt("Enter current stock level:");
    if (newStock !== null && !isNaN(Number(newStock))) {
      const updated = items.map(i => {
        if (i.id === id) {
          const item = { ...i, stock: Number(newStock), useStock: true };
          // If custom item, save to storage
          if (customItems.find(ci => ci.id === id)) {
             const saved = storage.getCustomItems();
             const newSaved = saved.map(s => s.id === id ? item : s);
             localStorage.setItem('chai_bill_items', JSON.stringify(newSaved));
          }
          return item;
        }
        return i;
      });
      setItems(updated);
      onUpdate();
      if (auth.currentUser) {
        firebaseService.syncInventory(updated).catch(console.error);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl space-y-12 pb-24"
    >
      <div>
        <h1 className="text-4xl font-[1000] tracking-tighter text-[#0F172A] leading-none mb-2">INVENTORY</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Stock Maintenance & Alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className={`p-8 rounded-[32px] border-2 shadow-sm relative group transition-all ${item.useStock ? 'bg-white border-slate-100' : 'bg-slate-50 border-transparent opacity-60'}`}>
            <div className={`p-3 rounded-2xl w-fit mb-6 ${item.color.split(' ')[0]}`}>
               <AlertTriangle size={24} className={item.stock && item.stock < 10 ? 'text-rose-500' : 'text-slate-400'} />
            </div>
            
            <p className="font-black text-xl text-[#0F172A] tracking-tight leading-none mb-1">{item.name}</p>
            <p className="text-[20px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.category}</p>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[20px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2">Current Stock</p>
                <p className={`text-4xl font-[1000] tracking-tighter ${item.useStock ? (item.stock && item.stock < 10 ? 'text-rose-600' : 'text-[#0F172A]') : 'text-slate-300'}`}>
                  {item.useStock ? item.stock : '--'}
                </p>
              </div>
              <button 
                onClick={() => handleUpdateStock(item.id)}
                className="bg-[#0F172A] text-white p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {!item.useStock && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => handleUpdateStock(item.id)}>
                <p className="font-black text-[10px] uppercase bg-[#0F172A] text-white px-4 py-2 rounded-full tracking-widest">Enable Tracking</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
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
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Inventory & Data Management</p>
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
                <label className="text-[20px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
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
                  <label className="text-[20px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[20px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
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
