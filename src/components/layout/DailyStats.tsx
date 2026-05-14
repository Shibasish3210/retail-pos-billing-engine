import React, { useState, useEffect } from 'react';
import { storage } from '../../storage';
import { DailySummary } from '../../types';

export function DailyStats() {
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
