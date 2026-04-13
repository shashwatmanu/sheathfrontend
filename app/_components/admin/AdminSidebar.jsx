"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Table, 
  Activity, 
  ShieldAlert, 
  LogOut, 
  ArrowLeftCircle,
  Settings,
  Database
} from 'lucide-react';
import { logout } from '../../../lib/auth';

const SidebarLink = ({ href, icon: Icon, label, active, darkMode }) => (
  <Link 
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-1' 
        : `${darkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`
    }`}
  >
    <Icon size={20} className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
    <span className="text-sm tracking-wide">{label}</span>
  </Link>
);

const AdminSidebar = ({ darkMode }) => {
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  const navItems = [
    { href: '/admin/summary', icon: BarChart3, label: 'Executive Summary' },
    { href: '/admin/operations', icon: Table, label: 'Operations Review' },
    { href: '/admin/diagnostics', icon: Activity, label: 'Diagnostics' },
  ];

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-64 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-r z-40 transition-colors duration-300 flex flex-col`}>
      <div className="p-8">
        <Link href="/admin/summary" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">Admin</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mt-1">Control Center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Dashboard</p>
        </div>
        {navItems.map((item) => (
          <SidebarLink 
            key={item.href} 
            {...item} 
            active={pathname === item.href} 
            darkMode={darkMode}
          />
        ))}

        <div className="pt-8 px-4 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Config</p>
        </div>
        <SidebarLink 
          href="/admin/mappings" 
          icon={Database} 
          label="Field Mappings" 
          active={pathname === '/admin/mappings'} 
          darkMode={darkMode}
        />
        <SidebarLink 
          href="/admin/settings" 
          icon={Settings} 
          label="System Settings" 
          active={pathname === '/admin/settings'} 
          darkMode={darkMode}
        />
      </nav>

      <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
        <Link 
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${
            darkMode 
              ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' 
              : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <ArrowLeftCircle size={20} />
          <span className="text-sm">Exit to User App</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
            darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <LogOut size={20} />
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
