"use client";

import React from "react";
import { DarkModeProvider } from "../../lib/dark-mode-context";
import { Navbar } from "../../components/ui/Navbar";

export default function DashboardLayout({ children }) {
  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Navbar />
        {children}
      </div>
    </DarkModeProvider>
  );
}

