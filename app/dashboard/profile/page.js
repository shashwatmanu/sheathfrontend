"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MuiTooltip from "@mui/material/Tooltip";

// Separate component for navbar sparkles
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

// Helper function for authenticated API calls
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
  const [darkMode, setDarkMode] = useState(false);
  
  // Profile data state
  const [stats, setStats] = useState(null);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("[Profile] Not authenticated, redirecting to login");
      router.push("/auth/login");
    } else {
      const user = getUsername();
      setUsername(user || "User");
      console.log("[Profile] Authenticated as:", user);
      fetchProfileData();
    }
  }, [router]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Fetch user stats
      const statsRes = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/profile/stats`);
      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch daily activity
      const dailyRes = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/profile/daily?days=30`);
      if (!dailyRes.ok) throw new Error("Failed to fetch daily activity");
      const dailyData = await dailyRes.json();
      setDailyActivity(dailyData);

      // Fetch recent activity
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

  const handleLogout = () => {
    console.log("[Profile] Logout clicked");
    logout();
    window.location.href = "/auth/login";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            {/* Back to Dashboard */}
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

            {/* Dark Mode Toggle */}
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
            
            {/* Logout Button */}
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
                <span style={{ fontSize: "20px" }}>🚪</span>
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
        
        {/* Loading State */}
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

        {/* Error State */}
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

        {/* Profile Content */}
        {!loading && !error && stats && (
          <>
            {/* Header Card */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
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
            </div>

            {/* Stats Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px"
            }}>
              {/* Total Reconciliations */}
              <div style={{
                background: theme.cardBg,
                padding: "24px",
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <Typography variant="h4" style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {stats.total_reconciliations}
                </Typography>
                <Typography variant="body2" style={{ color: theme.textSecondary }}>
                  Total Reconciliations
                </Typography>
              </div>

              {/* This Week */}
              <div style={{
                background: theme.cardBg,
                padding: "24px",
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <Typography variant="h4" style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {stats.this_week}
                </Typography>
                <Typography variant="body2" style={{ color: theme.textSecondary }}>
                  This Week
                </Typography>
              </div>

              {/* This Month */}
              <div style={{
                background: theme.cardBg,
                padding: "24px",
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📆</div>
                <Typography variant="h4" style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {stats.this_month}
                </Typography>
                <Typography variant="body2" style={{ color: theme.textSecondary }}>
                  This Month
                </Typography>
              </div>

              {/* Streak */}
              <div style={{
                background: theme.cardBg,
                padding: "24px",
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔥</div>
                <Typography variant="h4" style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {stats.current_streak}
                </Typography>
                <Typography variant="body2" style={{ color: theme.textSecondary }}>
                  Day Streak
                </Typography>
              </div>
            </div>

            {/* Activity Chart */}
            <div style={{
              background: theme.cardBg,
              padding: "24px",
              borderRadius: "12px",
              border: `1px solid ${theme.border}`,
              boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
              marginBottom: "24px"
            }}>
              <Typography variant="h6" style={{ fontWeight: 700, color: theme.text, marginBottom: 16 }}>
                📈 Activity (Last 30 Days)
              </Typography>
              
              {dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis 
                      dataKey="date" 
                      stroke={theme.textSecondary}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke={theme.textSecondary} 
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        color: theme.text
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "48px", color: theme.textSecondary }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <Typography variant="body1">No activity data yet. Complete your first reconciliation!</Typography>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div style={{
              background: theme.cardBg,
              padding: "24px",
              borderRadius: "12px",
              border: `1px solid ${theme.border}`,
              boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <Typography variant="h6" style={{ fontWeight: 700, color: theme.text, marginBottom: 16 }}>
                📋 Recent Activity
              </Typography>

              {recentActivity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recentActivity.map((activity, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: "16px",
                        background: darkMode ? "#0f172a" : "#f8f9fa",
                        borderRadius: "8px",
                        border: `1px solid ${theme.border}`
                      }}
                    >
                      {/* Header: Bank Type + TPA */}
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: 12,
                        flexWrap: "wrap",
                        gap: 8
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: activity.bank_type === "ICICI" 
                              ? "linear-gradient(135deg, #bf2a2a, #e63946)" 
                              : "linear-gradient(135deg, #871f42, #be185d)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 12
                          }}>
                            ✓
                          </div>
                          <div>
                            <Typography variant="body1" style={{ fontWeight: 700, color: theme.text, fontSize: 15 }}>
                              {activity.bank_type} Reconciliation
                            </Typography>
                            {activity.tpa_name && (
                              <Typography variant="body2" style={{ color: theme.textSecondary, fontSize: 12 }}>
                                TPA: {activity.tpa_name}
                              </Typography>
                            )}
                          </div>
                        </div>
                        
                        <Typography variant="body2" style={{ 
                          color: theme.textSecondary, 
                          fontSize: 12,
                          fontWeight: 500
                        }}>
                          {formatDate(activity.timestamp)}
                        </Typography>
                      </div>

                      {/* Row Counts */}
                      {activity.row_counts && Object.keys(activity.row_counts).length > 0 && (
                        <div style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap"
                        }}>
                          {Object.entries(activity.row_counts).map(([key, value], i) => (
                            <div 
                              key={i}
                              style={{
                                padding: "4px 10px",
                                background: darkMode ? "#1e293b" : "#ffffff",
                                border: `1px solid ${theme.border}`,
                                borderRadius: "6px",
                                fontSize: 11,
                                color: theme.text,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <span style={{ color: theme.textSecondary, fontWeight: 500 }}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                              </span>
                              <span style={{ color: "#10b981" }}>{value}</span>
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
    </div>
  );
}