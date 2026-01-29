"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, Menu, X, User, LogOut, History, Moon, Sun, Building2 } from "lucide-react";
import { Tooltip } from "@mui/material";
import { useDarkMode } from "../../lib/dark-mode-context";
import { getUsername, logout } from "../../lib/auth";

export const Navbar = () => {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { darkMode, setDarkMode } = useDarkMode();
    const [username, setUsername] = useState("");

    useEffect(() => {
        const user = getUsername();
        if (user) {
            setUsername(user);
        }
    }, []);

    const handleLogout = () => {
        logout();
        window.location.href = "/auth/login";
    };

    const navItems = [
        {
            label: "Profile",
            icon: <User size={18} />,
            action: () => router.push("/dashboard/profile"),
            color: "text-blue-400"
        },
        {
            label: "History",
            icon: <History size={18} />,
            action: () => router.push("/dashboard/history"),
            color: "text-purple-400"
        }
    ];

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`
        relative z-50 w-full px-6 py-4
        flex items-center justify-between
        bg-white/5 dark:bg-slate-900/90
        backdrop-blur-xl border-b border-white/10 dark:border-slate-800/50
        shadow-lg
      `}
        >
            {/* Logo Section */}
            <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => router.push("/dashboard")}>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-800 to-black rounded-xl opacity-50 group-hover:opacity-100 transition duration-200 blur"></div>
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-black flex items-center justify-center text-white shadow-lg shadow-black/20">
                        <Building2 size={20} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-black dark:text-white leading-none tracking-tight">
                        RGCIRC
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        RecoWiz Dashboard
                    </span>
                </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
                {/* User Greeting */}
                {username && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-4 py-1.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Hello, {username}
                        </span>
                    </motion.div>
                )}

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                {/* Navigation Items */}
                {navItems.map((item, idx) => (
                    <Tooltip key={idx} title={item.label} arrow>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={item.action}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl
                hover:bg-slate-100 dark:hover:bg-slate-800
                transition-all duration-200
                font-medium text-sm
                text-slate-600 dark:text-slate-300
                group
              `}
                        >
                            <span className={`group-hover:${item.color} transition-colors`}>
                                {item.icon}
                            </span>
                            {item.label}
                        </motion.button>
                    </Tooltip>
                ))}

                {/* Dark Mode Toggle */}
                <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"} arrow>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-colors"
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </motion.button>
                </Tooltip>

                {/* Logout Button */}
                <Tooltip title="Logout" arrow>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium text-sm transition-all"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </motion.button>
                </Tooltip>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden md:hidden shadow-xl"
                    >
                        <div className="p-4 flex flex-col gap-2">
                            {username && (
                                <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-2">
                                    Signed in as <span className="font-bold text-slate-700 dark:text-slate-200">{username}</span>
                                </div>
                            )}

                            {navItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        item.action();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}

                            <button
                                onClick={() => {
                                    setDarkMode(!darkMode);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                                {darkMode ? "Light Mode" : "Dark Mode"}
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors mt-2"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};
