"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from './api-client';

const AdminContext = createContext({
  selectedRunId: null,
  setSelectedRunId: () => {},
  runs: [],
  loadingRuns: true,
});

export const AdminProvider = ({ children }) => {
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  // Load last selected run from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('last_admin_run_id');
    if (saved) setSelectedRunId(saved);
  }, []);

  // Fetch all runs
  useEffect(() => {
    const fetchRuns = async () => {
      setLoadingRuns(true);
      try {
        const res = await apiClient.get('/reconciliations/history?limit=50');
        const data = res.data || [];
        setRuns(data);
        // Auto-select latest if nothing saved
        if (!selectedRunId && data.length > 0) {
          const latest = data[0].run_id;
          setSelectedRunId(latest);
          localStorage.setItem('last_admin_run_id', latest);
        }
      } catch (e) {
        console.error('[AdminContext] Failed to fetch runs:', e);
      } finally {
        setLoadingRuns(false);
      }
    };
    fetchRuns();
  }, []);

  const handleRunChange = (runId) => {
    setSelectedRunId(runId);
    localStorage.setItem('last_admin_run_id', runId);
  };

  return (
    <AdminContext.Provider value={{ selectedRunId, setSelectedRunId: handleRunChange, runs, loadingRuns }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
