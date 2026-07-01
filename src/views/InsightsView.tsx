import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, ShoppingCart, Calendar, BarChart3, Clock, 
  Coffee, ChevronRight, X, RefreshCcw, Landmark,
  CalendarDays, ChevronDown, Award
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { DailySummary } from '../types';
import { storage } from '../storage';
import { firebaseService } from '../services/firebaseService';

// Generates billing/shop cycles of "20th of month to 20th of next month" 
// starting from April 20, 2026.
function generateShopCycles(): Array<{ id: string; label: string; startDateStr: string; endDateStr: string }> {
  const startYear = 2026;
  const startMonth = 3; // April (0-indexed in JS Dates)
  const startDay = 20;
  
  const cycles: Array<{ id: string; label: string; startDateStr: string; endDateStr: string }> = [];
  const today = new Date();
  
  // We want to generate cycles up to 1 month in the future
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);
  
  let currentStart = new Date(startYear, startMonth, startDay);
  
  while (currentStart < maxDate) {
    const nextStart = new Date(currentStart);
    nextStart.setMonth(nextStart.getMonth() + 1);
    
    const cycleEnd = new Date(nextStart);
    cycleEnd.setDate(cycleEnd.getDate() - 1);
    
    const id = `cycle-${format(currentStart, 'yyyyMMdd')}`;
    const label = `${format(currentStart, 'MMM d')} - ${format(cycleEnd, 'MMM d')}`;
    
    cycles.push({
      id,
      label,
      startDateStr: format(currentStart, 'yyyy-MM-dd'),
      endDateStr: format(cycleEnd, 'yyyy-MM-dd')
    });
    
    currentStart = nextStart;
  }
  
  return cycles.reverse(); // Show newest cycles first
}

type TimeframePreset = '1D' | '1W' | '1M' | '3M' | 'ALL' | 'CYCLE' | 'CUSTOM';

