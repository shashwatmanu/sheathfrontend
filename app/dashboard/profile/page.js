"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
import { WobbleCard } from "../../../components/ui/wobble-card";
import { SparklesCard } from "../../../components/ui/sparkles-card";
import { GlassCard } from "../../../components/ui/glass-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Typography from "@mui/material/Typography";
import { useDarkMode } from "../../../lib/dark-mode-context";
import Lottie from "lottie-react";

const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('access_token');

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers: headers,
  });
};

export default function ProfilePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const router = useRouter();
  const [username, setUsername] = useState("");
  const { darkMode } = useDarkMode();
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('/animations/loading.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  // Profile data state
  const [stats, setStats] = useState(null);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState({});

  // Change password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Email verification state
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("[Profile] Not authenticated, redirecting to login");
      router.push("/auth/login");
    } else {
      const user = getUsername();
      setUsername(user || "User");
      console.log("[Profile] Authenticated as:", user);
      fetchProfileData();
      fetchVerificationStatus();
    }
  }, [router]);

  const fetchVerificationStatus = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/auth/verification-status`);
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
        console.log("[Verification] Status:", data);
      }
    } catch (err) {
      console.error("[Verification] Error fetching status:", err);
    }
  };

  const fetchProfileData = async () => {
    setLoading(true);
    setError("");

    try {
      const statsRes = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/profile/stats`);
      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      const dailyRes = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/profile/daily?days=30`);
      if (!dailyRes.ok) throw new Error("Failed to fetch daily activity");
      const dailyData = await dailyRes.json();
      setDailyActivity(dailyData);

      const activityRes = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/profile/activity?limit=10`);
      if (!activityRes.ok) throw new Error("Failed to fetch activity");
      const activityData = await activityRes.json();
      setRecentActivity(activityData);

    } catch (err) {
      console.error("[Profile] Error:", err);
      setError(err.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    setSendingVerification(true);
    setVerificationMessage("");

    try {
      const response = await authenticatedFetch(
        `${API_BASE.replace(/\/$/, "")}/auth/send-verification-email`,
        { method: "POST" }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.status === "success") {
          setVerificationMessage("✅ Verification email sent! Check your inbox.");
        } else if (data.status === "already_verified") {
          setVerificationMessage("✅ Your email is already verified!");
        } else {
          setVerificationMessage("⚠️ Token generated but email not sent. Check server logs.");
        }
      } else {
        setVerificationMessage(`❌ ${data.detail || "Failed to send verification email"}`);
      }
    } catch (err) {
      console.error("[Verification] Error:", err);
      setVerificationMessage("❌ Network error. Please try again.");
    } finally {
      setSendingVerification(false);
    }
  };

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);

    try {
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const response = await authenticatedFetch(
        `${API_BASE.replace(/\/$/, "")}/auth/change-password`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to change password");
      }

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Close modal after 2 seconds
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess("");
      }, 2000);

    } catch (err) {
      console.error("[Change Password] Error:", err);
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
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

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400">
            <div className="w-48 h-48 mb-4">
              {animationData && <Lottie animationData={animationData} loop={true} />}
            </div>
            <Typography variant="h6" className="text-slate-900 dark:text-slate-100 font-medium animate-pulse">
              Loading profile...
            </Typography>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-2xl mx-auto mt-20 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <Typography variant="h6" className="text-red-700 dark:text-red-400 font-bold mb-2">
              Failed to Load Profile
            </Typography>
            <Typography variant="body2" className="text-red-600 dark:text-red-300 mb-4">
              {error}
            </Typography>
            <button
              onClick={fetchProfileData}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-red-600/20"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl">
              {/* Background Sparkles */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <SparklesCore
                  id="profile-header-sparkles"
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

              <div className="relative z-10 p-8 md:p-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full opacity-50 group-hover:opacity-100 transition duration-200 blur"></div>
                      <div className="relative w-24 h-24 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-5xl border border-white/50 dark:border-white/10 shadow-xl">
                        👤
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {username}
                      </h1>
                      <p className="mt-1 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                        <span>Member since</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 text-sm">
                          {new Date(stats.last_activity || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setPasswordModalOpen(true)}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group backdrop-blur-sm"
                    >
                      <span className="group-hover:scale-110 transition-transform">🔒</span>
                      Change Password
                    </button>

                    {verificationStatus && verificationStatus.has_email && (
                      <div className={`
                        flex-1 md:flex-none px-5 py-2.5 rounded-xl border flex items-center justify-center gap-3 shadow-sm backdrop-blur-sm
                        ${verificationStatus.email_verified
                          ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/50 text-amber-700 dark:text-amber-400"}
                      `}>
                        <span className="text-lg">
                          {verificationStatus.email_verified ? "✅" : "⚠️"}
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold text-sm">
                            {verificationStatus.email_verified ? "Verified" : "Unverified"}
                          </span>
                          <span className="text-[10px] opacity-80 font-mono">
                            {verificationStatus.email}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Verification Action */}
                {verificationStatus && verificationStatus.has_email && !verificationStatus.email_verified && (
                  <div className="mt-8 p-4 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 backdrop-blur-sm">
                    <div className="p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl text-2xl">📧</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Verify your email address</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        We sent a verification link to <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{verificationStatus.email}</span>.
                      </p>
                    </div>
                    <button
                      onClick={sendVerificationEmail}
                      disabled={sendingVerification}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-500/90 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-70 disabled:cursor-wait whitespace-nowrap"
                    >
                      {sendingVerification ? "Sending..." : "Resend Link"}
                    </button>
                  </div>
                )}

                {verificationMessage && (
                  <div className="mt-4 p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg text-sm text-center font-medium text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                    {verificationMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SparklesCard
                containerClassName="col-span-1 h-full"
                className="p-6"
              >
                <div className="max-w-xs">
                  <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {stats.total_reconciliations}
                  </h2>
                  <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                    Total Reconciliations
                  </p>
                </div>
              </SparklesCard>

              <SparklesCard containerClassName="col-span-1 min-h-[160px]" className="p-6">
                <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.this_week}
                </h2>
                <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                  Reconciliations This Week
                </p>
              </SparklesCard>

              <SparklesCard containerClassName="col-span-1 min-h-[160px]" className="p-6">
                <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.this_month}
                </h2>
                <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                  Reconciliations This Month
                </p>
              </SparklesCard>

              <SparklesCard containerClassName="col-span-1 min-h-[160px]" className="p-6">
                <h2 className="text-left text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.current_streak} <span className="text-xl">Days</span>
                </h2>
                <p className="mt-2 text-left text-base text-slate-600 dark:text-slate-400 font-medium">
                  Current Streak 🔥
                </p>
              </SparklesCard>
            </div>

            {/* Activity Chart */}
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg text-slate-600 dark:text-slate-400">📈</span>
                  Activity
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">(Last 30 Days)</span>
                </h3>
              </div>

              {dailyActivity.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke={darkMode ? "#94a3b8" : "#64748b"}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        dy={10}
                      />
                      <YAxis
                        stroke={darkMode ? "#94a3b8" : "#64748b"}
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          background: darkMode ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(12px)",
                          border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "16px",
                          color: darkMode ? "#f8fafc" : "#0f172a",
                          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.2)"
                        }}
                        cursor={{ fill: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                      >
                        {dailyActivity.map((entry, index) => (
                          <cell key={`cell-${index}`} fill="url(#colorCount)" />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                  <div className="text-5xl mb-4 opacity-50">📊</div>
                  <p className="text-lg font-medium">No activity data yet</p>
                  <p className="text-sm">Complete your first reconciliation to see stats!</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg text-slate-600 dark:text-slate-400">📋</span>
                  Recent Reconciliations
                </h3>
                <button
                  onClick={() => router.push("/dashboard/history")}
                  className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  View All History <span className="text-lg">→</span>
                </button>
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg
                            ${(activity.bank_type || "??") === "ICICI"
                              ? "bg-slate-600"
                              : "bg-slate-500"}
                          `}>
                            {(activity.bank_type || "??").substring(0, 2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                              {activity.bank_type || "Unknown Bank"} Reconciliation
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                📅 {formatDate(activity.timestamp)}
                              </span>
                              {(activity.tpa_name || activity.pipeline_mode === 'v2_bulk') && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                    🏢 {activity.tpa_name || "Bulk Process"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => downloadZip(activity.run_id)}
                          disabled={downloading[activity.run_id]}
                          className={`
                            px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md
                            ${downloading[activity.run_id]
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait"
                              : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20"}
                          `}
                        >
                          {downloading[activity.run_id] ? "⏳ Downloading..." : "📦 Download ZIP"}
                        </button>
                      </div>

                      {activity.row_counts && Object.keys(activity.row_counts).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-2">
                          {Object.entries(activity.row_counts).map(([key, value], i) => (
                            <div
                              key={i}
                              className="px-3 py-1 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-700/50 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2"
                            >
                              <span className="uppercase tracking-wider opacity-70">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white bg-white/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded shadow-sm">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>No recent activity found.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium border border-red-100 dark:border-red-800">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl font-medium border border-emerald-100 dark:border-emerald-800">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-wait"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}