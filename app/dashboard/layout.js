"use client";

import React from "react";
import { DarkModeProvider } from "../../lib/dark-mode-context";

export default function DashboardLayout({ children }) {
  return <DarkModeProvider>{children}</DarkModeProvider>;
}

