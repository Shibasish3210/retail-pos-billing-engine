import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, ShoppingCart, Calendar, BarChart3, Clock, 
  ArrowUpRight, Coffee, ChevronRight, X, RefreshCcw, Landmark
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { DailySummary } from '../types';
import { storage } from '../storage';
import { firebaseService } from '../services/firebaseService';

export function InsightsView() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailySummary | null>(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentMonthPrefix = useMemo(() => format(new Date(), 'yyyy-MM'), []);

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

  // Compute stats:
  // Today's Stats
  const todaySummary = useMemo(() => {
    return summaries.find(s => s.date === todayStr) || {
      date: todayStr,
      totalSales: 0,
      totalOrders: 0,
      itemCounts: {},
      hourlySales: {}
    };
  }, [summaries, todayStr]);

  // Current Month's Stats (e.g. 2026-06)
  const monthlyStats = useMemo(() => {
    const matched = summaries.filter(s => s.date.startsWith(currentMonthPrefix));
    return {
      sales: matched.reduce((acc, s) => acc + s.totalSales, 0),
      orders: matched.reduce((acc, s) => acc + s.totalOrders, 0)
    };
  }, [summaries, currentMonthPrefix]);

  // All-time Stats
  const allTimeStats = useMemo(() => {
    return {
      sales: summaries.reduce((acc, s) => acc + s.totalSales, 0),
      orders: summaries.reduce((acc, s) => acc + s.totalOrders, 0)
    };
  }, [summaries]);

  // Daily popular item today
  const popularItemsToday = useMemo(() => {
    if (!todaySummary.itemCounts) return [];
    return Object.entries(todaySummary.itemCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3);
  }, [todaySummary]);

  // Chart data: Last 7 days trend
  const trendChartData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dStr = format(day, 'yyyy-MM-dd');
      const found = summaries.find(s => s.date === dStr);
      return {
        label: format(day, 'EEE'),
        fullDate: dStr,
        sales: found ? found.totalSales : 0,
        orders: found ? found.totalOrders : 0
      };
    });
  }, [summaries]);

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
      {/* Dynamic Dashboard Header */}
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

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Today's revenue */}
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

        {/* KPI: This Month's revenue */}
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

        {/* KPI: All-time Stats */}
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

      {/* Grid: 7-Day Trend and Hot Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (spans 2 cols on lg) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1 block">Revenue Trend</span>
              <h3 className="text-xl font-[1000] text-[#0F172A] tracking-tight">Last 7 Days Sales Velocity</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Revenue</span>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="chartSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 12px 24px -4px rgb(0 0 0 / 0.08)', padding: '14px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  name="Sales (₹)"
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#chartSalesGrad)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hot Sellers Card */}
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

      {/* Main Historical Daily Record at the Bottom */}
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

      {/* Interactive Detail Modal to Cross-verify specific previous days */}
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

                {/* Hourly breakdown list (Only showing hours with actual sales) */}
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
