"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../../../lib/admin-context.js';
import apiClient from '../../../lib/api-client';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel
} from '@tanstack/react-table';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const styles = {
    'Needs Review': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'Matched': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles['Pending']}`}>
      {status}
    </span>
  );
};

const OperationsReview = () => {
  const { selectedRunId } = useAdmin();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('review'); // 'review' or 'final'
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (selectedRunId) {
          const collection = statusFilter === 'final' ? 'final' : 'review';
          const response = await apiClient.get(`/reconciliations/${selectedRunId}/data/${collection}?limit=1000`);
          if (response.data && response.data.length > 0) {
            setData(response.data);
            setLoading(false);
            return;
          }
        }
        
        // Mock fallback/simulation
        setTimeout(() => {
          const mockData = Array(50).fill(0).map((_, i) => ({
            'Patient Name': ['John Doe', 'Jane Smith', 'Robert Brown', 'Alice Wilson', 'Michael Knight'][i % 5],
            'UTR': `AXIS${10000 + i}`,
            'Claim Number': `CLM-${20000 + i}`,
            'Amount': 5000 + (i * 100),
            'Hospital Name': 'RGCIRC Main',
            'TPA': ['CARE', 'STAR', 'NIVA', 'HDFC'][i % 4],
            'Status': statusFilter === 'final' ? 'Matched' : 'Needs Review'
          }));
          setData(mockData);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Failed to fetch operational data:', error);
        setData([]);
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedRunId, statusFilter]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    // Core columns that should always be visible/first
    const baseKeys = Object.keys(data[0]);
    const priorityKeys = ['Patient Name', 'UTR', 'Claim Number', 'Amount', 'Hospital Name', 'TPA', 'Status'];
    
    return priorityKeys.filter(key => baseKeys.includes(key) || key === 'Status').map(key => ({
      header: key,
      accessorKey: key === 'Status' ? undefined : key,
      cell: info => {
        const value = info.getValue ? info.getValue() : null;
        if (key === 'Amount') {
          return <span className="font-bold text-slate-900 dark:text-white">₹ {Number(value).toLocaleString()}</span>;
        }
        if (key === 'Status') {
          return <StatusBadge status={value || (statusFilter === 'final' ? 'Matched' : 'Needs Review')} />;
        }
        if (key === 'UTR' || key === 'Claim Number') {
          return <code className="text-xs font-bold text-indigo-500 bg-indigo-500/5 px-2 py-1 rounded">{value}</code>;
        }
        return <span className="font-medium">{value}</span>;
      }
    }));
  }, [data, statusFilter]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `reconciliation_${statusFilter}_${selectedRunId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Operations Review</h2>
          <p className="text-slate-500 mt-1 font-medium italic">High-performance workspace for deep-dive reconciliation analysis.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm group"
          >
            <Download size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
            <span>Export CSV</span>
          </button>
          
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setStatusFilter('review')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'review' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Needs Review
            </button>
            <button 
              onClick={() => setStatusFilter('final')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'final' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Final Processed
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-10">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by patient name, UTR, or claim number..." 
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-sm transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-indigo-500 transition-colors">
            <Filter size={16} />
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                  {table.getHeaderGroups().map(headerGroup => (
                    headerGroup.headers.map(header => (
                      <th key={header.id} className="p-4 font-bold text-slate-400 text-[11px] uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))
                  ))}
                  <th className="p-4 font-bold text-slate-400 text-[11px] uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(columns.length).fill(0).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
                        </td>
                      ))}
                      <td className="p-4"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                      <td className="p-4 text-right">
                        <button className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-20 text-center">
                      <p className="font-bold text-slate-400 italic">No records found for this run/filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {table.getRowModel().rows.length} of {data.length} records
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OperationsReview;
