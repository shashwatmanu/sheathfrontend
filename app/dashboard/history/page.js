"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername, authenticatedFetch, getStoredProfile, isAdmin, getUserProfile } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
import { SparklesCard } from "../../../components/ui/sparkles-card";
import { GlassCard } from "../../../components/ui/glass-card";
import { useDarkMode } from "../../../lib/dark-mode-context";
import Lottie from "lottie-react";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ReconciliationFilesModal from "../../../components/ReconciliationFilesModal";
import ExcelModalViewer from "../../../components/ExcelModalViewer";

export default function HistoryPage() {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const router = useRouter();
    const [username, setUsername] = useState("");
    const { darkMode } = useDarkMode();
    const [userIsAdmin, setUserIsAdmin] = useState(false);

    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState({});
    const [animationData, setAnimationData] = useState(null);
    const [selectedUser, setSelectedUser] = useState("all");
    const [uniqueUsers, setUniqueUsers] = useState([]);
    const [filesModalOpen, setFilesModalOpen] = useState(false);
    const [selectedReconciliation, setSelectedReconciliation] = useState(null);
    const [filesByRunId, setFilesByRunId] = useState({});
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [dataModalOpen, setDataModalOpen] = useState(false);
    const [currentFileUrl, setCurrentFileUrl] = useState("");
    const [currentFileName, setCurrentFileName] = useState("");

    useEffect(() => {
        fetch('/animations/loading.json')
            .then(response => response.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load animation:', err));
    }, []);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/auth/login");
        } else {
            const user = getUsername();
            setUsername(user || "User");

            // Check if user is admin
            const adminStatus = isAdmin();
            setUserIsAdmin(adminStatus);
            console.log("[History] User is admin:", adminStatus);

            // Pass admin status directly to avoid race condition with state
            fetchHistory(adminStatus);
        }
    }, [router]);

    const fetchHistory = async (adminStatusOverride) => {
        setLoading(true);
        setError("");

        try {
            // Use the passed parameter if available, otherwise use state
            const isAdminUser = adminStatusOverride !== undefined ? adminStatusOverride : userIsAdmin;

            // Use admin endpoint if user is admin
            const endpoint = isAdminUser
                ? `${API_BASE.replace(/\/$/, "")}/admin/reconciliations/history?limit=50`
                : `${API_BASE.replace(/\/$/, "")}/reconciliations/history?limit=50`;

            console.log("[History] Fetching from endpoint:", endpoint);
            console.log("[History] Using admin status:", isAdminUser);
            const response = await authenticatedFetch(endpoint);

            if (!response.ok) {
                throw new Error("Failed to fetch history");
            }

            const data = await response.json();
            console.log("[History] Loaded reconciliations:", data.length);
            setReconciliations(data);

            // Extract unique usernames for filter dropdown (admin only)
            if (isAdminUser) {
                const users = [...new Set(data.map(r => r.username).filter(Boolean))];
                setUniqueUsers(users.sort());
            }
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
            // Use admin endpoint if user is admin
            const endpoint = userIsAdmin
                ? `${API_BASE.replace(/\/$/, "")}/admin/reconciliations/${runId}/download-zip`
                : `${API_BASE.replace(/\/$/, "")}/reconciliations/${runId}/download-zip`;

            const response = await authenticatedFetch(endpoint);

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

    const fetchFiles = async (runId) => {
        if (filesByRunId[runId]) {
            return; // Already fetched
        }

        try {
            const endpoint = userIsAdmin
                ? `${API_BASE.replace(/\/$/, "")}/admin/reconciliations/${runId}/files`
                : `${API_BASE.replace(/\/$/, "")}/reconciliations/${runId}/files`;

            const response = await authenticatedFetch(endpoint);

            if (!response.ok) {
                throw new Error("Failed to fetch files");
            }

            const data = await response.json();
            setFilesByRunId(prev => ({ ...prev, [runId]: data.files || {} }));
        } catch (err) {
            console.error("[Fetch Files] Error:", err);
            setFilesByRunId(prev => ({ ...prev, [runId]: {} }));
        }
    };

    const toggleCardExpansion = (runId) => {
        const isExpanding = !expandedCards[runId];
        setExpandedCards(prev => ({ ...prev, [runId]: isExpanding }));

        if (isExpanding) {
            fetchFiles(runId);
        }
    };

    const openFilesModal = async (reconciliation) => {
        setSelectedReconciliation(reconciliation);
        setFilesModalOpen(true);

        // Fetch files if not already cached
        if (!filesByRunId[reconciliation.run_id]) {
            setLoadingFiles(true);
            try {
                const endpoint = userIsAdmin
                    ? `${API_BASE.replace(/\/$/, "")}/admin/reconciliations/${reconciliation.run_id}/files`
                    : `${API_BASE.replace(/\/$/, "")}/reconciliations/${reconciliation.run_id}/files`;

                const response = await authenticatedFetch(endpoint);

                if (!response.ok) {
                    throw new Error("Failed to fetch files");
                }

                const data = await response.json();
                setFilesByRunId(prev => ({ ...prev, [reconciliation.run_id]: data.files || {} }));
            } catch (err) {
                console.error("[Fetch Files] Error:", err);
                setFilesByRunId(prev => ({ ...prev, [reconciliation.run_id]: {} }));
            } finally {
                setLoadingFiles(false);
            }
        }
    };

    const handleViewFile = async (fileUrl, fileName) => {
        // Close the files modal first
        setFilesModalOpen(false);

        // Set the file to view
        setCurrentFileUrl(fileUrl);
        setCurrentFileName(fileName);
        setDataModalOpen(true);
    };

    const handleCloseDataModal = () => {
        // Close the Excel viewer
        setDataModalOpen(false);
        setCurrentFileUrl("");
        setCurrentFileName("");

        // Reopen the files modal
        setFilesModalOpen(true);
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
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Header Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl">
                    {/* Background Sparkles */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <SparklesCore
                            id="history-header-sparkles"
                            background="transparent"
                            minSize={0.6}
                            maxSize={1.4}
                            particleDensity={100}
                            className="w-full h-full"
                            particleColor={darkMode ? "#FFFFFF" : "#000000"}
                        />
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:from-blue-900/10 dark:to-purple-900/10 backdrop-blur-[1px]" />

                    <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {userIsAdmin ? "🔧 Admin Dashboard - All Reconciliations" : "Reconciliation History"}
                            </h1>
                            <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
                                {userIsAdmin ? "View and manage reconciliations from all users" : "Track and manage your past reconciliation runs"}
                            </p>
                        </div>
                        <button
                            onClick={fetchHistory}
                            className="px-6 py-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 group"
                        >
                            <span className="group-hover:rotate-180 transition-transform duration-500">🔄</span>
                            Refresh List
                        </button>
                    </div>
                </div>

                {/* User Filter Dropdown (Admin Only) */}
                {userIsAdmin && !loading && !error && uniqueUsers.length > 0 && (
                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔍</span>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filter by User</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">View reconciliations from specific users</p>
                                </div>
                            </div>
                            <FormControl
                                className="flex-1 sm:max-w-xs"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: '12px',
                                        '& fieldset': {
                                            borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#6366f1',
                                        },
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: darkMode ? '#94a3b8' : '#64748b',
                                    },
                                    '& .MuiSelect-select': {
                                        color: darkMode ? '#f1f5f9' : '#0f172a',
                                        fontWeight: 600,
                                    },
                                }}
                            >
                                <InputLabel>Select User</InputLabel>
                                <Select
                                    value={selectedUser}
                                    label="Select User"
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <MenuItem value="all">
                                        <div className="flex items-center gap-2">
                                            <span>👥</span>
                                            <span className="font-semibold">All Users</span>
                                        </div>
                                    </MenuItem>
                                    {uniqueUsers.map((user) => (
                                        <MenuItem key={user} value={user}>
                                            <div className="flex items-center gap-2">
                                                <span>👤</span>
                                                <span>{user}</span>
                                            </div>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                {!loading && !error && reconciliations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SparklesCard
                            containerClassName="col-span-1 h-full"
                            className="p-6"
                        >
                            <div className="max-w-xs">
                                <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {totalRecons}
                                </h2>
                                <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                                    Total Reconciliations
                                </p>
                            </div>
                        </SparklesCard>

                        <SparklesCard containerClassName="col-span-1 min-h-[160px]" className="p-6">
                            <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                ₹{(totalAmountProcessed / 10000000).toFixed(2)} Cr+
                            </h2>
                            <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                                Total Amount Processed
                            </p>
                        </SparklesCard>

                        <SparklesCard containerClassName="col-span-1 min-h-[160px]" className="p-6">
                            <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {uniquePatientsProcessed.toLocaleString()}
                            </h2>
                            <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                                Unique Patients Reconciled
                            </p>
                        </SparklesCard>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-500 dark:text-slate-400">
                        <div className="w-48 h-48 mb-4">
                            {animationData && <Lottie animationData={animationData} loop={true} />}
                        </div>
                        <Typography variant="h6" className="text-slate-900 dark:text-slate-100 font-medium animate-pulse">
                            Loading history...
                        </Typography>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="max-w-2xl mx-auto mt-10 p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                            Failed to Load History
                        </h3>
                        <p className="text-red-600 dark:text-red-300 mb-6">
                            {error}
                        </p>
                        <button
                            onClick={fetchHistory}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-red-600/20"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && reconciliations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl">
                        <div className="text-6xl mb-6 opacity-50">📂</div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            No Reconciliations Yet
                        </h3>
                        <p className="text-lg mb-8 text-center max-w-md">
                            Complete your first reconciliation to see it here!
                        </p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                        >
                            Start Reconciliation
                        </button>
                    </div>
                )}

                {/* Reconciliation Grid */}
                {!loading && !error && reconciliations.length > 0 && (() => {
                    // Filter reconciliations based on selected user
                    const filteredReconciliations = selectedUser === "all"
                        ? reconciliations
                        : reconciliations.filter(r => r.username === selectedUser);

                    if (filteredReconciliations.length === 0) {
                        return (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl">
                                <div className="text-6xl mb-6 opacity-50">🔍</div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    No Reconciliations Found
                                </h3>
                                <p className="text-lg text-center max-w-md">
                                    No reconciliations found for user "{selectedUser}"
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredReconciliations.map((recon) => (
                                <div
                                    key={recon.run_id}
                                    className="group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 transition-all hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1"
                                >
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`
                                            px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg
                                            ${(recon.bank_type || "??") === "ICICI"
                                                    ? "bg-slate-600"
                                                    : "bg-slate-500"}
                                        `}>
                                                {recon.bank_type || "Unknown"}
                                            </div>
                                            {userIsAdmin && recon.username && (
                                                <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/90 text-white shadow-lg flex items-center gap-1">
                                                    👤 {recon.username}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => deleteReconciliation(recon.run_id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete Reconciliation"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                            {formatDate(recon.timestamp)}
                                        </h3>
                                        {recon.tpa_name && (
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                🏢 {recon.tpa_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Settled Claims</div>
                                            <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                                {recon.summary.step2_matches}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100/50 dark:border-amber-900/20">
                                            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Found in Outstanding</div>
                                            <div className="font-bold text-amber-700 dark:text-amber-300">
                                                {recon.summary.step4_outstanding}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => downloadZip(recon.run_id)}
                                            disabled={downloading[recon.run_id]}
                                            className={`
                                                flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md
                                                ${downloading[recon.run_id]
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait"
                                                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30"}
                                            `}
                                        >
                                            {downloading[recon.run_id] ? "⏳ Downloading..." : "📦 Download ZIP"}
                                        </button>
                                        <button
                                            onClick={() => openFilesModal(recon)}
                                            className="px-4 py-3 rounded-xl font-bold text-sm transition-all"
                                            style={{
                                                background: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                                color: darkMode ? '#60a5fa' : '#2563eb',
                                                border: `1px solid ${darkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                                            }}
                                        >
                                            📂 View Files
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Reconciliation Files Modal */}
                <ReconciliationFilesModal
                    open={filesModalOpen}
                    onClose={() => setFilesModalOpen(false)}
                    reconciliation={selectedReconciliation}
                    files={selectedReconciliation ? filesByRunId[selectedReconciliation.run_id] : null}
                    loading={loadingFiles}
                    darkMode={darkMode}
                    apiBase={API_BASE}
                    onViewFile={handleViewFile}
                />

                {/* Excel Modal Viewer */}
                <ExcelModalViewer
                    open={dataModalOpen}
                    onClose={handleCloseDataModal}
                    fileUrl={currentFileUrl}
                    filename={currentFileName}
                    darkMode={darkMode}
                    apiBase={API_BASE}
                />

            </div>
        </div >
    );
}