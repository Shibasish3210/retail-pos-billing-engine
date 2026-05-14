import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Settings, ChevronRight, X } from 'lucide-react';
import { Item } from '../types';
import { storage } from '../storage';
import { DEFAULT_ITEMS, ITEM_CARD_COLORS, CATEGORY_COLORS } from '../constants';

interface SettingsViewProps {
  onAdd: () => void;
  onPriceUpdate: () => void;
}

export function SettingsView({ onAdd, onPriceUpdate }: SettingsViewProps) {
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