export function InsightsView() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailySummary | null>(null);

  // Timeframe and Range States
  const [timeframe, setTimeframe] = useState<TimeframePreset>('1W');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    // Default start to 30 days ago
    return format(subDays(new Date(), 30), 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // Crypto-style Hover/Scrubbing State
  const [hoveredData, setHoveredData] = useState<{ label: string; sales: number; orders: number } | null>(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentMonthPrefix = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  const shopCycles = useMemo(() => generateShopCycles(), []);

  // Sync default cycle id on load
  useEffect(() => {
    if (shopCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(shopCycles[0].id);
    }
  }, [shopCycles, selectedCycleId]);

  const activeCycle = useMemo(() => {
    return shopCycles.find(c => c.id === selectedCycleId) || shopCycles[0];
  }, [shopCycles, selectedCycleId]);

  useEffect(() => {
    async function load() {
      // 1. Group local orders into dynamic summaries
      const localOrders = storage.getOrders();
      const localSummariesMap: Record<string, DailySummary> = {};
      
      localOrders.forEach(order => {
        if (!localSummariesMap[order.date]) {
          localSummariesMap[order.date] = {
            date: order.date,
            totalSales: 0,
            totalOrders: 0,
            itemCounts: {},
            hourlySales: {}
          };
        }
        const s = localSummariesMap[order.date];
        s.totalSales += order.total;
        s.totalOrders += 1;
        
        // Hourly sales grouping
        const hour = new Date(order.timestamp).getHours();
        s.hourlySales[hour] = (s.hourlySales[hour] || 0) + order.total;
        
        // Item grouping
        order.items.forEach(item => {
          s.itemCounts[item.name] = (s.itemCounts[item.name] || 0) + item.quantity;
        });
      });

      // 2. Fetch server summaries if authenticated, and merge
      const mergedSummariesMap = { ...localSummariesMap };
      try {
        const serverSummaries = await firebaseService.getSummaries();
        serverSummaries.forEach(s => {
          mergedSummariesMap[s.date] = s;
        });
      } catch (error) {
        console.error("Firebase summaries load error:", error);
      }

      // 3. Set summaries sorted by descending date
      const sorted = Object.values(mergedSummariesMap).sort((a, b) => b.date.localeCompare(a.date));
      setSummaries(sorted);
      setLoading(false);
    }
    load();
  }, []);

  // Today's Stats card computation
  const todaySummary = useMemo(() => {
    return summaries.find(s => s.date === todayStr) || {
      date: todayStr,
      totalSales: 0,
      totalOrders: 0,
      itemCounts: {},
      hourlySales: {}
    };
  }, [summaries, todayStr]);

  // Current Month's general KPI computation
  const monthlyStats = useMemo(() => {
    const matched = summaries.filter(s => s.date.startsWith(currentMonthPrefix));
    return {
      sales: matched.reduce((acc, s) => acc + s.totalSales, 0),
      orders: matched.reduce((acc, s) => acc + s.totalOrders, 0)
    };
  }, [summaries, currentMonthPrefix]);

  // All-time cumulative stats
  const allTimeStats = useMemo(() => {
    return {
      sales: summaries.reduce((acc, s) => acc + s.totalSales, 0),
      orders: summaries.reduce((acc, s) => acc + s.totalOrders, 0)
    };
  }, [summaries]);

  // Daily popular items today
  const popularItemsToday = useMemo(() => {
    if (!todaySummary.itemCounts) return [];
    return Object.entries(todaySummary.itemCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3);
  }, [todaySummary]);

  // Generate continuous chart data for the selected range/preset
  const chartData = useMemo(() => {
    if (timeframe === '1D') {
      // Hourly today
      return Array.from({ length: 24 }, (_, hour) => {
        const displayHour = format(new Date().setHours(hour, 0, 0, 0), 'hh:00 a');
        return {
          label: displayHour,
          fullDate: `Today at ${displayHour}`,
          sales: todaySummary.hourlySales[hour] || 0,
          orders: (todaySummary.hourlySales[hour] || 0) > 0 ? 1 : 0 // approximate transaction count
        };
      });
    }

    let start: Date;
    let end: Date = new Date();

    if (timeframe === '1W') {
      start = subDays(new Date(), 6);
    } else if (timeframe === '1M') {
      start = subDays(new Date(), 29);
    } else if (timeframe === '3M') {
      start = subDays(new Date(), 89);
    } else if (timeframe === 'ALL') {
      if (summaries.length > 0) {
        const sortedDates = [...summaries].map(s => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
        start = sortedDates[0];
      } else {
        start = parseISO('2026-04-20');
      }
    } else if (timeframe === 'CYCLE' && activeCycle) {
      start = parseISO(activeCycle.startDateStr);
      end = parseISO(activeCycle.endDateStr);
    } else if (timeframe === 'CUSTOM') {
      start = parseISO(customStartDate);
      end = parseISO(customEndDate);
    } else {
      start = subDays(new Date(), 6);
    }

    try {
      const intervalDays = eachDayOfInterval({ start, end });
      return intervalDays.map(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        const found = summaries.find(s => s.date === dStr);
        return {
          label: format(day, 'MMM dd'),
          fullDate: format(day, 'EEEE, MMMM d, yyyy'),
          sales: found ? found.totalSales : 0,
          orders: found ? found.totalOrders : 0
        };
      });
    } catch (e) {
      console.error("Failed to generate date interval", e);
      return [];
    }
  }, [timeframe, summaries, todaySummary, activeCycle, customStartDate, customEndDate]);

  // Compute aggregated stats matching the selected/filtered interval
  const filteredStats = useMemo(() => {
    const totalSales = chartData.reduce((sum, item) => sum + item.sales, 0);
    const totalOrders = chartData.reduce((sum, item) => sum + item.orders, 0);
    const numDays = chartData.length || 1;
    const dailyAverage = timeframe === '1D' ? totalSales : Math.round(totalSales / numDays);

    let bestDaySales = 0;
    let bestDayLabel = 'N/A';
    chartData.forEach(item => {
      if (item.sales > bestDaySales) {
        bestDaySales = item.sales;
        bestDayLabel = item.label;
      }
    });

    return {
      totalSales,
      totalOrders,
      dailyAverage,
      bestDayLabel,
      bestDaySales
    };
  }, [chartData, timeframe]);

  // Live balance text updates based on mouse hover/scrubbing
  const displayTotalSales = hoveredData ? hoveredData.sales : filteredStats.totalSales;
  const displayLabel = hoveredData ? hoveredData.label : (timeframe === '1D' ? "Today's Aggregated Sales" : 'Period Total Sales');

  if (loading) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="animate-spin text-blue-500" size={40} />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Analytics...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-24 max-w-[1240px] mx-auto px-1"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#0F172A] text-white p-3.5 rounded-2xl shadow-sm">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-[1000] tracking-tight text-[#0F172A] leading-none mb-1">POS STATS</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Simple Performance Pulse</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(), 'EEEE')}</p>
          <p className="text-sm font-extrabold text-[#0F172A]">{format(new Date(), 'd MMMM, yyyy')}</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Today */}
        <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] group transition-all hover:border-blue-100">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Today
              </span>
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Today's Revenue</p>
            <p className="text-3xl font-[1000] text-[#0F172A] tracking-tight">₹{todaySummary.totalSales}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {todaySummary.totalOrders} total bills registered today
          </p>
        </div>

        {/* KPI: Monthly */}
        <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] group transition-all hover:border-blue-100">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {format(new Date(), 'MMMM')}
              </span>
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Monthly Revenue</p>
            <p className="text-3xl font-[1000] text-[#0F172A] tracking-tight">₹{monthlyStats.sales}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {monthlyStats.orders} orders processed this month
          </p>
        </div>

        {/* KPI: All-time */}
        <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] group transition-all hover:border-blue-100">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Cumulative
              </span>
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Landmark size={16} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">All-Time Revenue</p>
            <p className="text-3xl font-[1000] text-[#0F172A] tracking-tight">₹{allTimeStats.sales}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {allTimeStats.orders} overall total transactions
          </p>
        </div>
      </div>

      {/* Interactive Chart & Secondary Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Modern Crypto-style Chart Panel (spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
          
          {/* Header & Preset Switchers */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1 block">Live Scrubbing Enabled</span>
              <h3 className="text-xl font-[1000] text-[#0F172A] tracking-tight">Sales Revenue Velocity</h3>
            </div>

            {/* Premium Preset Pill Bar */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
              {(['1D', '1W', '1M', '3M', 'ALL', 'CYCLE', 'CUSTOM'] as const).map((t) => {
                const labelMap: Record<string, string> = {
                  '1D': '1D',
                  '1W': '1W',
                  '1M': '1M',
                  '3M': '3M',
                  'ALL': 'ALL',
                  'CYCLE': 'Shop Month',
                  'CUSTOM': 'Custom Range'
                };
                const isActive = timeframe === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#0F172A] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                    }`}
                  >
                    {labelMap[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Cycle Selector Drawer */}
          <AnimatePresence>
            {timeframe === 'CYCLE' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Choose accounting period:</span>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
                    >
                      {shopCycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id}>
                          {cycle.label} (Cycles monthly on the 20th)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Conditional Custom Range Drawer */}
            {timeframe === 'CUSTOM' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50 p-4 rounded-2xl flex flex-wrap items-center gap-6 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">From:</span>
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">To:</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">
                    Track custom marketing cycles or exact business seasons
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic "Scrubbing" Metrics Dashboard */}
          <div className="bg-slate-50/55 p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">
                {displayLabel}
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-[1000] text-[#0F172A] tracking-tighter leading-none">
                  ₹{displayTotalSales}
                </h2>
                {hoveredData && (
                  <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                    Live Point
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-left md:text-right">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bills</span>
                <p className="text-sm font-black text-slate-700">
                  {hoveredData ? (hoveredData.orders || '0') : filteredStats.totalOrders}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Daily Avg</span>
                <p className="text-sm font-black text-slate-700">
                  ₹{filteredStats.dailyAverage}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-emerald-600">Peak Sales</span>
                <p className="text-sm font-black text-emerald-600">
                  {filteredStats.bestDaySales > 0 ? `₹${filteredStats.bestDaySales}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Area Chart Stage */}
          <div className="h-[250px] w-full pt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData}
                  onMouseMove={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const payload = e.activePayload[0].payload;
                      setHoveredData({
                        label: payload.fullDate || payload.label,
                        sales: payload.sales,
                        orders: payload.orders
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredData(null)}
                >
                  <defs>
                    <linearGradient id="cryptoSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.00}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', padding: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                    labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginBottom: '2px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name="Revenue (₹)"
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#cryptoSalesGrad)" 
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                <Calendar size={32} strokeWidth={1.5} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empty Chart Range</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Mix Card */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1 block">Hot Sellers</span>
                <h3 className="text-xl font-[1000] text-[#0F172A] tracking-tight">Today's Product Mix</h3>
              </div>
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
                <Coffee size={18} />
              </div>
            </div>

            <div className="space-y-4">
              {popularItemsToday.length > 0 ? (
                popularItemsToday.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-[#0F172A] text-sm leading-tight">{name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Item Count</p>
                      </div>
                    </div>
                    <span className="bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-xl font-black text-sm text-[#0F172A]">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 flex flex-col items-center text-slate-300 gap-3">
                  <Coffee size={36} strokeWidth={1.5} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Sales Recorded Today</p>
                </div>
              )}
            </div>
          </div>

          {popularItemsToday.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                * Based on today's localized draft registers
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Historical Daily Record at the Bottom (Preserved cleanly) */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1 block font-mono">Archive Registry</span>
            <h3 className="text-2xl font-[1000] text-[#0F172A] tracking-tight">Daily Record of Sales</h3>
          </div>
          <span className="text-[10px] bg-slate-50 text-slate-500 font-extrabold px-3 py-1.5 rounded-xl border border-slate-100">
            {summaries.length} days recorded
          </span>
        </div>

        {summaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="pb-4 text-left font-extrabold">Registered Date</th>
                  <th className="pb-4 text-center font-extrabold">Total Bills</th>
                  <th className="pb-4 text-right font-extrabold">Gross Revenue</th>
                  <th className="pb-4 text-right font-extrabold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summaries.map(s => {
                  const parsed = parseISO(s.date);
                  return (
                    <tr 
                      key={s.date} 
                      onClick={() => setSelectedDayDetail(s)}
                      className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                    >
                      <td className="py-5">
                        <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {format(parsed, 'EEEE, d MMMM')}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                          {s.date}
                        </p>
                      </td>
                      <td className="py-5 text-center">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-black text-xs">
                          {s.totalOrders}
                        </span>
                      </td>
                      <td className="py-5 text-right font-black text-base text-[#0F172A]">
                        ₹{s.totalSales}
                      </td>
                      <td className="py-5 text-right">
                        <button className="inline-flex items-center gap-1.5 font-black text-[10px] text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">
                          Review <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-300 flex flex-col items-center gap-4">
            <ShoppingCart size={48} strokeWidth={1.5} />
            <div>
              <p className="font-black text-sm uppercase tracking-widest text-[#0F172A] mb-1">No Saved Transactions</p>
              <p className="text-xs font-bold text-slate-400 max-w-sm mx-auto">
                Once orders are finalized at the POS checkout, their records will automatically populate here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Detail Modal (Preserved cleanly) */}
      <AnimatePresence>
        {selectedDayDetail && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayDetail(null)}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="bg-[#0F172A] p-8 text-white relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Day Archive Report</span>
                    <h4 className="text-2xl font-[1000] tracking-tight">
                      {format(parseISO(selectedDayDetail.date), 'EEEE, d MMM')}
                    </h4>
                    <p className="font-mono text-xs opacity-50 uppercase mt-0.5">{selectedDayDetail.date}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedDayDetail(null)}
                    className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-white/80 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-6 border-t border-white/10">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Verified Revenue</span>
                    <p className="text-3xl font-[1000]">₹{selectedDayDetail.totalSales}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-sans">Total Bills Processed</span>
                    <p className="text-3xl font-[1000]">{selectedDayDetail.totalOrders}</p>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-8 space-y-6 max-h-[380px] overflow-y-auto scrollbar-hide">
                {/* Item distribution list */}
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-b border-slate-50 pb-2">
                    Line Item Distribution
                  </h5>
                  <div className="space-y-3">
                    {Object.entries(selectedDayDetail.itemCounts || {}).length > 0 ? (
                      Object.entries(selectedDayDetail.itemCounts)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([name, qty]) => (
                          <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 font-black text-[11px] flex items-center justify-center">
                                {qty}x
                              </span>
                              <span className="font-extrabold text-slate-800 text-sm">{name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-400 tracking-wider">
                              Product Sale
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs font-bold text-slate-400 text-center py-4">
                        No product breakdown recorded.
                      </p>
                    )}
                  </div>
                </div>

                {/* Hourly breakdown list */}
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-b border-slate-50 pb-2">
                    Hourly Sales Breakdown
                  </h5>
                  <div className="space-y-2.5">
                    {Object.entries(selectedDayDetail.hourlySales || {}).length > 0 ? (
                      Object.entries(selectedDayDetail.hourlySales)
                        .map(([hour, val]) => {
                          const formattedHour = format(new Date().setHours(Number(hour)), 'hh:00 a');
                          return (
                            <div key={hour} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-300" />
                                <span className="font-extrabold text-xs text-slate-500">{formattedHour}</span>
                              </div>
                              <span className="font-black text-sm text-slate-700">₹{val}</span>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-xs font-bold text-slate-400 text-center py-2">
                        No hourly timestamp information recorded.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedDayDetail(null)}
                  className="w-full py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm"
                >
                  Close Day Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
