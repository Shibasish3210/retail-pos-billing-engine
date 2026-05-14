import React from 'react';
import { motion } from 'motion/react';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function DesktopNavButton({ active, onClick, icon, label }: NavButtonProps) {
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

export function MobileNavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center h-12 w-16 rounded-2xl transition-all relative ${
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
