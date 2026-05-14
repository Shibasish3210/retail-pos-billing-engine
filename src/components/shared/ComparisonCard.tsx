import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface ComparisonCardProps {
  label: string;
  val1: number;
  val2: number;
  prefix?: string;
  isCurrency?: boolean;
  round?: boolean;
}

export function ComparisonCard({ label, val1, val2, prefix = "", round = false }: ComparisonCardProps) {
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
        {diff >= 0 ? '+' : ''}{diff.toFixed(0)} ({percentDiff.toFixed(1)}%)
      </div>
    </div>
  );
}
