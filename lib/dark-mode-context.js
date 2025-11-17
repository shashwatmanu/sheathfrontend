"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const DARK_MODE_STORAGE_KEY = "sheath_dark_mode";

const DarkModeContext = createContext({
  darkMode: false,
  setDarkMode: () => {},
  toggleDarkMode: () => {},
  ready: false,
});

export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedPreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (storedPreference !== null) {
        setDarkMode(storedPreference === "true");
      }
    } catch (error) {
      console.warn("[DarkMode] Unable to read from localStorage:", error);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, darkMode ? "true" : "false");
    } catch (error) {
      console.warn("[DarkMode] Unable to write to localStorage:", error);
    }
  }, [darkMode, ready]);

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      toggleDarkMode: () => setDarkMode((prev) => !prev),
      ready,
    }),
    [darkMode, ready]
  );

  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>;
};

export const useDarkMode = () => useContext(DarkModeContext);

