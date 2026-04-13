"use client";

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Moon, Sun, Database, Calendar } from 'lucide-react';
import { getUsername } from '../../../lib/auth';

const AdminTopNav = ({ darkMode, toggleDarkMode, selectedRun, onRunChange, runs = [], loadingRuns = false }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const username = mounted ? getUsername() : '';

  return (
    <header className={`h-20 ${darkMode ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'} sticky top-0 z-30 transition-colors duration-300`}>
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-6 flex-1">
          {/* Run Selector */}
          <div className="relative flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-transparent focus-within:border-indigo-500 transition-all">
            <Database className="text-indigo-500 shrink-0" size={18} />
            <select
              value={selectedRun || ''}
              onChange={(e) => onRunChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer min-w-[200px] max-w-[280px]"
            >
              <option value="" disabled>
                {loadingRuns ? 'Loading runs...' : runs.length === 0 ? 'No runs found' : 'Select a Run'}
              </option>
              {runs.map((run) => (
                <option key={run.run_id} value={run.run_id}>
                  {run.run_id.substring(0, 12)} — {new Date(run.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
            <Calendar className="text-slate-400 shrink-0" size={16} />
          </div>

          {/* Search */}
          <div className="relative hidden lg:block max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search data, claims, or TPAs..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-900 placeholder:text-slate-400'} border-transparent focus:border-indigo-500 focus:ring-0 transition-all text-sm`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-xl ${darkMode ? 'bg-indigo-500/20 text-yellow-400 border border-indigo-500/30' : 'bg-slate-100 text-slate-600 border border-transparent'} hover:scale-110 transition-all shadow-sm`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notification */}
          <button className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} relative hover:scale-110 transition-all`}>
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

          {/* User */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{mounted ? (username || 'Admin User') : 'Admin User'}</p>
              <p className="text-xs text-indigo-500 font-semibold">Administrator</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <User size={20} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopNav;
