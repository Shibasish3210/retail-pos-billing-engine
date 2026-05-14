import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, TrendingUp, ShoppingCart, Clock, ArrowUpRight, ArrowDownRight, 
  Download, RefreshCcw, LayoutGrid
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns';
import { DailySummary } from '../types';
import { storage } from '../storage';
import { firebaseService } from '../services/firebaseService';
import { StatCard } from '../components/shared/StatCard';
import { ComparisonCard } from '../components/shared/ComparisonCard';

export function InsightsView() {
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

  const getChartData = () => {
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
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Inventory Pulse</h3>
                  <p className="text-2xl font-[1000] text-[#0F172A] tracking-tighter">Product Velocity</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                   <LayoutGrid size={20} className="text-slate-400" />
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
