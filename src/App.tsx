/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, BarChart3, Settings, CheckCircle2
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { DEFAULT_ITEMS, ITEM_CARD_COLORS } from './constants';
import { Item, Order, DraftBill } from './types';
import { storage, calculateItemTotal } from './storage';
import { auth, loginWithGoogle } from './lib/firebase';
import { firebaseService } from './services/firebaseService';

// Layout Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DailyStats } from './components/layout/DailyStats';
import { MobileNavButton } from './components/shared/NavButtons';

// Views
import { BillingView } from './views/BillingView';
import { InsightsView } from './views/InsightsView';
import { SettingsView } from './views/SettingsView';

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
    
    if (user) {
      firebaseService.saveOrder(order).catch(console.error);
    }
    
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
      alert(`Login failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#0F172A] font-sans selection:bg-blue-100 selection:text-blue-900 pb-20 md:pb-0 h-screen flex flex-col overflow-hidden">
      
      <Header 
        user={user} 
        view={view} 
        setView={setView} 
        handleLogin={handleLogin} 
        handleLogout={() => auth.signOut()} 
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <main className="flex-1 overflow-y-auto bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
            {view === 'billing' && (
              <BillingView 
                bills={bills}
                activeBillId={activeBillId}
                setActiveBillId={setActiveBillId}
                deleteBill={deleteBill}
                addNewBill={addNewBill}
                allItemsByGroup={allItemsByGroup}
                addToCart={addToCart}
              />
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

        <Sidebar 
          view={view}
          cart={cart}
          cartTotal={cartTotal}
          isCartExpanded={isCartExpanded}
          setIsCartExpanded={setIsCartExpanded}
          clearCart={clearCart}
          removeFromCart={removeFromCart}
          addToCart={addToCart}
          handleCompleteOrder={handleCompleteOrder}
        />
      </div>

      {view === 'billing' && (
        <div className="hidden lg:flex bg-[#0F172A] text-white p-4 px-10 border-t border-slate-800 justify-between items-center z-50">
          <DailyStats />
        </div>
      )}

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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around p-2 pb-6 z-50">
        <MobileNavButton active={view === 'billing'} onClick={() => setView('billing')} icon={<LayoutGrid size={24} />} label="POS" />
        <MobileNavButton active={view === 'insights'} onClick={() => setView('insights')} icon={<BarChart3 size={24} />} label="Stats" />
        <MobileNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={24} />} label="Config" />
      </nav>
    </div>
  );
}
