"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername } from "../../../lib/auth";
import { SparklesCore } from "../../../components/ui/sparkles";
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
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
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
        maxWidth: "1200px",
        width: "100%",
        padding: "24px 16px",
        boxSizing: "border-box"
      }}>
        
        {/* Header */}
        <div style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}>
          <div>
            <Typography variant="h4" style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>
              📚 Reconciliation History
            </Typography>
            <Typography variant="body2" style={{ color: theme.textSecondary }}>
              View and download your past reconciliations (auto-deleted after 30 days)
            </Typography>
          </div>
          
          <button
            onClick={fetchHistory}
            style={{
              padding: "10px 20px",
              background: darkMode ? "#334155" : "#f3f4f6",
              color: theme.text,
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            🔄 Refresh
          </button>
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
            background: darkMode ? "#7f1d1d" : "#fef2f2",
            border: `2px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
            borderRadius: 12,
            padding: 20,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <Typography variant="h6" style={{ color: darkMode ? "#fecaca" : "#dc2626", marginBottom: 8 }}>
              Failed to Load History
            </Typography>
            <Typography variant="body2" style={{ color: darkMode ? "#fca5a5" : "#7f1d1d" }}>
              {error}
            </Typography>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && reconciliations.length === 0 && (
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 48,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📂</div>
            <Typography variant="h6" style={{ color: theme.text, marginBottom: 8 }}>
              No Reconciliations Yet
            </Typography>
            <Typography variant="body2" style={{ color: theme.textSecondary, marginBottom: 24 }}>
              Complete your first reconciliation to see it here!
            </Typography>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 600
              }}
            >
              Start Reconciliation
            </button>
          </div>
        )}

        {/* Reconciliation List */}
        {!loading && !error && reconciliations.length > 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            {reconciliations.map((recon) => (
              <div 
                key={recon.run_id}
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                {/* Header Row */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "start",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 12
                }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Typography variant="h6" style={{ 
                      fontWeight: 700, 
                      color: theme.text, 
                      marginBottom: 4,
                      fontSize: 18
                    }}>
                      {formatDate(recon.timestamp)}
                    </Typography>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        padding: "4px 12px",
                        background: recon.bank_type === "ICICI" 
                          ? "linear-gradient(135deg, #bf2a2a, #e63946)" 
                          : "linear-gradient(135deg, #871f42, #be185d)",
                        color: "white",
                        borderRadius: "12px",
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {recon.bank_type}
                      </span>
                      {recon.tpa_name && (
                        <span style={{
                          padding: "4px 12px",
                          background: darkMode ? "#334155" : "#f3f4f6",
                          color: theme.text,
                          borderRadius: "12px",
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {recon.tpa_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => downloadZip(recon.run_id)}
                      disabled={downloading[recon.run_id]}
                      style={{
                        padding: "8px 16px",
                        background: downloading[recon.run_id] 
                          ? (darkMode ? "#334155" : "#e5e7eb")
                          : "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: downloading[recon.run_id] ? "wait" : "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: downloading[recon.run_id] ? 0.6 : 1
                      }}
                    >
                      {downloading[recon.run_id] ? "⏳" : "📦"}
                      {downloading[recon.run_id] ? "Downloading..." : "Download ZIP"}
                    </button>
                    
                    <button
                      onClick={() => deleteReconciliation(recon.run_id)}
                      style={{
                        padding: "8px 12px",
                        background: darkMode ? "#7f1d1d" : "#fef2f2",
                        color: "#dc2626",
                        border: `1px solid #dc2626`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  padding: 16,
                  background: darkMode ? "#0f172a" : "#f8f9fa",
                  borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                      Outstanding Matches
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                      {recon.summary.step4_outstanding}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                      Total Amount
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
                      ₹{recon.summary.total_amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                      Unique Patients
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
                      {recon.summary.unique_patients}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                      Bank × Advance
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
                      {recon.summary.step2_matches}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}