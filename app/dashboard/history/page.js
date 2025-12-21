"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
import { WobbleCard } from "../../../components/ui/wobble-card";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MuiTooltip from "@mui/material/Tooltip";
import { useDarkMode } from "../../../lib/dark-mode-context";

const PowerIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
    </svg>
);

const NavbarSparkles = React.memo(() => (
    <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        pointerEvents: "none",
        zIndex: 1
    }}>
        <SparklesCore
            id="navbar-sparkles"
            background="transparent"
            minSize={0.1}
            maxSize={0.8}
            particleDensity={100}
            className="w-full h-full"
            particleColor="#FFFFFF"
        />
    </div>
));

const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
};

export default function HistoryPage() {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const router = useRouter();
    const [username, setUsername] = useState("");
    const { darkMode, setDarkMode } = useDarkMode();

    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState({});

    const theme = {
        bg: darkMode ? "#0f172a" : "#ffffff",
        cardBg: darkMode ? "#1e293b" : "#ffffff",
        text: darkMode ? "#f1f5f9" : "#000000",
        textSecondary: darkMode ? "#94a3b8" : "#666666",
        border: darkMode ? "#334155" : "#e0e0e0",
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/auth/login");
        } else {
            const user = getUsername();
            setUsername(user || "User");
            fetchHistory();
        }
    }, [router]);

    const fetchHistory = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await authenticatedFetch(
                `${API_BASE.replace(/\/$/, "")}/reconciliations/history?limit=50`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch history");
            }

            const data = await response.json();
            setReconciliations(data);
        } catch (err) {
            console.error("[History] Error:", err);
            setError(err.message || "Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Stats
    const totalRecons = reconciliations.length;
    const totalAmountProcessed = reconciliations.reduce((acc, curr) => acc + (curr.summary?.total_amount || 0), 0);
    const uniquePatientsProcessed = reconciliations.reduce((acc, curr) => acc + (curr.summary?.unique_patients || 0), 0);

    const downloadZip = async (runId) => {
        setDownloading(prev => ({ ...prev, [runId]: true }));

        try {
            const response = await authenticatedFetch(
                `${API_BASE.replace(/\/$/, "")}/reconciliations/${runId}/download-zip`
            );

            if (!response.ok) {
                throw new Error("Download failed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${runId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("[Download] Error:", err);
            alert("Download failed. Please try again.");
        } finally {
            setDownloading(prev => ({ ...prev, [runId]: false }));
        }
    };

    const deleteReconciliation = async (runId) => {
        if (!confirm("Are you sure you want to delete this reconciliation? This cannot be undone.")) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                `${API_BASE.replace(/\/$/, "")}/reconciliations/${runId}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            // Refresh list
            setReconciliations(prev => prev.filter(r => r.run_id !== runId));
        } catch (err) {
            console.error("[Delete] Error:", err);
            alert("Delete failed. Please try again.");
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = "/auth/login";
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div style={{
            background: theme.bg,
            minHeight: "100vh",
            transition: "background 0.3s ease",
            overflowX: "hidden"
        }}>
            {/* Navbar */}
            <div style={{ position: "relative", overflow: "hidden", height: "60px", isolation: "isolate" }}>
                <nav style={{
                    background: darkMode ? "#0f172a" : "#111111",
                    color: "#fff",
                    padding: "12px 24px",
                    borderRadius: "0 0 6px 6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "100%",
                    position: "relative",
                    zIndex: 10
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bolder" }}>RGCIRC</h1>
                            <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0 }}>Reconciliation History</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <MuiTooltip title="Back to Dashboard" arrow>
                            <button
                                onClick={() => router.push("/dashboard")}
                                style={{
                                    padding: "8px 16px",
                                    background: "rgba(255,255,255,0.1)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6
                                }}
                            >
                                <span>←</span>
                                Dashboard
                            </button>
                        </MuiTooltip>

                        <MuiTooltip title="View Profile" arrow>
                            <button
                                onClick={() => router.push("/dashboard/profile")}
                                style={{
                                    background: "rgba(255,255,255,0.1)",
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6
                                }}
                            >
                                👤 {username}
                            </button>
                        </MuiTooltip>

                        <MuiTooltip title={darkMode ? "Light Mode" : "Dark Mode"} arrow>
                            <IconButton
                                onClick={() => setDarkMode(!darkMode)}
                                style={{
                                    color: "white",
                                    background: "rgba(255,255,255,0.1)",
                                    padding: "8px",
                                    width: "40px",
                                    height: "40px"
                                }}
                            >
                                <span style={{ fontSize: "20px" }}>{darkMode ? "☀️" : "🌙"}</span>
                            </IconButton>
                        </MuiTooltip>

                        <MuiTooltip title="Logout" arrow>
                            <IconButton
                                onClick={handleLogout}
                                style={{
                                    color: "white",
                                    background: "rgba(255,0,0,0.2)",
                                    padding: "8px",
                                    width: "40px",
                                    height: "40px"
                                }}
                            >
                                <PowerIcon />
                            </IconButton>
                        </MuiTooltip>
                    </div>
                </nav>

                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 5
                }}>
                    <NavbarSparkles />
                </div>
            </div>

            <main style={{
                margin: "0 auto",
                maxWidth: "1400px",
                width: "100%",
                padding: "24px 16px",
                boxSizing: "border-box"
            }}>

                {/* Header & Summary */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <div>
                            <Typography variant="h4" style={{ fontWeight: 800, color: theme.text, marginBottom: 4, letterSpacing: "-0.5px" }}>
                                📚 Reconciliation History
                            </Typography>
                            <Typography variant="body1" style={{ color: theme.textSecondary }}>
                                Track and manage your past reconciliation runs
                            </Typography>
                        </div>
                        <button
                            onClick={fetchHistory}
                            style={{
                                padding: "12px 24px",
                                background: darkMode ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.5)",
                                backdropFilter: "blur(12px)",
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                                borderRadius: "12px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            🔄 Refresh List
                        </button>
                    </div>

                    {/* Summary Cards */}
                    {!loading && !error && reconciliations.length > 0 && (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: "20px",
                            marginBottom: 40
                        }}>
                            <WobbleCard
                                containerClassName="col-span-1 h-full bg-pink-800 min-h-[160px] lg:min-h-[200px]"
                                className=""
                            >
                                <div className="max-w-xs">
                                    <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                                        {totalRecons}
                                    </h2>
                                    <p className="mt-4 text-left  text-base/6 text-neutral-200">
                                        Total Reconciliations
                                    </p>
                                </div>
                            </WobbleCard>
                            <WobbleCard containerClassName="col-span-1 min-h-[160px] bg-blue-900 lg:min-h-[200px]">
                                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                                    ₹{(totalAmountProcessed / 10000000).toFixed(2)} Cr+
                                </h2>
                                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                                    Total Amount Processed
                                </p>
                            </WobbleCard>
                            <WobbleCard containerClassName="col-span-1 min-h-[160px] bg-emerald-900 lg:min-h-[200px]">
                                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                                    {uniquePatientsProcessed.toLocaleString()}
                                </h2>
                                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                                    Unique Patients Reconciled
                                </p>
                            </WobbleCard>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{
                        textAlign: "center",
                        padding: "48px",
                        color: theme.textSecondary
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                        <Typography variant="h6" style={{ color: theme.text }}>Loading history...</Typography>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div style={{
                        background: darkMode ? "rgba(127, 29, 29, 0.2)" : "rgba(254, 242, 242, 0.5)",
                        backdropFilter: "blur(12px)",
                        border: `1px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
                        borderRadius: 24,
                        padding: 40,
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <Typography variant="h5" style={{ color: darkMode ? "#fecaca" : "#dc2626", marginBottom: 8, fontWeight: 700 }}>
                            Failed to Load History
                        </Typography>
                        <Typography variant="body1" style={{ color: darkMode ? "#fca5a5" : "#7f1d1d" }}>
                            {error}
                        </Typography>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && reconciliations.length === 0 && (
                    <div style={{
                        background: darkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.6)",
                        backdropFilter: "blur(12px)",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 24,
                        padding: 60,
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: 80, marginBottom: 24 }}>📂</div>
                        <Typography variant="h4" style={{ color: theme.text, marginBottom: 12, fontWeight: 700 }}>
                            No Reconciliations Yet
                        </Typography>
                        <Typography variant="body1" style={{ color: theme.textSecondary, marginBottom: 32, fontSize: 18 }}>
                            Complete your first reconciliation to see it here!
                        </Typography>
                        <button
                            onClick={() => router.push("/dashboard")}
                            style={{
                                padding: "16px 32px",
                                background: "linear-gradient(135deg, #667eea, #764ba2)",
                                color: "white",
                                border: "none",
                                borderRadius: "16px",
                                cursor: "pointer",
                                fontSize: "18px",
                                fontWeight: 600,
                                boxShadow: "0 10px 25px -5px rgba(118, 75, 162, 0.4)",
                                transition: "transform 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            Start Reconciliation
                        </button>
                    </div>
                )}

                {/* Reconciliation Grid */}
                {!loading && !error && reconciliations.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                        gap: 24
                    }}>
                        {reconciliations.map((recon) => (
                            <div
                                key={recon.run_id}
                                style={{
                                    background: darkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)",
                                    backdropFilter: "blur(12px)",
                                    border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                                    borderRadius: 24,
                                    padding: 24,
                                    boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)",
                                    transition: "all 0.3s ease",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.boxShadow = darkMode ? "0 12px 30px rgba(0,0,0,0.3)" : "0 12px 30px rgba(0,0,0,0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)";
                                }}
                            >
                                {/* Card Header */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                                        <div style={{
                                            padding: "6px 12px",
                                            background: recon.bank_type === "ICICI"
                                                ? "linear-gradient(135deg, #bf2a2a, #e63946)"
                                                : "linear-gradient(135deg, #871f42, #be185d)",
                                            color: "white",
                                            borderRadius: "100px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                                        }}>
                                            {recon.bank_type}
                                        </div>
                                        <button
                                            onClick={() => deleteReconciliation(recon.run_id)}
                                            style={{
                                                padding: "8px",
                                                background: "transparent",
                                                color: theme.textSecondary,
                                                border: "none",
                                                cursor: "pointer",
                                                opacity: 0.6,
                                                transition: "opacity 0.2s"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <Typography variant="h6" style={{ fontWeight: 700, color: theme.text, fontSize: 18, marginBottom: 4 }}>
                                        {formatDate(recon.timestamp)}
                                    </Typography>
                                    {recon.tpa_name && (
                                        <Typography variant="body2" style={{ color: theme.textSecondary, fontSize: 14 }}>
                                            {recon.tpa_name}
                                        </Typography>
                                    )}
                                </div>

                                {/* Stats Grid */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                    marginBottom: 24
                                }}>
                                    <div style={{
                                        padding: 12,
                                        background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                                        borderRadius: 12
                                    }}>
                                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>Total Amount</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                                            ₹{(recon.summary.total_amount / 100000).toFixed(2)} L
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 12,
                                        background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                                        borderRadius: 12
                                    }}>
                                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>Matches</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>
                                            {recon.summary.step2_matches}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 12,
                                        background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                                        borderRadius: 12
                                    }}>
                                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>Outstanding</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
                                            {recon.summary.step4_outstanding}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 12,
                                        background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                                        borderRadius: 12
                                    }}>
                                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>Patients</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                                            {recon.summary.unique_patients}
                                        </div>
                                    </div>
                                </div>

                                {/* Download Button */}
                                <button
                                    onClick={() => downloadZip(recon.run_id)}
                                    disabled={downloading[recon.run_id]}
                                    style={{
                                        width: "100%",
                                        padding: "14px",
                                        background: downloading[recon.run_id]
                                            ? (darkMode ? "#334155" : "#e5e7eb")
                                            : "linear-gradient(135deg, #3b82f6, #2563eb)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "12px",
                                        cursor: downloading[recon.run_id] ? "wait" : "pointer",
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        boxShadow: downloading[recon.run_id] ? "none" : "0 4px 12px rgba(37, 99, 235, 0.3)",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!downloading[recon.run_id]) {
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!downloading[recon.run_id]) {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                                        }
                                    }}
                                >
                                    {downloading[recon.run_id] ? "⏳" : "📦"}
                                    {downloading[recon.run_id] ? "Downloading..." : "Download Package"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}