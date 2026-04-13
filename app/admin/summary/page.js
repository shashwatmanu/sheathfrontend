"use client";

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../../lib/admin-context.js';
import apiClient from '../../../lib/api-client';
import {
  TrendingUp, Users, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Loader2, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, trend, trendValue }) => (
  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
    <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</h3>
  </div>
);

const ExecutiveSummary = () => {
  const { selectedRunId, runs, loadingRuns } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState(null);

  useEffect(() => {
    if (loadingRuns) return; // Wait for runs to load first

    const buildData = () => {
      setLoading(true);
      try {
        // Find the current selected run
        const selectedRun = runs.find(r => r.run_id === selectedRunId) || runs[0];
        const s = selectedRun?.summary || {};

        const totalSettled = s.total_amount || s.total_value || 0;
        const matched = s.step2_matches || 0;
        const outstanding = s.step4_outstanding || 0;
        const successRate = matched + outstanding > 0 ? ((matched / (matched + outstanding)) * 100).toFixed(1) : '0.0';

        const stats = [
          {
            title: 'Total Settled Amount',
            value: totalSettled > 0 ? `₹ ${(totalSettled / 100000).toFixed(2)}L` : '— No Data',
            icon: TrendingUp,
            trend: 'up',
            trendValue: 'This Run'
          },
          {
            title: 'Claims Matched',
            value: matched > 0 ? matched.toLocaleString('en-IN') : '—',
            icon: CheckCircle2,
            trend: 'up',
            trendValue: `${successRate}%`
          },
          {
            title: 'Pending Review',
            value: outstanding > 0 ? outstanding.toLocaleString('en-IN') : '—',
            icon: AlertCircle,
            trend: outstanding > 0 ? 'down' : 'up',
            trendValue: outstanding > 0 ? 'Action Needed' : 'All Clear'
          },
          {
            title: 'Total Runs',
            value: runs.length.toString(),
            icon: Users,
            trend: 'up',
            trendValue: `${runs.length} in DB`
          },
        ];

        // Build TPA performance from all runs
        const tpaMap = {};
        runs.forEach(r => {
          const tpa = r.tpa_name || r.summary?.tpa_name || 'Unknown';
          if (!tpaMap[tpa]) tpaMap[tpa] = { name: tpa, matched: 0, total: 0 };
          const m = r.summary?.step2_matches || 0;
          const o = r.summary?.step4_outstanding || 0;
          tpaMap[tpa].matched += m;
          tpaMap[tpa].total += m + o;
        });
        const tpaPerformance = Object.values(tpaMap)
          .filter(t => t.total > 0)
          .map(t => ({
            name: t.name.length > 8 ? t.name.substring(0, 8) : t.name,
            matchRate: Math.round((t.matched / t.total) * 100),
            reviewRate: Math.round(((t.total - t.matched) / t.total) * 100),
          }))
          .slice(0, 6);

        // Settlement trend across runs
        const runTrend = [...runs].reverse().slice(-8).map(r => ({
          date: new Date(r.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          amount: parseFloat(((r.summary?.total_amount || r.summary?.total_value || 0) / 100000).toFixed(2)),
          matches: r.summary?.step2_matches || 0,
        }));

        setPageData({ stats, tpaPerformance, runTrend });
      } finally {
        setLoading(false);
      }
    };

    buildData();
  }, [selectedRunId, runs, loadingRuns]);

  if (loading || loadingRuns) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
          {loadingRuns ? 'Fetching reconciliation runs...' : 'Building dashboard...'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-black tracking-tight">Executive Summary</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm italic">
          High-level performance overview — showing data for run <code className="text-indigo-500">{selectedRunId?.substring(0, 12) || 'N/A'}</code>
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {pageData?.stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* TPA Performance Chart */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">TPA Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">Match vs Review rate across all runs</p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-indigo-500"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></div> Matched</span>
              <span className="flex items-center gap-1.5 text-rose-500"><div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div> Review</span>
            </div>
          </div>
          {pageData?.tpaPerformance?.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageData.tpaPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} unit="%" />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: 12 }}
                    formatter={(v) => [`${v}%`]}
                  />
                  <Bar dataKey="matchRate" name="Match Rate" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="reviewRate" name="Review Rate" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 italic text-sm">
              No TPA data available across runs yet.
            </div>
          )}
        </div>

        {/* Settlement Trend */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Settlement Growth</h3>
              <p className="text-xs text-slate-400 mt-0.5">Amount settled across last {pageData?.runTrend?.length} runs (in Lakhs ₹)</p>
            </div>
          </div>
          {pageData?.runTrend?.some(r => r.amount > 0) ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pageData.runTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} unit="L" />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: 12 }}
                    formatter={(v) => [`₹ ${v}L`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Settled Amount"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 italic text-sm">
              No settlement amount data found in runs.
            </div>
          )}
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <h3 className="font-bold text-lg mb-6">Recent Reconciliation Runs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 pt-2 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Run ID</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Timestamp</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 text-[10px] uppercase tracking-widest">TPA</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">Match Rate</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">No reconciliation history found.</td>
                </tr>
              ) : runs.map((run) => {
                const m = run.summary?.step2_matches || 0;
                const o = run.summary?.step4_outstanding || 0;
                const rate = m + o > 0 ? Math.round((m / (m + o)) * 100) : 0;
                const isSelected = run.run_id === selectedRunId;
                return (
                  <tr key={run.run_id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}>
                    <td className="py-3.5">
                      <span className={`font-mono text-xs font-bold ${isSelected ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {run.run_id.substring(0, 16)}…
                      </span>
                    </td>
                    <td className="py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {new Date(run.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <div>{run.tpa_name || run.summary?.tpa_name || '—'}</div>
                      {run.summary?.bank_file_dates && Object.keys(run.summary.bank_file_dates).length > 0 && (
                        <div className="text-[10px] text-indigo-500 font-black mt-1 flex items-center gap-1">
                          <span>📅</span>
                          {Object.values(run.summary.bank_file_dates).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{rate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => window.location.href = `/admin/operations?run=${run.run_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all"
                      >
                        <ExternalLink size={12} />
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ExecutiveSummary;
