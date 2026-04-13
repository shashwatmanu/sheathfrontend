"use client";

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../../lib/admin-context.js';
import { 
  Activity, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  RefreshCw,
  Database
} from 'lucide-react';

const FunnelStep = ({ label, count, subtext, percentage, color, isLast }) => (
  <div className="flex items-center group">
    <div className="flex-1">
      <div className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden`}>
        {/* Progress background */}
        <div 
          className="absolute left-0 bottom-0 h-1 transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</span>
          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">{percentage}%</span>
        </div>
        
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black">{count.toLocaleString()}</h4>
          <span className="text-sm font-bold text-slate-500">rows</span>
        </div>
        <p className="text-xs font-medium text-slate-400 mt-1">{subtext}</p>
      </div>
    </div>
    
    {!isLast && (
      <div className="px-4 flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={32} className="text-slate-300" />
        <div className="w-1 h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
      </div>
    )}
  </div>
);

const LogEntry = ({ type, message, time }) => {
  const styles = {
    error: 'text-rose-500 bg-rose-500/5 border-rose-500/10',
    warning: 'text-amber-500 bg-amber-500/5 border-amber-500/10',
    info: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10',
    success: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
  };
  
  const icons = {
    error: <AlertTriangle size={14} />,
    warning: <AlertTriangle size={14} />,
    info: <Info size={14} />,
    success: <CheckCircle2 size={14} />,
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${styles[type]} mb-2 group hover:scale-[1.01] transition-transform`}>
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium leading-relaxed">{message}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-1">{time}</p>
      </div>
    </div>
  );
};

const ReconciliationDiagnostics = () => {
  const { selectedRunId } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [logFilter, setLogFilter] = useState('all');

  useEffect(() => {
    const fetchDiagnostics = async () => {
      if (!selectedRunId) return;
      setLoading(true);
      try {
        // Simulating diagnostics data load
        setTimeout(() => {
          setDiagnostics({
            funnel: [
              { label: 'Raw Bank Data', count: 12450, subtext: 'Initial statement import', percentage: 100, color: '#6366f1' },
              { label: 'Cleaned MIS', count: 11820, subtext: 'Sanitized & mapped', percentage: 95, color: '#8b5cf6' },
              { label: 'Matched Step 2', count: 9140, subtext: 'Rule-based matching', percentage: 74, color: '#ec4899' },
              { label: 'Final Step 4', count: 8820, subtext: 'Vetted & settled', percentage: 71, color: '#10b981' },
            ],
            logs: [
              { type: 'success', message: 'Reconciliation run completed successfully in 42.5s', time: '14:00:45' },
              { type: 'info', message: 'Exporting final results to MongoDB collection: reconciliations_final_20260319', time: '14:00:12' },
              { type: 'warning', message: 'Found 14 unmapped TPA columns in STAR HEALTH MIS. Falling back to default parser.', time: '13:59:55' },
              { type: 'error', message: 'Network timeout while fetching Axis Bank statement. Retrying (1/3)...', time: '13:59:10' },
              { type: 'info', message: 'Starting Stage 4 validation with 8,820 rows', time: '13:58:30' },
              { type: 'success', message: 'TPA Match Engine initialized with 5 active mappings', time: '13:58:12' },
              { type: 'info', message: 'Session started by admin_user', time: '13:58:01' },
            ]
          });
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Failed to fetch diagnostics:', error);
        setLoading(false);
      }
    };
    fetchDiagnostics();
  }, [selectedRunId]);

  return (
    <>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight">System Health & Diagnostics</h2>
          <p className="text-slate-500 mt-1 font-medium italic text-sm">Trace the reconciliation funnel and inspect system-level execution logs.</p>
        </div>
        <button className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 transition-all hover:rotate-180 duration-500">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Funnel Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Database className="text-indigo-500" size={24} />
          <h3 className="font-bold text-xl uppercase tracking-wider text-slate-400">Data Funnel Progression</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {diagnostics?.funnel.map((step, i) => (
            <FunnelStep 
              key={i} 
              {...step} 
              isLast={i === diagnostics.funnel.length - 1} 
            />
          ))}
        </div>
      </div>

      {/* Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
               <div className="flex items-center gap-3">
                 <Terminal className="text-emerald-500" size={20} />
                 <h3 className="font-bold text-lg text-white">Execution Logs</h3>
               </div>
               <div className="flex gap-2">
                 {['all', 'error', 'warning'].map(f => (
                   <button 
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${logFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                   >
                     {f}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="flex-1 overflow-auto custom-scrollbar pr-2 leading-relaxed">
               {diagnostics?.logs
                .filter(log => logFilter === 'all' || log.type === logFilter)
                .map((log, i) => (
                 <LogEntry key={i} {...log} />
               ))}
             </div>

             <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               <span>Live updates enabled</span>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span>Syncing with Gateway</span>
               </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Health Score */}
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-6">Recon Health Score</h3>
            <div className="relative inline-flex items-center justify-center mb-6">
               <svg className="w-32 h-32 transform -rotate-90">
                 <circle className="text-slate-100 dark:text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                 <circle className="text-indigo-500" strokeWidth="10" strokeDasharray={364} strokeDashoffset={364 - (364 * 0.94)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
               </svg>
               <span className="absolute text-3xl font-black">94<span className="text-sm text-slate-400 font-bold">%</span></span>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-4">System operating within optimal efficiency parameters.</p>
          </div>

          {/* Quick Stats */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Activity size={20} />
              <h3 className="font-bold text-[10px] uppercase tracking-widest">Quick Scan</h3>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                 <span className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Sync Latency</span>
                 <span className="text-sm font-black">142ms</span>
               </div>
               <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                 <span className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Memory Usage</span>
                 <span className="text-sm font-black">1.2 GB</span>
               </div>
               <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                 <span className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Collection Size</span>
                 <span className="text-sm font-black">4.8 GB</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReconciliationDiagnostics;
