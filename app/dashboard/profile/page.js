"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
import { WobbleCard } from "../../../components/ui/wobble-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const { darkMode, setDarkMode } = useDarkMode();

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

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
    inputBg: darkMode ? "#334155" : "#f8f8f8",
  };

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

  const handleLogout = () => {
    console.log("[Profile] Logout clicked");
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
      transition: "background 0.3s ease"
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
              <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0 }}>User Profile</p>
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

            <MuiTooltip title="View All History" arrow>
              <button
                onClick={() => router.push("/dashboard/history")}
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
                <span>📚</span>
                History
              </button>
            </MuiTooltip>

            <MuiTooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow>
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
        maxWidth: "1200px",
        width: "100%",
        padding: "24px 16px",
        boxSizing: "border-box"
      }}>

        {loading && (
          <div style={{
            textAlign: "center",
            padding: "48px",
            color: theme.textSecondary
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <Typography variant="h6" style={{ color: theme.text }}>Loading profile...</Typography>
          </div>
        )}

        {error && !loading && (
          <div style={{
            background: darkMode ? "#7f1d1d" : "#fef2f2",
            border: `2px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
            borderRadius: 12,
            padding: 20,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <Typography variant="h6" style={{ color: darkMode ? "#fecaca" : "#dc2626", marginBottom: 8 }}>
              Failed to Load Profile
            </Typography>
            <Typography variant="body2" style={{ color: darkMode ? "#fca5a5" : "#7f1d1d" }}>
              {error}
            </Typography>
            <button
              onClick={fetchProfileData}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* Header Card with Email Verification Badge */}
            <div style={{
              background: darkMode
                ? "linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "32px",
              borderRadius: "16px",
              marginBottom: "24px",
              color: "white",
              boxShadow: darkMode
                ? "0 8px 24px rgba(79, 70, 229, 0.3)"
                : "0 8px 24px rgba(102, 126, 234, 0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36
                  }}>
                    👤
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>{username}</h1>
                    <p style={{ margin: "4px 0 0 0", fontSize: 14, opacity: 0.9 }}>
                      Member since {new Date(stats.last_activity || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {/* Change Password Button */}
                  <button
                    onClick={() => setPasswordModalOpen(true)}
                    style={{
                      padding: "12px 20px",
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s",
                      backdropFilter: "blur(10px)",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>🔒</span>
                    Change Password
                  </button>

                  {/* Email Verification Badge */}
                  {verificationStatus && verificationStatus.has_email && (
                    <div style={{
                      background: verificationStatus.email_verified
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(251, 191, 36, 0.2)",
                      border: `2px solid ${verificationStatus.email_verified ? "#10b981" : "#fbbf24"}`,
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}>
                      <span style={{ fontSize: 20 }}>
                        {verificationStatus.email_verified ? "✅" : "⚠️"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {verificationStatus.email_verified ? "Email Verified" : "Email Not Verified"}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.9 }}>
                          {verificationStatus.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Verification Section */}
              {verificationStatus && verificationStatus.has_email && !verificationStatus.email_verified && (
                <div style={{
                  background: "rgba(251, 191, 36, 0.15)",
                  border: "2px solid rgba(251, 191, 36, 0.4)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "16px"
                }}>
                  <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>📧</span>
                    <div style={{ flex: 1 }}>
                      <Typography variant="body1" style={{ fontWeight: 600, marginBottom: 4 }}>
                        Verify your email address
                      </Typography>
                      <Typography variant="body2" style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
                        We sent a verification link to <strong>{verificationStatus.email}</strong>.
                        Click the link in the email to verify your account.
                      </Typography>

                      <button
                        onClick={sendVerificationEmail}
                        disabled={sendingVerification}
                        style={{
                          padding: "10px 20px",
                          background: sendingVerification ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)",
                          color: "#5b21b6",
                          border: "none",
                          borderRadius: "8px",
                          cursor: sendingVerification ? "wait" : "pointer",
                          fontSize: "14px",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          opacity: sendingVerification ? 0.7 : 1
                        }}
                      >
                        {sendingVerification ? "⏳ Sending..." : "📤 Resend Verification Email"}
                      </button>

                      {verificationMessage && (
                        <div style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          fontSize: "13px"
                        }}>
                          {verificationMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rest of the profile page remains the same... */}
            {/* Stats Grid with WobbleCards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "32px"
            }}>
              <WobbleCard
                containerClassName="col-span-1 h-full bg-pink-800 min-h-[200px]"
                className=""
              >
                <div className="max-w-xs">
                  <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                    {stats.total_reconciliations}
                  </h2>
                  <p className="mt-4 text-left  text-base/6 text-neutral-200">
                    Total Reconciliations
                  </p>
                </div>
              </WobbleCard>

              <WobbleCard containerClassName="col-span-1 min-h-[200px] bg-blue-900">
                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  {stats.this_week}
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                  Reconciliations This Week
                </p>
              </WobbleCard>

              <WobbleCard containerClassName="col-span-1 min-h-[200px] bg-indigo-800">
                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  {stats.this_month}
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                  Reconciliations This Month
                </p>
              </WobbleCard>

              <WobbleCard containerClassName="col-span-1 min-h-[200px] bg-emerald-900">
                <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                  {stats.current_streak} Days
                </h2>
                <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
                  Current Streak 🔥
                </p>
              </WobbleCard>
            </div>

            {/* Activity Chart */}
            <div style={{
              background: darkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              padding: "32px",
              borderRadius: "24px",
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
              boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)",
              marginBottom: "32px"
            }}>
              <Typography variant="h6" style={{ fontWeight: 700, color: theme.text, marginBottom: 24, fontSize: 20 }}>
                📈 Activity (Last 30 Days)
              </Typography>

              {dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={theme.textSecondary}
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
                      stroke={theme.textSecondary}
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        background: darkMode ? "#1e293b" : "#ffffff",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 12,
                        color: theme.text,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                      }}
                      cursor={{ fill: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                    <Bar
                      dataKey="count"
                      fill="url(#colorCount)"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "48px", color: theme.textSecondary }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <Typography variant="body1">No activity data yet. Complete your first reconciliation!</Typography>
                </div>
              )}
            </div>

            {/* Recent Activity with Download */}
            {/* Recent Activity with Download */}
            <div style={{
              background: darkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              padding: "32px",
              borderRadius: "24px",
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
              boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12
              }}>
                <Typography variant="h6" style={{ fontWeight: 700, color: theme.text, fontSize: 20 }}>
                  📋 Recent Reconciliations
                </Typography>
                <button
                  onClick={() => router.push("/dashboard/history")}
                  style={{
                    padding: "10px 20px",
                    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    color: theme.text,
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                >
                  View All History →
                </button>
              </div>

              {recentActivity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {recentActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "20px",
                        background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
                        borderRadius: "16px",
                        border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                        transition: "transform 0.2s",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        flexWrap: "wrap",
                        gap: 12
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "12px",
                            background: activity.bank_type === "ICICI"
                              ? "linear-gradient(135deg, #bf2a2a, #e63946)"
                              : "linear-gradient(135deg, #871f42, #be185d)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                          }}>
                            {activity.bank_type.substring(0, 2)}
                          </div>
                          <div>
                            <Typography variant="body1" style={{ fontWeight: 700, color: theme.text, fontSize: 16 }}>
                              {activity.bank_type} Reconciliation
                            </Typography>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                              <Typography variant="body2" style={{ color: theme.textSecondary, fontSize: 13 }}>
                                {formatDate(activity.timestamp)}
                              </Typography>
                              {activity.tpa_name && (
                                <>
                                  <span style={{ color: theme.textSecondary }}>•</span>
                                  <Typography variant="body2" style={{ color: theme.textSecondary, fontSize: 13 }}>
                                    {activity.tpa_name}
                                  </Typography>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => downloadZip(activity.run_id)}
                          disabled={downloading[activity.run_id]}
                          style={{
                            padding: "8px 16px",
                            background: downloading[activity.run_id]
                              ? (darkMode ? "#334155" : "#e5e7eb")
                              : "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            cursor: downloading[activity.run_id] ? "wait" : "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: downloading[activity.run_id] ? 0.6 : 1,
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
                          }}
                        >
                          {downloading[activity.run_id] ? "⏳" : "📦"}
                          {downloading[activity.run_id] ? "Downloading..." : "Download ZIP"}
                        </button>
                      </div>

                      {activity.row_counts && Object.keys(activity.row_counts).length > 0 && (
                        <div style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          paddingTop: 12,
                          borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`
                        }}>
                          {Object.entries(activity.row_counts).map(([key, value], i) => (
                            <div
                              key={i}
                              style={{
                                padding: "4px 10px",
                                background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                borderRadius: "6px",
                                fontSize: 12,
                                color: theme.text,
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              <span style={{ color: theme.textSecondary }}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                              </span>
                              <span style={{ color: "#10b981", fontWeight: 700 }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px", color: theme.textSecondary }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <Typography variant="body1">No recent activity</Typography>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: darkMode
              ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            borderRadius: "24px",
            padding: "32px",
            maxWidth: "450px",
            width: "100%",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
            boxShadow: darkMode
              ? "0 20px 60px rgba(0,0,0,0.5)"
              : "0 20px 60px rgba(0,0,0,0.15)",
            position: "relative"
          }}>
            {/* Close button */}
            <button
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordError("");
                setPasswordSuccess("");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: theme.textSecondary,
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔒</div>
              <Typography variant="h5" style={{
                fontWeight: 700,
                color: theme.text,
                marginBottom: "8px"
              }}>
                Change Password
              </Typography>
              <Typography variant="body2" style={{ color: theme.textSecondary }}>
                Enter your current password and choose a new one
              </Typography>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: theme.text
                }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    background: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Enter current password"
                  disabled={changingPassword}
                />
              </div>

              {/* New Password */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: theme.text
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    background: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Enter new password (min 6 chars)"
                  disabled={changingPassword}
                />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: theme.text
                }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    background: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Re-enter new password"
                  disabled={changingPassword}
                />
              </div>

              {/* Error Message */}
              {passwordError && (
                <div style={{
                  background: darkMode ? "#7f1d1d" : "#fef2f2",
                  border: `2px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>⚠️</span>
                  <span style={{
                    color: darkMode ? "#fecaca" : "#dc2626",
                    fontSize: "13px",
                    fontWeight: 600
                  }}>
                    {passwordError}
                  </span>
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div style={{
                  background: darkMode ? "#064e3b" : "#f0fdf4",
                  border: `2px solid #10b981`,
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "20px" }}>✅</span>
                  <span style={{
                    color: darkMode ? "#d1fae5" : "#059669",
                    fontSize: "13px",
                    fontWeight: 600
                  }}>
                    {passwordSuccess}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div style={{
                display: "flex",
                gap: "12px",
                flexDirection: "column"
              }}>
                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: changingPassword || !currentPassword || !newPassword || !confirmPassword
                      ? (darkMode ? "#334155" : "#e5e7eb")
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: changingPassword || !currentPassword || !newPassword || !confirmPassword ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: 700,
                    opacity: changingPassword || !currentPassword || !newPassword || !confirmPassword ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {changingPassword ? "⏳" : "🔒"}
                  {changingPassword ? "Changing Password..." : "Change Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordError("");
                    setPasswordSuccess("");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={changingPassword}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: "transparent",
                    color: theme.text,
                    border: `2px solid ${theme.border}`,
                    borderRadius: "12px",
                    cursor: changingPassword ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: 600,
                    opacity: changingPassword ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}