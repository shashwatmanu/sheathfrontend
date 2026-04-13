"use client";

import React from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminTopNav from './AdminTopNav.jsx';
import { useDarkMode } from '../../../lib/dark-mode-context.js';
import { AdminProvider, useAdmin } from '../../../lib/admin-context.js';

// Inner layout that can access both contexts
const AdminLayoutInner = ({ children }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { selectedRunId, setSelectedRunId, runs, loadingRuns } = useAdmin();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      <AdminSidebar darkMode={darkMode} />
      <div className="flex flex-col min-h-screen ml-64">
        <AdminTopNav
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          selectedRun={selectedRunId}
          onRunChange={setSelectedRunId}
          runs={runs}
          loadingRuns={loadingRuns}
        />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminLayout = ({ children }) => {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
};

export default AdminLayout;
