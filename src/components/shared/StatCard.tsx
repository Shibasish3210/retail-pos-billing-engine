import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend?: number;
}

export function StatCard({ label, value, sub, icon, trend }: StatCardProps) {
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
