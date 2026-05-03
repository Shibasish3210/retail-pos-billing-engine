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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans flex flex-col max-w-[1400px] mx-auto overflow-hidden h-screen">
      
      {/* Header - Fixed at Top */}
      <header className="bg-white border-b-2 border-slate-100 p-4 shrink-0 z-50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-[900] tracking-tighter text-[#0F172A]">CHAI POINT</h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            {user ? (
              <div className="flex items-center gap-3 mr-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{user.displayName?.split(' ')[0]}</p>
                  <p className="text-[8px] font-bold text-slate-400">SYNCED</p>
                </div>
                <button 
                  onClick={() => auth.signOut()}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all mr-2"
              >
                <LogIn size={16} />
                Login to Sync
              </button>
            )}

            <button 
              onClick={() => setView('billing')} 
              className={`p-3 rounded-xl transition-all ${view === 'billing' ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
              title="Billing"
            >
              <LayoutGrid size={22} />
            </button>
            <button 
              onClick={() => setView('insights')} 
              className={`p-3 rounded-xl transition-all ${view === 'insights' ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
              title="Insights"
            >
              <BarChart3 size={22} />
            </button>
            <button 
              onClick={() => setView('inventory')} 
              className={`p-3 rounded-xl transition-all ${view === 'inventory' ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
              title="Inventory"
            >
              <Package size={22} />
            </button>
            <button 
              onClick={() => setView('settings')} 
              className={`p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
              title="Settings"
            >
              <Settings size={22} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <AnimatePresence mode="wait">
            {view === 'billing' && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-8 flex flex-col gap-6"
              >
                {/* Bills Management */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {bills.map(bill => {
                    const billTotal = bill.items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
                    return (
                      <button
                        key={bill.id}
                        onClick={() => {
                          setActiveBillId(bill.id);
                          if (bill.items.length > 0) setIsCartExpanded(true);
                        }}
                        className={`relative p-4 md:p-5 rounded-[24px] border-4 transition-all min-w-[140px] md:min-w-[160px] text-left shrink-0 ${
                          activeBillId === bill.id 
                            ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xl shadow-slate-200' 
                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${activeBillId === bill.id ? 'text-slate-400' : 'text-slate-300'}`}>
                            {bill.name}
                          </span>
                          <div 
                            onClick={(e) => deleteBill(bill.id, e)} 
                            className={`p-1 rounded-lg transition-colors ${activeBillId === bill.id ? 'hover:bg-white/10 text-white/40' : 'hover:bg-slate-100 text-slate-300'}`}
                          >
                              <X size={14} />
                          </div>
                        </div>
                        <div className="text-2xl font-black">₹{billTotal}</div>
                        {bill.items.length > 0 && activeBillId !== bill.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                        )}
                      </button>
                    );
                  })}
                  <button 
                    onClick={addNewBill}
                    className="p-4 md:p-5 rounded-[24px] border-4 border-dashed border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-400 transition-all flex flex-col items-center justify-center min-w-[140px] md:min-w-[160px] shrink-0 bg-slate-50/30"
                  >
                    <Plus size={24} />
                    <span className="text-[10px] font-black uppercase mt-1 tracking-widest">New Bill</span>
                  </button>
                </div>

                {/* Items Grouped by Category */}
                <div className="flex flex-col gap-10 pb-48 md:pb-12">
                  {(Object.entries(allItemsByGroup) as [string, Item[]][]).map(([category, items]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-10 rounded-full ${CATEGORY_COLORS[category]?.split(' ')[0] || 'bg-slate-500'}`} />
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em]">{category}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className={`${item.color} min-h-[140px] md:min-h-[160px] p-6 rounded-[28px] shadow-xl shadow-slate-200/50 active:scale-95 active:opacity-70 transition-all flex flex-col items-center justify-between text-center relative overflow-hidden group border-2 border-slate-200/50 hover:border-slate-300`}
                          >
                            {/* Larger, decorative icon in background to prevent overlap */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] group-hover:scale-110 transition-transform pointer-events-none">
                              <IconComponent name={item.iconName} size={110} />
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
                               <span className="text-2xl md:text-3xl font-[1000] uppercase tracking-tighter leading-[1] mb-1 drop-shadow-sm break-words px-2">
                                {item.name.split(' ₹')[0]}
                              </span>
                            </div>
                            
                            <div className="bg-white/50 backdrop-blur-sm px-6 py-2.5 rounded-2xl w-full flex justify-between items-center relative z-10 border-t border-white/40">
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60">Price</span>
                              <span className="text-xl md:text-2xl font-black">₹{item.price}</span>
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
          fixed bottom-0 left-0 right-0 z-40 bg-white border-t-4 border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]
          md:relative md:w-[380px] md:border-t-0 md:border-l-4 md:shadow-none
          flex flex-col transition-all duration-300
          ${view !== 'billing' ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}
          ${isCartExpanded ? 'h-[85%] md:h-full' : 'h-[72px] md:h-full'}
        `}>
          {/* Mobile Header / Expand Toggle */}
          <div 
            onClick={() => setIsCartExpanded(!isCartExpanded)}
            className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <ShoppingCart size={20} />
              </div>
              <p className="font-black text-lg">Bill: {cart.length} Items</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black">₹{cartTotal}</span>
              {isCartExpanded ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
            </div>
          </div>

          <div className={`p-5 border-b-2 border-slate-100 flex justify-between items-center shrink-0 ${!isCartExpanded && 'hidden md:flex'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                <ShoppingCart size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-[900] tracking-tighter text-[#0F172A]">CURRENT BILL</h2>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={undoLastItem}
                className="flex items-center gap-2 text-slate-400 font-black text-xs hover:text-rose-500 transition-colors uppercase tracking-widest"
              >
                <Trash2 size={18} />
                Undo
              </button>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${!isCartExpanded && 'hidden md:block'}`}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-8">
                <ShoppingCart size={64} strokeWidth={1} />
                <p className="font-black text-xs uppercase tracking-[0.2em]">Select items to bill</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between group bg-slate-50 p-4 rounded-2xl border-2 border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="bg-[#0F172A] text-white px-3 py-1.5 rounded-lg font-black text-lg min-w-[40px] text-center">{item.quantity}</span>
                    <div>
                      <p className="font-extrabold text-lg text-[#0F172A] leading-none mb-1">{item.name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rate: ₹{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-xl text-[#0F172A]">₹{calculateItemTotal(item)}</span>
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => removeFromCart(item.id)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400"><Minus size={16}/></button>
                      <button onClick={() => addToCart(item)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400"><Plus size={16}/></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`p-6 mt-auto border-t-[6px] border-double border-slate-100 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.05)] shrink-0 ${!isCartExpanded && 'hidden md:block'}`}>
            <div className="flex justify-between items-center mb-6">
              <span className="text-2xl font-black text-slate-400 uppercase tracking-widest">Total</span>
              <span className="text-5xl font-black text-[#0F172A] tracking-tighter">₹{cartTotal}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={handleCompleteOrder}
              className={`w-full py-6 md:py-8 rounded-[24px] font-black text-2xl transition-all shadow-2xl relative overflow-hidden ${
                cart.length > 0 
                  ? 'bg-[#2563EB] text-white shadow-blue-200 active:scale-95' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              COMPLETE ORDER
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
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-emerald-100"
          >
            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold">Order Saved!</p>
              <p className="text-sm text-slate-500">Cart cleared successfully.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
                <p className="text-[10px] font-black uppercase tracking-widest">No Sales Data for {activeSummary.date}</p>
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
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.category}</p>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2">Current Stock</p>
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
