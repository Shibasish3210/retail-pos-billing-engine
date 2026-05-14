import React from 'react';
import { LogOut, LogIn, LayoutGrid, BarChart3, Settings } from 'lucide-react';
import { User } from 'firebase/auth';
import { DesktopNavButton } from '../shared/NavButtons';

interface HeaderProps {
  user: User | null;
  view: string;
  setView: (view: any) => void;
  handleLogin: () => void;
  handleLogout: () => void;
}

export function Header({ user, view, setView, handleLogin, handleLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-100 p-3 md:p-6 shrink-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-3xl font-[1000] tracking-tighter leading-none">CHAI POINT</h1>
          <p className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 hidden sm:block">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 px-2 md:px-3 py-1.5 rounded-2xl border border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-black text-slate-800 uppercase leading-none">{user.displayName?.split(' ')[0]}</p>
                <p className="text-[8px] font-bold text-emerald-500 tracking-[0.2em]">SYNCED</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border border-blue-100 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
            >
              <LogIn size={16} />
              <span className="hidden md:inline">Login</span>
            </button>
          )}

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 ml-4">
            <DesktopNavButton active={view === 'billing'} onClick={() => setView('billing')} icon={<LayoutGrid size={20} />} label="POS" />
            <DesktopNavButton active={view === 'insights'} onClick={() => setView('insights')} icon={<BarChart3 size={20} />} label="Stats" />
            <DesktopNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={20} />} label="Config" />
          </nav>
        </div>
      </div>
    </header>
  );
}
