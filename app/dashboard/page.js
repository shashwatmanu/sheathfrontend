"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout, getUsername, getToken, authenticatedFetch } from "../../lib/auth";
import { FileUpload } from "../../components/ui/file-upload.tsx";
import { Button as FancyButton } from "../../components/ui/moving-border";
import { SparklesCore } from "../../components/ui/sparkles";
import Hyperspeed from "../../components/ui/hyperspeed";
import Lottie from 'lottie-react';
import DataModal from '../../components/ui/DataModal';
import { WobbleCard } from "../../components/ui/wobble-card";
import { Check, Landmark, FileSpreadsheet, FileText, AlertCircle, Download, X, Eye, Plus, Edit, Trash, ShieldCheck, Tag, Info, ListFilter, Target, Calendar } from "lucide-react";
import SideNote from "../../components/ui/SideNote.jsx";
// import AIAssistantModal from '../../components/ui/AIAssistantModal.jsx';  // ✅ NEW: AI Assistant

import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import MuiButton from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import { useDarkMode } from "../../lib/dark-mode-context";

// Helper to offload Excel parsing to a Web Worker
const parseExcelWithWorker = (arrayBuffer) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/workers/excel-worker.js');
    worker.onmessage = (event) => {
      const { status, data, message } = event.data;
      if (status === 'success') {
        resolve(data);
      } else {
        reject(new Error(message || 'Worker error'));
      }
      worker.terminate();
    };
    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
    worker.postMessage(arrayBuffer, [arrayBuffer]);
  });
};

// Separate component for navbar sparkles - won't re-render on state changes
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

// Separate component for hero sparkles - won't re-render on state changes
const HeroSparkles = React.memo(() => (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  }}>
    <Hyperspeed
      effectOptions={{
        onSpeedUp: () => { },
        onSlowDown: () => { },
        distortion: 'turbulentDistortion',
        length: 400,
        roadWidth: 10,
        islandWidth: 2,
        lanesPerRoad: 4,
        fov: 90,
        fovSpeedUp: 150,
        speedUp: 2,
        carLightsFade: 0.4,
        totalSideLightSticks: 20,
        lightPairsPerRoadWay: 40,
        shoulderLinesWidthPercentage: 0.05,
        brokenLinesWidthPercentage: 0.1,
        brokenLinesLengthPercentage: 0.5,
        lightStickWidth: [0.12, 0.5],
        lightStickHeight: [1.3, 1.7],
        movingAwaySpeed: [60, 80],
        movingCloserSpeed: [-120, -160],
        carLightsLength: [400 * 0.03, 400 * 0.2],
        carLightsRadius: [0.05, 0.14],
        carWidthPercentage: [0.3, 0.5],
        carShiftX: [-0.8, 0.8],
        carFloorSeparation: [0, 5],
        colors: {
          roadColor: 0x080808,
          islandColor: 0x0a0a0a,
          background: 0x000000,
          shoulderLines: 0xFFFFFF,
          brokenLines: 0xFFFFFF,
          leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
          rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
          sticks: 0x03B3C3,
        }
      }}
    />
  </div>
));

const categorizeError = (errorMsg) => {
  if (!errorMsg) return null;
  const lowercaseError = errorMsg.toLowerCase();
  
  // TPA Column Mismatches / Auto-detect failures
  if (lowercaseError.includes("column") || lowercaseError.includes("missing") || lowercaseError.includes("auto-detect failed")) {
    const isAutoDetect = lowercaseError.includes("auto-detect");
    return {
      type: "User Input Error",
      title: isAutoDetect ? "TPA Auto-detect Failed" : "Column Mismatch",
      message: errorMsg,
      solution: isAutoDetect 
        ? "The system couldn't identify the TPA automatically. Please ensure the MIS file layout is correct or ask Admin to update TPA mappings."
        : "The uploaded file is missing expected columns. Please verify the column names match the TPA configuration in the sidebar.",
      action: "open_tpa_sidebar",
      icon: "📋",
      color: "#ef4444"
    };
  }
  
  // Filter issues
  if (lowercaseError.includes("filter") || lowercaseError.includes("hidden")) {
    return {
      type: "User Input Error",
      title: "Active Filters Detected",
      message: errorMsg,
      solution: "Some files have active filters or hidden rows. Please clear all filters, unhide all rows/columns, and try again.",
      icon: "🔍",
      color: "#f59e0b"
    };
  }
  
  // Authentication/Session
  if (lowercaseError.includes("unauthorized") || lowercaseError.includes("token") || lowercaseError.includes("401") || lowercaseError.includes("login")) {
    return {
      type: "Authentication Error",
      title: "Session Expired",
      message: errorMsg,
      solution: "Your session has expired. Please log in again.",
      action: "logout",
      icon: "🔐",
      color: "#6366f1"
    };
  }

  // File type issues
  if (lowercaseError.includes("extension") || lowercaseError.includes("format") || lowercaseError.includes("xlsx") || lowercaseError.includes("csv")) {
    return {
      type: "User Input Error",
      title: "Invalid File Format",
      message: errorMsg,
      solution: "Please ensure you are uploading Excel (.xlsx) or CSV files as required by the TPA.",
      icon: "📄",
      color: "#ef4444"
    };
  }

  // Generic System Errors
  if (lowercaseError.includes("unhashable") || lowercaseError.includes("internal") || lowercaseError.includes("500")) {
    return {
      type: "System Error",
      title: "Internal Processing Error",
      message: errorMsg,
      solution: "A system-level error occurred. This might be due to unexpected data formats. Please contact technical support.",
      icon: "⚙️",
      color: "#991b1b"
    };
  }

  // Default Generic Error
  return {
    type: "Processing Error",
    title: "Encountered an Issue",
    message: errorMsg,
    solution: "Something went wrong. Try refreshing or check if the file matches our tool's expected format.",
    icon: "⚠️",
    color: "#ef4444"
  };
};

// New component for displaying Excel data
const ExcelDataViewer = ({ url, label, darkMode, apiBase }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50); // Show first 50 rows
  const [dataLoaded, setDataLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
  };

  const fetchAndParseExcel = async () => {
    setLoading(true);
    setError("");
    try {
      const fullUrl = `${apiBase.replace(/\/$/, "")}${url}`;

      // Add Bearer token for authentication
      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      const jsonData = await parseExcelWithWorker(arrayBuffer);

      if (jsonData.length > 0) {
        setColumns(Object.keys(jsonData[0]));
        setData(jsonData);
      } else {
        setData([]);
        setColumns([]);
      }
      setDataLoaded(true);
    } catch (err) {
      console.error("Error loading Excel:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && !dataLoaded && !loading) {
      fetchAndParseExcel();
    }
  }, [expanded, dataLoaded, loading]);

  const displayData = data.slice(0, displayLimit);

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f8f9fa",
      borderRadius: "8px",
      border: `1px solid ${theme.border}`,
      marginTop: "8px",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box"
    }}>
      {/* Header with download and expand/collapse */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        background: darkMode ? "#1e293b" : "#ffffff",
        borderBottom: expanded ? `1px solid ${theme.border}` : "none",
        flexWrap: "wrap",
        gap: "8px",
        borderRadius: expanded ? "8px 8px 0 0" : "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: "200px" }}>
          <span style={{ fontSize: 16 }}>📄</span>
          <Typography variant="body2" style={{ fontWeight: 600, color: theme.text, fontSize: "14px" }}>
            {label}
          </Typography>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('access_token');
                const headers = {};
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                }

                const fullUrl = `${apiBase.replace(/\/$/, "")}${url}`;
                const response = await fetch(fullUrl, { headers });

                if (!response.ok) {
                  throw new Error('Download failed');
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = url.split('/').pop();
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
              } catch (err) {
                console.error('Download error:', err);
                alert('Download failed. Please try again.');
              }
            }}
            style={{
              padding: "6px 14px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap"
            }}
          >
            <span>⬇️</span>
            Download
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "6px 14px",
              background: darkMode ? "#334155" : "#e5e7eb",
              color: theme.text,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap"
            }}
          >
            {expanded ? "Hide ▲" : "View ▼"}
          </button>
        </div>
      </div>

      {/* Collapsible data table */}
      <Collapse in={expanded}>
        <div style={{
          padding: "16px",
          width: "100%",
          boxSizing: "border-box",
          maxWidth: "100%"
        }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "32px", color: theme.textSecondary }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              Loading data...
            </div>
          )}

          {error && (
            <div style={{
              padding: "16px",
              background: darkMode ? "#7f1d1d" : "#fef2f2",
              color: darkMode ? "#fca5a5" : "#dc2626",
              borderRadius: 8,
              textAlign: "center"
            }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px", color: theme.textSecondary }}>
              No matches found
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <>
              <div style={{
                marginBottom: 12,
                color: theme.textSecondary,
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8
              }}>
                <span>Total rows: <strong>{data.length}</strong></span>
                <span>Total rows: <strong>{data.length}</strong></span>
                {data.length > displayLimit && (
                  <span>Showing first {displayLimit} rows</span>
                )}
              </div>

              {/* Scrollable table wrapper with visible scrollbars */}
              <div style={{
                width: "100%",
                overflowX: "scroll",
                overflowY: "auto",
                maxHeight: "500px",
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                background: theme.cardBg,
                WebkitOverflowScrolling: "touch",
                boxSizing: "border-box"
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  tableLayout: "fixed"
                }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{
                        background: darkMode ? "#334155" : "#f3f4f6",
                        color: theme.text,
                        fontWeight: 700,
                        fontSize: 11,
                        padding: "8px 8px",
                        textAlign: "left",
                        borderBottom: `1px solid ${theme.border}`,
                        width: "50px",
                        minWidth: "50px"
                      }}>
                        #
                      </th>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          title={col}
                          style={{
                            background: darkMode ? "#334155" : "#f3f4f6",
                            color: theme.text,
                            fontWeight: 700,
                            fontSize: 10,
                            padding: "8px 8px",
                            textAlign: "left",
                            borderBottom: `1px solid ${theme.border}`,
                            borderBottom: `1px solid ${theme.border}`,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: "150px",
                            maxWidth: "300px"
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        style={{
                          background: rowIdx % 2 === 0
                            ? (darkMode ? "#1e293b" : "#ffffff")
                            : (darkMode ? "#0f172a" : "#f9fafb")
                        }}
                      >
                        <td style={{
                          color: theme.textSecondary,
                          fontSize: 11,
                          padding: "6px 8px",
                          fontWeight: 600,
                          borderBottom: `1px solid ${theme.border}`,
                          width: "40px"
                        }}>
                          {rowIdx + 1}
                        </td>
                        {columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            title={String(row[col] || "")}
                            style={{
                              color: theme.text,
                              fontSize: 11,
                              padding: "6px 8px",
                              borderBottom: `1px solid ${theme.border}`,
                              borderBottom: `1px solid ${theme.border}`,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              minWidth: "150px",
                              maxWidth: "300px"
                            }}
                          >
                            {String(row[col] || "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: 12,
                padding: 10,
                background: darkMode ? "#334155" : "#f3f4f6",
                borderRadius: 6,
                textAlign: "center",
                fontSize: 11,
                color: theme.textSecondary
              }}>
                {data.length > displayLimit ? (
                  <>📊 Showing {displayLimit} of {data.length} rows. <strong>Hover over cells</strong> to see full text. Download for complete data.</>
                ) : (
                  <>💡 <strong>Tip:</strong> Hover over any cell to see the full text content</>
                )}
              </div>

              {/* View All button - always show if there's data */}
              {data.length > 0 && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button
                    onClick={() => setModalOpen(true)}
                    style={{
                      padding: "10px 24px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: darkMode
                        ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                        : "0 4px 12px rgba(102, 126, 234, 0.2)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = darkMode
                        ? "0 6px 16px rgba(102, 126, 234, 0.4)"
                        : "0 6px 16px rgba(102, 126, 234, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = darkMode
                        ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                        : "0 4px 12px rgba(102, 126, 234, 0.2)";
                    }}
                  >
                    <span style={{ fontSize: 18 }}>📊</span>
                    View All {data.length.toLocaleString()} Rows
                  </button>
                  <div style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: theme.textSecondary
                  }}>
                    ✨ Full pagination, search & export
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Collapse>

      {/* Data Modal for full view */}
      <DataModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
        columns={columns}
        filename={label}
        darkMode={darkMode}
      />
    </div>
  );
};

// Helper to format file keys into readable labels
const formatFileLabel = (key, counts) => {
  // Convert "matches_raw" -> "Matches (Raw)"
  let label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Custom replacements
  label = label.replace('Adv ', 'Advance ').replace('Mis ', 'MIS ');
  if (label.includes("Raw")) label = label.replace("Raw", "(Raw)");
  if (label.includes("Treated")) label = label.replace("Treated", "(Treated)");

  // Add counts if available
  if (counts && counts[key] !== undefined) {
    label += ` - ${counts[key].toLocaleString()} rows`;
  }

  return label;
};

// Note: TPA_MIS_MAPS was removed, mappings are now fetched dynamically via the API.

const TpaConfigurationManager = ({ darkMode, apiBase }) => {
  const [tpas, setTpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTpa, setEditingTpa] = useState(null);
  const [formData, setFormData] = useState({ name: "", claim_col: "", cheque_utr_col: "", is_active: true });

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
    inputBg: darkMode ? "#0f172a" : "#f8f8f8",
  };

  const fetchTpas = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${apiBase.replace(/\/$/, "")}/api/tpa-mappings`);
      if (res.ok) {
        const data = await res.json();
        setTpas(Array.isArray(data) ? data.map(t => ({
          id: t.id,
          name: t.tpa_name,
          claim_col: t.claim_no_column,
          cheque_utr_col: t.cheque_utr_column,
          is_active: t.is_active !== undefined ? t.is_active : true
        })) : []);
      } else {
        throw new Error("Failed to fetch TPA mappings");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load TPA mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTpas();
  }, [apiBase]);

  const handleOpenModal = (tpa = null) => {
    if (tpa) {
      setEditingTpa(tpa);
      setFormData({
        name: tpa.name,
        claim_col: tpa.claim_col,
        cheque_utr_col: tpa.cheque_utr_col,
        is_active: tpa.is_active
      });
    } else {
      setEditingTpa(null);
      setFormData({ name: "", claim_col: "", cheque_utr_col: "", is_active: true });
    }
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const isEdit = !!editingTpa;
      const url = isEdit
        ? `${apiBase.replace(/\/$/, "")}/admin/tpa-mappings/${editingTpa.id}`
        : `${apiBase.replace(/\/$/, "")}/admin/tpa-mappings`;

      const method = isEdit ? "PUT" : "POST";

      const payload = {
        tpa_name: formData.name,
        claim_no_column: formData.claim_col,
        cheque_utr_column: formData.cheque_utr_col
      };

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to ${isEdit ? "update" : "create"} TPA`);
      }

      setSuccess(`TPA mapping successfully ${isEdit ? "updated" : "created"}!`);
      setModalOpen(false);
      fetchTpas();
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete mapping for ${name}?`)) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await authenticatedFetch(`${apiBase.replace(/\/$/, "")}/admin/tpa-mappings/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete TPA mapping");
      }

      setSuccess(`TPA mapping for ${name} deleted successfully!`);
      fetchTpas();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete mapping");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={32} color={darkMode ? "#a5b4fc" : "#4f46e5"} />
            TPA Configuration Manager
          </h2>
          <p style={{ color: theme.textSecondary, marginTop: 4 }}>
            Manage the list of TPAs, their claim columns, and cheque/UTR mappings dynamically.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: darkMode ? "0 4px 12px rgba(79, 70, 229, 0.4)" : "0 4px 12px rgba(79, 70, 229, 0.3)",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <Plus size={18} /> Add New TPA
        </button>
      </div>

      {error && !modalOpen && (
        <div style={{ padding: 16, background: darkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2", color: darkMode ? "#fca5a5" : "#b91c1c", borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {success && !modalOpen && (
        <div style={{ padding: 16, background: darkMode ? "rgba(34, 197, 94, 0.2)" : "#dcfce7", color: darkMode ? "#86efac" : "#15803d", borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={20} /> {success}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: theme.textSecondary }}>
          <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-indigo-600 rounded-full mb-4"></div>
          <p>Loading configurations...</p>
        </div>
      ) : (
        <div style={{
          background: theme.cardBg,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
          boxShadow: darkMode ? "0 4px 24px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc" }}>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>TPA Name</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>Claim No Column</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>Cheque/UTR Column</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}`, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tpas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: "center", color: theme.textSecondary }}>
                      No TPA mappings configured. Click "Add New TPA" to get started.
                    </td>
                  </tr>
                ) : (
                  tpas.map((tpa) => (
                    <tr key={tpa.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: "background 0.2s" }} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td style={{ padding: "16px 24px", color: theme.text, fontWeight: 500, fontSize: 14 }}>{tpa.name}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <code style={{ background: darkMode ? "rgba(0,0,0,0.3)" : "#f1f5f9", padding: "4px 8px", borderRadius: 4, fontSize: 12, color: darkMode ? "#a5f3fc" : "#0ea5e9" }}>
                          {tpa.claim_col}
                        </code>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <code style={{ background: darkMode ? "rgba(0,0,0,0.3)" : "#f1f5f9", padding: "4px 8px", borderRadius: 4, fontSize: 12, color: darkMode ? "#a5f3fc" : "#0ea5e9" }}>
                          {tpa.cheque_utr_col}
                        </code>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: tpa.is_active ? (darkMode ? "rgba(34, 197, 94, 0.2)" : "#dcfce7") : (darkMode ? "rgba(100, 116, 139, 0.2)" : "#f1f5f9"),
                          color: tpa.is_active ? (darkMode ? "#86efac" : "#166534") : (darkMode ? "#94a3b8" : "#475569")
                        }}>
                          {tpa.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleOpenModal(tpa)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.textSecondary, transition: "color 0.2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = darkMode ? "#a5b4fc" : "#4f46e5"}
                            onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(tpa.id, tpa.name)}
                            disabled={actionLoading}
                            style={{ background: "transparent", border: "none", cursor: actionLoading ? "not-allowed" : "pointer", color: theme.textSecondary, transition: "color 0.2s", opacity: actionLoading ? 0.5 : 1 }}
                            onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.color = darkMode ? "#fca5a5" : "#ef4444" }}
                            onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                            title="Delete"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: theme.cardBg,
            borderRadius: 16,
            width: "100%",
            maxWidth: 500,
            boxShadow: darkMode ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>
                {editingTpa ? "Edit TPA Mapping" : "Add New TPA Mapping"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: theme.textSecondary, cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                {error && (
                  <div style={{ padding: 12, background: darkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2", color: darkMode ? "#fca5a5" : "#b91c1c", borderRadius: 8, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>TPA Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.inputBg,
                      color: theme.text,
                      fontSize: 14,
                      outline: "none"
                    }}
                    placeholder="e.g. CARE HEALTH INSURANCE LIMITED"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>Claim No Column Name</label>
                  <input
                    type="text"
                    required
                    value={formData.claim_col}
                    onChange={(e) => setFormData({ ...formData, claim_col: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.inputBg,
                      color: theme.text,
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "monospace"
                    }}
                    placeholder="e.g. AL Number"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>Cheque/UTR Column Name</label>
                  <input
                    type="text"
                    required
                    value={formData.cheque_utr_col}
                    onChange={(e) => setFormData({ ...formData, cheque_utr_col: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.inputBg,
                      color: theme.text,
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "monospace"
                    }}
                    placeholder="e.g. Instrument/NEFT No"
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: 16, height: 16, borderRadius: 4, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, color: theme.text, fontWeight: 500 }}>Active</span>
                </label>
              </div>

              <div style={{ padding: "16px 24px", background: darkMode ? "rgba(255,255,255,0.02)" : "#f8fafc", borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: theme.textSecondary,
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: 8,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.7 : 1,
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.transform = "translateY(-1px)" }}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  {actionLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Check size={18} />}
                  {editingTpa ? "Update" : "Create"} Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DetectionPatternsEditor = ({ patterns, onChange, darkMode, theme }) => {
  const addSet = () => onChange([...patterns, ["", ""]]);
  const removeSet = (idx) => onChange(patterns.filter((_, i) => i !== idx));
  const updateToken = (setIdx, tokenIdx, val) => {
    const newPatterns = [...patterns];
    newPatterns[setIdx][tokenIdx] = val;
    onChange(newPatterns);
  };
  const addToken = (setIdx) => {
    const newPatterns = [...patterns];
    newPatterns[setIdx].push("");
    onChange(newPatterns);
  };
  const removeToken = (setIdx, tokenIdx) => {
    const newPatterns = [...patterns];
    newPatterns[setIdx] = newPatterns[setIdx].filter((_, i) => i !== tokenIdx);
    onChange(newPatterns);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Target size={14} /> Detection Patterns (Tokens that must appear in a row)
      </label>
      {patterns.map((set, sIdx) => (
        <div key={sIdx} style={{
          padding: 12,
          background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {set.map((token, tIdx) => (
              <div key={tIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => updateToken(sIdx, tIdx, e.target.value)}
                  placeholder="Token"
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: `1px solid ${theme.border}`,
                    background: theme.inputBg,
                    color: theme.text,
                    fontSize: 12,
                    outline: "none",
                    width: 100
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeToken(sIdx, tIdx)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addToken(sIdx)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: `1px dashed ${theme.border}`,
                background: 'transparent',
                color: theme.textSecondary,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              + Token
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeSet(sIdx)}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 10
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addSet}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px dashed ${theme.border}`,
          background: 'transparent',
          color: theme.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start'
        }}
      >
        + Add Pattern Set
      </button>
    </div>
  );
};

const ColumnMappingEditor = ({ mapping, onChange, theme }) => {
  const addPair = () => onChange({ ...mapping, "": "" });
  const removePair = (key) => {
    const newMapping = { ...mapping };
    delete newMapping[key];
    onChange(newMapping);
  };
  const updatePair = (oldKey, newKey, newVal) => {
    const newMapping = { ...mapping };
    if (oldKey !== newKey) {
      delete newMapping[oldKey];
    }
    newMapping[newKey] = newVal;
    onChange(newMapping);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ListFilter size={14} /> Column Mapping (Original Header → Canonical Header)
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(mapping).map(([key, val], idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={key}
              onChange={(e) => updatePair(key, e.target.value, val)}
              placeholder="Original Header"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: 13,
                outline: "none"
              }}
            />
            <span style={{ color: theme.textSecondary }}>→</span>
            <input
              type="text"
              value={val}
              onChange={(e) => updatePair(key, key, e.target.value)}
              placeholder="Canonical Header"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: 13,
                outline: "none"
              }}
            />
            <button
              type="button"
              onClick={() => removePair(key)}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPair}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px dashed ${theme.border}`,
          background: 'transparent',
          color: theme.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start'
        }}
      >
        + Add Mapping
      </button>
    </div>
  );
};

const KeepColumnsEditor = ({ columns, onChange, theme }) => {
  const [newCol, setNewCol] = useState("");
  const addCol = () => {
    if (newCol && !columns.includes(newCol)) {
      onChange([...columns, newCol]);
      setNewCol("");
    }
  };
  const removeCol = (col) => onChange(columns.filter(c => c !== col));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Tag size={14} /> Keep Columns (Canonical Headers to retain)
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {columns.map((col, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: "4px 10px",
            background: "rgba(79, 70, 229, 0.1)",
            color: "#4f46e5",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid rgba(79, 70, 229, 0.2)"
          }}>
            {col}
            <button
              type="button"
              onClick={() => removeCol(col)}
              style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newCol}
          onChange={(e) => setNewCol(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCol())}
          placeholder="Add canonical header..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.inputBg,
            color: theme.text,
            fontSize: 13,
            outline: "none"
          }}
        />
        <button
          type="button"
          onClick={addCol}
          style={{
            padding: "8px 16px",
            background: theme.border,
            color: theme.text,
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
};

const BankConfigurationManager = ({ darkMode, apiBase }) => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    detection_patterns: [["", ""]],
    column_mapping: {},
    keep_columns: []
  });

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
    inputBg: darkMode ? "#0f172a" : "#f8f8f8",
  };

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${apiBase.replace(/\/$/, "")}/api/bank-mappings`);
      if (res.ok) {
        const data = await res.json();
        setBanks(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to fetch bank mappings");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load bank mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, [apiBase]);

  const handleOpenModal = (bank = null) => {
    if (bank) {
      setEditingBank(bank);
      setFormData({
        bank_name: bank.bank_name,
        detection_patterns: bank.detection_patterns || [["", ""]],
        column_mapping: bank.column_mapping || {},
        keep_columns: bank.keep_columns || []
      });
    } else {
      setEditingBank(null);
      setFormData({
        bank_name: "",
        detection_patterns: [["", ""]],
        column_mapping: {},
        keep_columns: []
      });
    }
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const isEdit = !!editingBank;
      const url = isEdit
        ? `${apiBase.replace(/\/$/, "")}/admin/bank-mappings/${editingBank.id}`
        : `${apiBase.replace(/\/$/, "")}/admin/bank-mappings`;

      const method = isEdit ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to ${isEdit ? "update" : "create"} bank mapping`);
      }

      setSuccess(`Bank mapping successfully ${isEdit ? "updated" : "created"}!`);
      setModalOpen(false);
      fetchBanks();
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete configuration for ${name}?`)) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await authenticatedFetch(`${apiBase.replace(/\/$/, "")}/admin/bank-mappings/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete bank mapping");

      setSuccess(`Bank mapping for ${name} deleted successfully!`);
      fetchBanks();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete mapping");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Landmark size={32} color={darkMode ? "#a5b4fc" : "#4f46e5"} />
            Bank Configurations
          </h2>
          <p style={{ color: theme.textSecondary, marginTop: 4 }}>
            Configure auto-detection patterns and column mappings for bank statements.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: darkMode ? "0 4px 12px rgba(79, 70, 229, 0.4)" : "0 4px 12px rgba(79, 70, 229, 0.3)",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <Plus size={18} /> Add New Bank
        </button>
      </div>

      {error && !modalOpen && (
        <div style={{ padding: 16, background: darkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2", color: darkMode ? "#fca5a5" : "#b91c1c", borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {success && !modalOpen && (
        <div style={{ padding: 16, background: darkMode ? "rgba(34, 197, 94, 0.2)" : "#dcfce7", color: darkMode ? "#86efac" : "#15803d", borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={20} /> {success}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: theme.textSecondary }}>
          <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-indigo-600 rounded-full mb-4"></div>
          <p>Loading bank configurations...</p>
        </div>
      ) : (
        <div style={{
          background: theme.cardBg,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
          boxShadow: darkMode ? "0 4px 24px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc" }}>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>Bank Name</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>Detection Logic</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}` }}>Mappings</th>
                  <th style={{ padding: "16px 24px", color: theme.textSecondary, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banks.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 32, textAlign: "center", color: theme.textSecondary }}>
                      No bank mappings configured. Click "Add New Bank" to get started.
                    </td>
                  </tr>
                ) : (
                  banks.map((bank) => (
                    <tr key={bank.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: "background 0.2s" }} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td style={{ padding: "16px 24px", color: theme.text, fontWeight: 600, fontSize: 15 }}>{bank.bank_name}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {bank.detection_patterns?.map((set, idx) => (
                            <span key={idx} style={{ padding: "2px 8px", background: darkMode ? "rgba(59, 130, 246, 0.1)" : "#eff6ff", color: "#3b82f6", borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                              {set.join(" + ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {Object.keys(bank.column_mapping || {}).length} rules • {bank.keep_columns?.length || 0} retained
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleOpenModal(bank)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.textSecondary, transition: "color 0.2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = darkMode ? "#a5b4fc" : "#4f46e5"}
                            onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(bank.id, bank.bank_name)}
                            disabled={actionLoading}
                            style={{ background: "transparent", border: "none", cursor: actionLoading ? "not-allowed" : "pointer", color: theme.textSecondary, transition: "color 0.2s", opacity: actionLoading ? 0.5 : 1 }}
                            onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.color = "#ef4444" }}
                            onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                            title="Delete"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Form Modal */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: 20
        }}>
          <div style={{
            background: theme.cardBg,
            borderRadius: 16,
            width: "100%",
            maxWidth: 650,
            maxHeight: "90vh",
            boxShadow: darkMode ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)",
            overflow: "hidden",
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>
                {editingBank ? "Edit Bank Configuration" : "Add New Bank"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: theme.textSecondary, cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                {error && (
                  <div style={{ padding: 12, background: darkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2", color: darkMode ? "#fca5a5" : "#b91c1c", borderRadius: 8, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>Bank Name</label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.inputBg,
                      color: theme.text,
                      fontSize: 14,
                      outline: "none"
                    }}
                    placeholder="e.g. ICICI BANK"
                  />
                </div>

                <DetectionPatternsEditor
                  patterns={formData.detection_patterns}
                  onChange={(val) => setFormData({ ...formData, detection_patterns: val })}
                  darkMode={darkMode}
                  theme={theme}
                />

                <ColumnMappingEditor
                  mapping={formData.column_mapping}
                  onChange={(val) => setFormData({ ...formData, column_mapping: val })}
                  theme={theme}
                />

                <KeepColumnsEditor
                  columns={formData.keep_columns}
                  onChange={(val) => setFormData({ ...formData, keep_columns: val })}
                  theme={theme}
                />
              </div>

              <div style={{ padding: "16px 24px", background: darkMode ? "rgba(255,255,255,0.02)" : "#f8fafc", borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "flex-end", gap: 12, position: 'sticky', bottom: 0, zIndex: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: theme.textSecondary,
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: 8,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Check size={18} />}
                  {editingBank ? "Update" : "Create"} Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const router = useRouter();
  const [username, setUsername] = useState("");
  const { darkMode, setDarkMode } = useDarkMode();
  const [bankType, setBankType] = useState("Standard Chartered");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [tpaMappings, setTpaMappings] = useState({});
  const [isTpaMappingsLoading, setIsTpaMappingsLoading] = useState(true);

  const [bankFile, setBankFile] = useState(null);
  const [advanceFile, setAdvanceFile] = useState(null);
  const [tpaName, setTpaName] = useState("");
  const [tpaChoices, setTpaChoices] = useState([]);
  const [misFile, setMisFile] = useState(null);
  const [outstandingFile, setOutstandingFile] = useState(null);

  // ✅ NEW: Pipeline Mode State ('v2' | 'v1') - Default to 'v2'
  const [pipelineMode, setPipelineMode] = useState("v2");

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stepResults, setStepResults] = useState({});
  const [fileResetKey, setFileResetKey] = useState(0);

  const [aiModalOpen, setAiModalOpen] = useState(false);

  // ✅ NEW: Bulk Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkBankFiles, setBulkBankFiles] = useState([]);
  const [bulkMisFiles, setBulkMisFiles] = useState([]);
  const [bulkOutstandingFile, setBulkOutstandingFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");

  // Memoized consolidated extraction of file keys for Summary Cards to prevent redundant iteration
  const { summaryKey, consolidatedKey } = useMemo(() => {
    let summary = null;
    let consolidated = null;

    if (bulkResult?.files) {
      const keys = Object.keys(bulkResult.files);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const lowerK = k.toLowerCase();

        if (!summary && lowerK.includes("summary")) {
          summary = k;
        }
        if (!consolidated && (lowerK.includes("consolidated") || lowerK.includes("posting"))) {
          consolidated = k;
        }

        if (summary && consolidated) break;
      }
    }

    return { summaryKey: summary, consolidatedKey: consolidated };
  }, [bulkResult?.files]);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewFilename, setPreviewFilename] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reset keys for bulk uploaders to keep them "fresh" after upload
  const [bulkBankResetKey, setBulkBankResetKey] = useState(0);
  const [bulkMisResetKey, setBulkMisResetKey] = useState(0);
  const [bulkOutstandingResetKey, setBulkOutstandingResetKey] = useState(0);
  const [expandedBulkRow, setExpandedBulkRow] = useState(null);

  // Sidebar State - only one can be open at a time
  const [tpaSidebarOpen, setTpaSidebarOpen] = useState(false);
  const [videoSidebarOpen, setVideoSidebarOpen] = useState(false);

  // Handler to open TPA sidebar (closes video sidebar if open)
  const openTpaSidebar = () => {
    setVideoSidebarOpen(false);
    setTpaSidebarOpen(true);
  };

  // Handler to open Video sidebar (closes TPA sidebar if open)
  const openVideoSidebar = () => {
    setTpaSidebarOpen(false);
    setVideoSidebarOpen(true);
  };

  const handleAuthenticatedDownload = async (url, filename) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fullUrl = `${API_BASE.replace(/\/$/, "")}${url}`;
      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Please try again.');
    }
  };

  const handlePreviewFile = async (url, filename) => {
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fullUrl = `${API_BASE.replace(/\/$/, "")}${url}`;
      const response = await fetch(fullUrl, { headers });

      if (!response.ok) throw new Error("Failed to fetch file");

      const arrayBuffer = await response.arrayBuffer();

      const jsonData = await parseExcelWithWorker(arrayBuffer);

      if (jsonData.length > 0) {
        setPreviewColumns(Object.keys(jsonData[0]));
        setPreviewData(jsonData);
      } else {
        setPreviewColumns([]);
        setPreviewData([]);
      }
      setPreviewFilename(filename);
      setPreviewModalOpen(true);
    } catch (e) {
      console.error("Preview failed", e);
      alert("Failed to load file for preview. " + (e.message || ""));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewLocalFile = async (file) => {
    if (!file) return;
    setPreviewLoading(true);
    setPreviewFilename(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const jsonData = await parseExcelWithWorker(arrayBuffer);

      if (jsonData.length > 0) {
        setPreviewColumns(Object.keys(jsonData[0]));
        setPreviewData(jsonData);
      } else {
        setPreviewColumns([]);
        setPreviewData([]);
      }
      setPreviewModalOpen(true);
    } catch (e) {
      console.error("Local preview failed", e);
      alert("Failed to load file for preview. " + (e.message || ""));
    } finally {
      setPreviewLoading(false);
    }
  };

  const [animationData, setAnimationData] = useState(null);


  // Dynamic steps based on pipeline mode
  const steps = useMemo(() => {
    if (pipelineMode === 'v2') {
      return [
        { key: "step1", label: "Upload Bank File", description: "Auto-detects Bank Type" },
        { key: "step2", label: "Upload MIS File", description: "Auto-detects TPA Name" },
        { key: "step3", label: "Upload Outstanding", description: "Final Reconciliation" },
      ];
    } else {
      return [
        { key: "step1", label: "Bank & Advance Statements", description: "Upload both files together" },
        { key: "step2", label: "Match Bank × Advance", description: "Automatic processing" },
        { key: "step3", label: "MIS Mapping", description: "Select TPA & upload MIS" },
        { key: "step4", label: "Outstanding Report", description: "Final matching" },
      ];
    }
  }, [pipelineMode]);


  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("[Dashboard] Not authenticated, redirecting to login");
      router.push("/auth/login");
    } else {
      const user = getUsername();
      setUsername(user || "User");
      console.log("[Dashboard] Authenticated as:", user);

      // Redirect admins to profile page - admins don't use the reconciliation wizard
      const checkAdminAndRedirect = async () => {
        // Import admin check functions
        const { isAdmin } = await import("../../lib/auth");

        if (isAdmin()) {
          console.log("[Dashboard] Admin user detected, rendering admin ui");
          setIsAdminUser(true);
          return;
        }
      };

      checkAdminAndRedirect();
    }
  }, [router]);

  // Fetch dynamic TPA Mappings on load
  useEffect(() => {
    const fetchTpaMappings = async () => {
      try {
        setIsTpaMappingsLoading(true);
        const res = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/api/tpa-mappings`);
        if (res.ok) {
          const data = await res.json();
          // Transform array of mappings into an object map
          const mapData = {};
          if (data && Array.isArray(data)) {
            data.forEach(item => {
              const isActive = item.is_active !== undefined ? item.is_active : true;
              if (isActive) {
                mapData[item.tpa_name] = {
                  "Cheque/ NEFT/ UTR No.": item.cheque_utr_column,
                  "Claim No": item.claim_no_column
                };
              }
            });
          }
          setTpaMappings(mapData);
        } else {
          console.error("Failed to fetch TPA mappings status:", res.status);
        }
      } catch (e) {
        console.error("Failed to fetch TPA mappings:", e);
      } finally {
        setIsTpaMappingsLoading(false);
      }
    };
    if (API_BASE) {
      fetchTpaMappings();
    }
  }, [API_BASE]);

  // Load Lottie animation
  useEffect(() => {
    fetch('/animations/loading.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  useEffect(() => {
    const fetchTpaChoices = async () => {
      try {
        const res = await authenticatedFetch(`${API_BASE.replace(/\/$/, "")}/tpa-choices`);
        if (res.ok) {
          const data = await res.json();
          setTpaChoices(data.tpa_choices || []);
          if (data.tpa_choices && data.tpa_choices.length > 0) {
            setTpaName(data.tpa_choices[0]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch TPA choices:", e);
      }
    };
    if (API_BASE) fetchTpaChoices();
  }, [API_BASE]);

  const handleLogout = () => {
    console.log("[Dashboard] Logout clicked");
    logout();
    window.location.href = "/auth/login";
  };

  const saveStepResult = (idx, resultObj) => {
    // Dynamic link generation logic based on the `files` object returned by API
    let downloadLinks = [];
    if (resultObj.data && resultObj.data.files) {
      // Ignore 'zip' key for regular file list, handled separately
      downloadLinks = Object.entries(resultObj.data.files)
        .filter(([key]) => key !== 'zip')
        .map(([key, url]) => ({
          url: url,
          label: formatFileLabel(key, resultObj.data.counts)
        }));
    }

    setStepResults((prev) => ({
      ...prev,
      [idx]: {
        ...resultObj,
        downloadLinks: downloadLinks,
        zipUrl: resultObj.data?.files?.zip // Extract zip separately if present
      }
    }));
  };

  const uploadStep1 = async () => {
    setError("");
    setLoading(true);

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setLoading(false);
      return false;
    }

    if (!bankFile || (pipelineMode !== 'v2' && !advanceFile)) {
      setError(pipelineMode === 'v2' ? "Please select Bank file." : "Please select both Bank and Advance files.");
      setLoading(false);
      return false;
    }

    try {
      const fd = new FormData();

      // V2 Logic: Bank file only, auto-detect bank type
      if (pipelineMode === 'v2') {
        fd.append("bank_file", bankFile);
      } else {
        // V1 Logic: Bank + Advance, manual bank type
        fd.append("bank_type", bankType);
        fd.append("bank_file", bankFile);
        fd.append("advance_file", advanceFile);
      }

      const endpoint = pipelineMode === 'v2'
        ? `${API_BASE.replace(/\/$/, "")}/reconcile/v2/step1`
        : `${API_BASE.replace(/\/$/, "")}/reconcile/step1`;

      console.log(`[Step1] Sending request to (${pipelineMode}):`, endpoint);

      const res = await authenticatedFetch(endpoint, { method: "POST", body: fd });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json?.detail || json?.error || text;
        } catch {
          errorMsg = text;
        }
        saveStepResult(0, { ok: false, error: errorMsg });
        setError(errorMsg);
        return false;
      }

      const data = await res.json();
      console.log("[Step1] Response:", data);

      if (data.status !== "success") {
        const msg = data.error || "Step-1 failed";
        saveStepResult(0, { ok: false, error: msg });
        setError(msg);
        return false;
      }

      saveStepResult(0, { ok: true, data: data }); // saveStepResult handles link generation dynamically now

      // V2: Auto-set the detected bank type
      if (pipelineMode === 'v2' && data.detected_bank_type) {
        setBankType(data.detected_bank_type);
        // Optionally show a toast or highlight effect here
      }

      return true;
    } catch (e) {
      const msg = e?.message || "Step-1 upload failed";
      console.error("[Step1] Error:", e);
      saveStepResult(0, { ok: false, error: msg });
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadStep2 = async () => {
    setError("");
    setLoading(true);

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setLoading(false);
      return false;
    }

    try {
      let endpoint;
      let options = { method: "POST" };

      if (pipelineMode === 'v2') {
        // V2 Logic: Upload MIS File
        if (!misFile) {
          setError("Please select MIS file.");
          setLoading(false);
          return false;
        }
        const fd = new FormData();
        fd.append("mis_file", misFile);
        endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/v2/step2`;
        options.body = fd;
      } else {
        // V1 Logic: Processing step (Match Bank x Advance)
        endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/step2`;
      }

      console.log(`[Step2] Sending request to (${pipelineMode}):`, endpoint);

      const res = await authenticatedFetch(endpoint, options);

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json?.detail || json?.error || text;
        } catch {
          errorMsg = text;
        }
        saveStepResult(1, { ok: false, error: errorMsg });
        setError(errorMsg);
        return false;
      }

      const data = await res.json();
      console.log("[Step2] Response:", data);

      if (data.status !== "success") {
        const msg = data.error || "Step-2 failed";
        saveStepResult(1, { ok: false, error: msg });
        setError(msg);
        return false;
      }

      saveStepResult(1, { ok: true, data: data });

      // V2: Auto-detect TPA from response
      if (pipelineMode === 'v2' && data.detected_tpa) {
        setTpaName(data.detected_tpa); // We can use this state for display even if dropdown is hidden
      }

      return true;
    } catch (e) {
      const msg = e?.message || "Step-2 processing failed";
      console.error("[Step2] Error:", e);
      saveStepResult(1, { ok: false, error: msg });
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadStep3 = async () => {
    setError("");
    setLoading(true);

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setLoading(false);
      return false;
    }

    if (pipelineMode === 'v2') {
      // V2 Logic: Outstanding Upload (Final Step)
      if (!outstandingFile) {
        setError("Please select Outstanding file.");
        setLoading(false);
        return false;
      }

      try {
        const fd = new FormData();
        fd.append("outstanding_file", outstandingFile);

        const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/v2/step3`;
        console.log("[Step3-V2] Sending request to:", endpoint);

        const res = await authenticatedFetch(endpoint, { method: "POST", body: fd });

        if (!res.ok) {
          const text = await res.text();
          let errorMsg = `HTTP ${res.status}`;
          try {
            const json = JSON.parse(text);
            errorMsg = json?.detail || json?.error || text;
          } catch {
            errorMsg = text;
          }
          saveStepResult(2, { ok: false, error: errorMsg });
          setError(errorMsg);
          return false;
        }

        const data = await res.json();
        console.log("[Step3-V2] Response:", data);

        if (data.status !== "success") {
          const msg = data.error || "Step-3 (V2) failed";
          saveStepResult(2, { ok: false, error: msg });
          setError(msg);
          return false;
        }

        saveStepResult(2, { ok: true, data: data });
        return true;
      } catch (e) {
        const msg = e?.message || "Step-3 (V2) upload failed";
        console.error("[Step3-V2] Error:", e);
        saveStepResult(2, { ok: false, error: msg });
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    }

    // V1 Logic: MIS Upload
    if (!misFile) {
      setError("Please select MIS file.");
      setLoading(false);
      return false;
    }

    if (!tpaName) {
      setError("Please select TPA.");
      setLoading(false);
      return false;
    }

    try {
      const fd = new FormData();
      fd.append("tpa_name", tpaName);
      fd.append("mis_file", misFile);

      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/step3`;
      console.log("[Step3] Sending request to:", endpoint);

      const res = await authenticatedFetch(endpoint, { method: "POST", body: fd });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json?.detail || json?.error || text;
        } catch {
          errorMsg = text;
        }
        saveStepResult(2, { ok: false, error: errorMsg });
        setError(errorMsg);
        return false;
      }

      const data = await res.json();
      console.log("[Step3] Response:", data);

      if (data.status !== "success") {
        const msg = data.error || "Step-3 failed";
        saveStepResult(2, { ok: false, error: msg });
        setError(msg);
        return false;
      }

      saveStepResult(2, { ok: true, data: data });

      return true;
    } catch (e) {
      const msg = e?.message || "Step-3 upload failed";
      console.error("[Step3] Error:", e);
      saveStepResult(2, { ok: false, error: msg });
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadStep4 = async () => {
    setError("");
    setLoading(true);

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setLoading(false);
      return false;
    }

    if (!outstandingFile) {
      setError("Please select Outstanding file.");
      setLoading(false);
      return false;
    }

    try {
      const fd = new FormData();
      fd.append("outstanding_file", outstandingFile);

      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/step4`;
      console.log("[Step4] Sending request to:", endpoint);

      const res = await authenticatedFetch(endpoint, { method: "POST", body: fd });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json?.detail || json?.error || text;
        } catch {
          errorMsg = text;
        }
        saveStepResult(3, { ok: false, error: errorMsg });
        setError(errorMsg);
        return false;
      }

      const data = await res.json();
      console.log("[Step4] Response:", data);

      if (data.status !== "success") {
        const msg = data.error || "Step-4 failed";
        saveStepResult(3, { ok: false, error: msg });
        setError(msg);
        return false;
      }

      saveStepResult(3, { ok: true, data: data });

      return true;
    } catch (e) {
      const msg = e?.message || "Step-4 upload failed";
      console.error("[Step4] Error:", e);
      saveStepResult(3, { ok: false, error: msg });
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Bulk Reconciliation Handler (Streaming NDJSON)
  const handleBulkReconcile = async () => {
    setError("");
    setBulkLoading(true);
    setBulkResult({ summary: [], files: {}, bank_file_dates: {} }); // Initialize for real-time updates
    setProcessingStatus("Initializing...");

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setBulkLoading(false);
      return;
    }

    if (bulkBankFiles.length === 0) {
      setError("Please select at least one Bank Statement file.");
      setBulkLoading(false);
      return;
    }

    if (bulkMisFiles.length === 0) {
      setError("Please select at least one MIS file.");
      setBulkLoading(false);
      return;
    }

    if (!bulkOutstandingFile) {
      setError("Please select the Outstanding file.");
      setBulkLoading(false);
      return;
    }

    try {
      const fd = new FormData();
      bulkBankFiles.forEach(file => fd.append("bank_files", file));
      bulkMisFiles.forEach(file => fd.append("mis_files", file));
      fd.append("outstanding_file", bulkOutstandingFile);

      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/v2/bulk`;
      console.log("[Bulk] Sending request to:", endpoint);

      // 1. Fetch with authentication
      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: fd
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `HTTP ${response.status}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json?.detail || json?.error || text;
        } catch {
          errorMsg = text;
        }
        throw new Error(errorMsg);
      }

      // 2. Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      console.log("[Bulk] Stream connection established. Reading...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[Bulk] Stream complete.");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last part if it's not a complete line yet
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            
            // Triple-check capture of bank_file_dates from any part of the event
            const incomingDates = event.bank_file_dates || 
                                 (event.data && event.data.bank_file_dates) || 
                                 (event.summary && event.summary.bank_file_dates);

            if (incomingDates && typeof incomingDates === 'object') {
              setBulkResult(prev => ({
                ...prev,
                bank_file_dates: { ...(prev?.bank_file_dates || {}), ...incomingDates }
              }));
            }

            console.log("[Bulk] Event:", event);

            // Handle Event Types
            if (event.type === 'init') {
              setProcessingStatus("Initializing...");
            }
            else if (event.type === 'progress') {
              setProcessingStatus(event.msg || "Processing...");
            }
            else if (event.type === 'pair_result') {
              // Append to summary immediately
              if (event.data) {
                setBulkResult(prev => {
                  const currentSummary = Array.isArray(prev?.summary) ? prev.summary : [];
                  const currentFiles = prev?.files || {};

                  // If the event carries file paths/URLs (anticipated improvement)
                  const newFiles = event.files || {};

                  return {
                    ...prev,
                    summary: [...currentSummary, event.data],
                    files: { ...currentFiles, ...newFiles },
                    bank_file_dates: { ...(prev?.bank_file_dates || {}), ...(event.bank_file_dates || {}) }
                  };
                });
              }
            }
            else if (event.type === 'error') {
              const errMsg = event.msg || "Unknown error in stream";
              setError(errMsg);
            }
            else if (event.type === 'final_summary') {
              // Finalize
              console.log("[Bulk] Final Summary Received:", event);
              setProcessingStatus("Consolidating...");
              setTimeout(() => {
                setBulkResult(prev => {
                  // If event.data is a non-empty array, use it (authoritative).
                  // Otherwise, keep what we have (accumulated).
                  const finalSummary = (Array.isArray(event.data) && event.data.length > 0)
                    ? event.data
                    : (prev?.summary || []);

                  // Merge files (accumulated + final)
                  // Make sure we don't lose existing files if event.files is empty/undefined
                  const incomingFiles = event.files || {};
                  const finalFiles = { ...(prev?.files || {}), ...incomingFiles };

                  console.log("[Bulk] Final Files State:", finalFiles); // Debugging

                  return {
                    ...prev,
                    summary: finalSummary,
                    files: finalFiles, // Ensure this is not overwritten by empty object
                    zip_url: event.zip_url || prev?.zip_url,
                    bank_file_dates: { 
                      ...(prev?.bank_file_dates || {}), 
                      ...(event.bank_file_dates || {}),
                      ...((event.summary && event.summary.bank_file_dates) || {}),
                      ...((event.data && event.data.bank_file_dates) || {})
                    }
                  };
                });
              }, 500);
            }

          } catch (err) {
            console.error("[Bulk] JSON Parse Error for line:", line, err);
          }
        }
      }

      // Final cleanup of buffer if any
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === 'final_summary') {
            setBulkResult(prev => ({
              ...prev,
              summary: event.data,
              files: event.files,
              zip_url: event.zip_url,
              bank_file_dates: { 
                ...(prev?.bank_file_dates || {}), 
                ...(event.bank_file_dates || {}),
                ...((event.summary && event.summary.bank_file_dates) || {}),
                ...((event.data && event.data.bank_file_dates) || {})
              }
            }));
          }
        } catch (e) {
          console.error("Error parsing final buffer:", e);
        }
      }

      // Ensure we finish cleanly
      setProcessingStatus("Complete");

    } catch (e) {
      const msg = e?.message || "Bulk upload failed";
      console.error("[Bulk] Error:", e);
      setError(msg);
    } finally {
      setBulkLoading(false);
      setProcessingStatus("");
    }
  };


  const handleNext = async () => {
    setError("");
    let ok = false;

    if (activeStep === 0) {
      ok = await uploadStep1();
      if (ok) {
        setBankFile(null);
        setAdvanceFile(null);
        setFileResetKey((k) => k + 1);
      }
    } else if (activeStep === 1) {
      ok = await uploadStep2();
    } else if (activeStep === 2) {
      ok = await uploadStep3();
      if (ok) {
        // Correctly clean up based on what step passed
        if (pipelineMode === 'v2') {
          setOutstandingFile(null); // Step 3 in V2 consumes Outstanding file
        } else {
          setMisFile(null); // Step 3 in V1 consumes MIS file
        }
        setFileResetKey((k) => k + 1);
      }
    } else if (activeStep === 3) {
      // V1 Only
      if (pipelineMode !== 'v2') {
        ok = await uploadStep4();
        if (ok) {
          setOutstandingFile(null);
          setFileResetKey((k) => k + 1);
        }
      }
    }

    if (ok) {
      setActiveStep((s) => Math.min(s + 1, steps.length));
    }
  };

  const handleBack = () => {
    setError("");
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const handleReset = () => {
    setBankFile(null);
    setAdvanceFile(null);
    setMisFile(null);
    setOutstandingFile(null);
    setStepResults({});
    setActiveStep(0);
    setError("");
    setFileResetKey((k) => k + 1);
    setBankType("Standard Chartered");
    if (tpaChoices.length > 0) setTpaName(tpaChoices[0]);
    setBulkBankFiles([]);
    setBulkMisFiles([]);
    setBulkOutstandingFile(null);
    setBulkResult(null);
    setBulkBankResetKey(k => k + 1);
    setBulkMisResetKey(k => k + 1);
    setBulkOutstandingResetKey(k => k + 1);
    setExpandedBulkRow(null);

  };

  // Handle pipeline mode switch
  const handleModeSwitch = (mode) => {
    if (mode === pipelineMode) return;
    setPipelineMode(mode);
    handleReset(); // Reset everything when switching modes
  };

  // Power/Shutdown Icon Component
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

  const canProceed = useMemo(() => {
    // V2 Logic
    if (pipelineMode === 'v2') {
      if (activeStep === 0) return bankFile; // Only Bank File needed
      if (activeStep === 1) return misFile;  // Only MIS File needed
      if (activeStep === 2) return outstandingFile; // Only Outstanding File needed
      return false;
    }

    // V1 Logic
    if (activeStep === 0) return bankFile && advanceFile;
    if (activeStep === 1) return stepResults[0]?.ok;
    if (activeStep === 2) return misFile && tpaName;
    if (activeStep === 3) return outstandingFile;
    return false;
  }, [activeStep, bankFile, advanceFile, misFile, outstandingFile, tpaName, stepResults, pipelineMode]);

  const bankShadowColor = bankType === "Standard Chartered"
    ? "rgba(0,114,206,0.2)"
    : bankType === "ICICI"
      ? "rgba(191,42,42,0.2)"
      : "rgba(135,31,66,0.25)";

  const getFileAccept = () => {
    if (activeStep === 0) {
      if (pipelineMode === 'v2') {
        return {
          bank: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        };
      }
      return {
        bank: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
        advance: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      };
    }
    // Step 2 in V2 is MIS upload
    if (pipelineMode === 'v2' && activeStep === 1) {
      return {
        mis: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      };
    }
    // Step 3 in V2 is Outstanding upload
    if (pipelineMode === 'v2' && activeStep === 2) {
      return {
        outstanding: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      };
    }

    return {
      mis: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
      outstanding: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
    };
  };

  const accepts = getFileAccept();

  // Theme colors based on dark mode
  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
    inputBg: darkMode ? "#334155" : "#f8f8f8",
  };

  return (
    <>
      <div style={{
        background: theme.bg,
        minHeight: "100vh",
        transition: "background 0.3s ease"
      }}>
        {/* Navbar with sparkles container */}
        {/* Navbar with sparkles container */}
        <div style={{ position: "relative", zIndex: 50 }}>
          {/* Navbar moved to layout */}
        </div>


        <SideNote darkMode={darkMode} />

        <main style={{
          margin: "0 auto",
          maxWidth: isAdminUser ? "1200px" : "900px",
          width: "100%",
          padding: "24px 16px",
          boxSizing: "border-box"
        }}>

          {isAdminUser && (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 transform hover:scale-[1.01] transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Admin Control Center</h2>
                  <p className="text-indigo-100 font-medium opacity-90 italic">New executive summary, operations review, and system diagnostics are live.</p>
                </div>
              </div>
              <button 
                  onClick={() => window.location.href = '/admin/summary'}
                  className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all flex items-center gap-2 group"
                >
                Go to Admin Dashboard
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          )}

          {isAdminUser ? (
            <>
              <TpaConfigurationManager darkMode={darkMode} apiBase={API_BASE} />
              <BankConfigurationManager darkMode={darkMode} apiBase={API_BASE} />
            </>
          ) : (
            <>          {/* Hero Section with sparkles */}
              <div style={{
                position: "relative",
                background: "#000000",
                padding: "48px 32px",
                borderRadius: "16px",
                marginBottom: "32px",
                color: "white",
                textAlign: "center",
                overflow: "hidden"
              }}>
                {/* Sparkles for hero section - using memoized component */}
                <HeroSparkles />

                {/* Hero content */}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white drop-shadow-sm">
                    Reconciliation Wizard
                  </h1>
                  <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
                    {pipelineMode === 'v2'
                      ? "Experience the new fully automated 3-step V2 pipeline."
                      : "Streamline your financial reconciliation in 4 simple steps."}
                    <br />
                    Process bank statements, match transactions, and generate reports automatically.
                  </p>

                  {/* Pipeline Toggle Switch */}
                  <div className="flex justify-center mb-8">
                    <div className={`p-1 rounded-full flex relative ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100 border border-gray-200'}`}>
                      <button
                        onClick={() => handleModeSwitch('v2')}
                        className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${pipelineMode === 'v2'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                          : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
                          }`}
                      >
                        🚀 V2 (Auto + Bulk)
                      </button>
                      <button
                        onClick={() => handleModeSwitch('v1')}
                        className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${pipelineMode === 'v1'
                          ? 'bg-white text-gray-900 shadow-md'
                          : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
                          }`}
                      >
                        Values (Legacy)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-8 mt-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[120px]">
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-blue-400 to-blue-600">4</div>
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Simple Steps</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[120px]">
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-purple-400 to-purple-600">3</div>
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Bank Types</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[120px]">
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-emerald-400 to-emerald-600">15+</div>
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">TPAs</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[120px]">
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-amber-400 to-amber-600">100%</div>
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Automated</div>
                    </div>
                  </div>
                </div>
              </div>

              {!API_BASE && (
                <div style={{
                  background: darkMode ? "#451a03" : "#fff3cd",
                  border: `1px solid ${darkMode ? "#78350f" : "#ffeeba"}`,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  color: darkMode ? "#fef3c7" : "#856404"
                }}>
                  <strong>Note:</strong> <code>NEXT_PUBLIC_API_BASE_URL</code> is not set.
                </div>
              )}

              {/* Enhanced Stepper */}
              <Box sx={{
                width: "100%",
                mb: 3,
                background: theme.cardBg,
                padding: 3,
                borderRadius: 3,
                boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                border: darkMode ? "1px solid #334155" : "none"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
                  <Typography variant="h6" component="h2" style={{ fontWeight: 600, margin: 0, color: theme.text }}>
                    Reconciliation Progress
                  </Typography>
                  <Typography variant="body2" style={{ color: theme.textSecondary }}>
                    {Object.keys(stepResults).filter(k => stepResults[k]?.ok).length} of {steps.length} steps completed
                  </Typography>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: "8px",
                  background: darkMode ? "#334155" : "#e0e0e0",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "24px"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(Object.keys(stepResults).filter(k => stepResults[k]?.ok).length / steps.length) * 100}%`,
                    background: "linear-gradient(90deg, #10b981, #059669)",
                    transition: "width 0.5s ease"
                  }}></div>
                </div>

                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((s, idx) => {
                    const isComplete = !!stepResults[idx]?.ok;
                    const isCurrent = idx === activeStep;

                    return (
                      <Step key={s.key} completed={isComplete}>
                        <StepLabel
                          StepIconProps={{
                            sx: {
                              '&.Mui-completed': { color: '#10b981' },
                              '&.Mui-active': {
                                color: bankType === "Standard Chartered" ? "#0072ce" : bankType === "ICICI" ? "#bf2a2a" : "#871f42",
                                transform: 'scale(1.1)'
                              },
                              '&.MuiStepIcon-root': {
                                color: darkMode ? '#64748b' : '#bdbdbd'
                              }
                            }
                          }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <div style={{
                              fontWeight: isCurrent ? 600 : 400,
                              fontSize: "14px",
                              color: darkMode ? (isCurrent ? '#f1f5f9' : '#cbd5e1') : '#000'
                            }}>
                              {s.label}
                            </div>
                            <div style={{
                              fontSize: "11px",
                              color: darkMode ? '#94a3b8' : '#666',
                              marginTop: "2px"
                            }}>
                              {s.description}
                            </div>
                            {isComplete && stepResults[idx]?.data?.counts && (
                              <div style={{
                                fontSize: "10px",
                                color: "#10b981",
                                marginTop: "4px",
                                fontWeight: 500
                              }}>
                                {/* Display specific count logic or just total files */}
                                ✓ Done
                              </div>
                            )}
                          </div>
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </Box>

              {activeStep < steps.length && (
                <div style={{
                  borderRadius: 16,
                  padding: 24,
                  background: darkMode
                    ? "linear-gradient(135deg, #1e293b, #0f172a)"
                    : "linear-gradient(135deg, #f0f4ff, #ffffff)",
                  boxShadow: darkMode
                    ? `0 0 50px rgba(79, 70, 229, 0.2)`
                    : `0 0 50px ${bankShadowColor}`,
                  transition: "all 0.3s ease",
                  border: darkMode ? "1px solid #334155" : "none"
                }}>

                  {activeStep === 0 && (
                    <>
                      {/* Bank Type Selection - Visible in both modes, but disabled in V2 */}
                      <div style={{ marginBottom: 24, opacity: 1, transition: "opacity 0.3s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontWeight: 600, fontSize: "16px", color: theme.text }}>
                              {pipelineMode === 'v2' ? "Auto-detects Bank Type" : "Select Bank Type"}
                            </label>
                            <Tooltip title={pipelineMode === 'v2' ? "Bank type is auto-detected from the uploaded file" : "Choose between ICICI, AXIS, or Standard Chartered"} arrow>
                              <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 16 }}>ℹ️</span>
                            </Tooltip>
                          </div>

                          {/* ✅ NEW: Bulk Mode Toggle */}
                          {pipelineMode === 'v2' && (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isBulkMode ? "text-blue-500" : "text-gray-500"}`}>Bulk Mode</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={isBulkMode}
                                  onChange={(e) => setIsBulkMode(e.target.checked)}
                                  aria-label="Bulk Mode Toggle"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          )}
                        </div>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "20px",
                          width: "100%",
                          pointerEvents: pipelineMode === 'v2' ? "none" : "auto"
                        }}>
                          {["Standard Chartered", "ICICI", "AXIS"].map((bank) => (
                            <div key={bank} onClick={() => setBankType(bank)} style={{ cursor: "pointer", height: "100%" }}>
                              <WobbleCard
                                containerClassName="h-full transition-all duration-300 shadow-xl group"
                                style={{
                                  backgroundImage: (bankType === bank || pipelineMode === 'v2')
                                    ? (bank === "Standard Chartered"
                                      ? "linear-gradient(135deg, #003087 0%, #0056b3 100%)"
                                      : bank === "ICICI"
                                        ? "linear-gradient(135deg, #871f42 0%, #f37021 100%)"
                                        : "linear-gradient(135deg, #871242 0%, #be185d 100%)")
                                    : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                                  borderRadius: "1rem",
                                  overflow: "hidden",
                                  position: "relative",
                                  minHeight: "150px",
                                  border: (bankType === bank && pipelineMode !== 'v2') ? "2px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.1)"
                                }}
                                className="p-4 flex flex-col justify-between h-full relative"
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 10 }}>
                                  <div>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "2px", color: "white" }}>
                                      {bank}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.7)" }}>
                                      {bank === "Standard Chartered" ? "Global Banking" : "Private Sector"}
                                    </div>
                                  </div>
                                  <div style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {(bankType === bank && pipelineMode !== 'v2') && (
                                      <div style={{ background: "rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", padding: "5px", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                        <Check size={14} color="white" strokeWidth={3} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ marginTop: "auto", position: "relative", zIndex: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "rgba(255,255,255,0.9)" }}>
                                    {pipelineMode === 'v2' ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px", backdropFilter: "blur(4px)" }}>
                                        <FileSpreadsheet size={12} />
                                        <span>Bank Statement Protocol</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px", backdropFilter: "blur(4px)" }}>
                                          {bank === "AXIS" ? <FileSpreadsheet size={12} /> : <FileSpreadsheet size={12} />}
                                          <span>Bank</span>
                                        </div>
                                        <span style={{ opacity: 0.5 }}>+</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px", backdropFilter: "blur(4px)" }}>
                                          {bank === "AXIS" ? <FileSpreadsheet size={12} /> : <FileSpreadsheet size={12} />}
                                          <span>Advance</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div style={{
                                  position: "absolute",
                                  right: "-15px",
                                  bottom: "-15px",
                                  opacity: 0.25,
                                  pointerEvents: "none",
                                  zIndex: 0,
                                  transform: "rotate(-15deg)"
                                }}>
                                  <Landmark size={120} color="white" />
                                </div>
                              </WobbleCard>
                            </div>
                          ))}
                        </div>
                        <small style={{ display: "block", marginTop: 10, color: theme.textSecondary, fontSize: "13px" }}>
                          {(bankType === "Standard Chartered" && pipelineMode !== 'v2') ? "📊 Standard Chartered: Format coming soon" : null}
                        </small>
                      </div>



                      {/* File Upload Cards */}
                      <div className={`grid gap-6 mt-6 ${pipelineMode === 'v2' ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`} style={isBulkMode ? { display: isBulkMode ? 'block' : 'grid' } : {}}>
                        {/* File Upload Cards for Bulk Mode */}
                        {isBulkMode ? (
                          <>
                            {/* Bulk: Bank Statements (Multiple) */}
                            <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                              }`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                                    📚
                                  </div>
                                  <div>
                                    <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Bank Statements</h3>
                                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                                      Multiple Files Allowed
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* File List displayed ABOVE upload area */}
                              {bulkBankFiles.length > 0 && (
                                <div className="mb-4 space-y-2">
                                  {bulkBankFiles.map((file, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-lg">📄</span>
                                        <span className={`text-sm truncate ${darkMode ? "text-white" : "text-gray-700"}`}>{file.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handlePreviewLocalFile(file)}
                                          className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-700 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                                          title="Preview File"
                                        >
                                          {previewLoading && previewFilename === file.name ? (
                                            <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                          ) : (
                                            <Eye size={16} />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => setBulkBankFiles(prev => prev.filter((_, i) => i !== idx))}
                                          className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <FileUpload
                                key={`bulk-bank-${bulkBankResetKey}`}
                                accept={accepts.bank}
                                multiple={true}
                                onChange={(files) => {
                                  if (files.length > 0) {
                                    setBulkBankFiles(prev => [...prev, ...files]);
                                    setBulkBankResetKey(k => k + 1);
                                  }
                                }}
                                uploaderId="bulk-bank-upload"
                                darkMode={darkMode}
                              />
                            </div>

                            <div className="h-12"></div>

                            {/* Bulk: MIS Files (Multiple) */}
                            <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                              }`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${darkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                                    📑
                                  </div>
                                  <div>
                                    <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>MIS Files</h3>
                                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                                      Multiple Files Allowed
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* File List displayed ABOVE upload area */}
                              {bulkMisFiles.length > 0 && (
                                <div className="mb-4 space-y-2">
                                  {bulkMisFiles.map((file, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-lg">📊</span>
                                        <span className={`text-sm truncate ${darkMode ? "text-white" : "text-gray-700"}`}>{file.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handlePreviewLocalFile(file)}
                                          className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-700 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                                          title="Preview File"
                                        >
                                          {previewLoading && previewFilename === file.name ? (
                                            <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                          ) : (
                                            <Eye size={16} />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => setBulkMisFiles(prev => prev.filter((_, i) => i !== idx))}
                                          className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <FileUpload
                                key={`bulk-mis-${bulkMisResetKey}`}
                                accept={accepts.mis}
                                multiple={true}
                                onChange={(files) => {
                                  if (files.length > 0) {
                                    setBulkMisFiles(prev => [...prev, ...files]);
                                    setBulkMisResetKey(k => k + 1);
                                  }
                                }}
                                uploaderId="bulk-mis-upload"
                                darkMode={darkMode}
                              />
                            </div>

                            <div className="h-12"></div>

                            {/* Bulk: Outstanding File (Single) */}
                            <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                              }`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${darkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                                    📋
                                  </div>
                                  <div>
                                    <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Outstanding Report</h3>
                                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                                      Single File (Master)
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {bulkOutstandingFile && (
                                <div className={`mb-4 flex items-center justify-between p-2 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-lg">✅</span>
                                    <span className={`text-sm truncate ${darkMode ? "text-white" : "text-gray-700"}`}>{bulkOutstandingFile.name}</span>
                                  </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handlePreviewLocalFile(bulkOutstandingFile)}
                                        className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-700 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                                        title="Preview File"
                                      >
                                        {previewLoading && previewFilename === bulkOutstandingFile.name ? (
                                          <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                        ) : (
                                          <Eye size={16} />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setBulkOutstandingFile(null)}
                                        className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                </div>
                              )}

                              <FileUpload
                                key={`bulk-outstanding-${bulkOutstandingResetKey}`}
                                accept={accepts.outstanding}
                                multiple={false}
                                onChange={(files) => {
                                  if (files.length > 0) {
                                    setBulkOutstandingFile(files[0] || null);
                                    setBulkOutstandingResetKey(k => k + 1);
                                  }
                                }}
                                uploaderId="bulk-outstanding-upload"
                                darkMode={darkMode}
                              />
                            </div>

                            {/* Run Bulk Button */}
                            <div className="mt-12 flex justify-center">
                              <FancyButton
                                onClick={handleBulkReconcile}
                                disabled={bulkLoading}
                                borderRadius="1.75rem"
                                className="bg-black dark:bg-slate-900 text-white dark:text-white border-neutral-200 dark:border-slate-800 w-auto px-8 py-3"
                              >
                                {bulkLoading ? "Processing..." : "Run Bulk Reconciliation"}
                              </FancyButton>
                            </div>

                            {/* Bulk Results - Full Width Container */}
                            {bulkResult && (
                              <div
                                className={`mt-12 py-8 border-y shadow-sm ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-200"}`}
                                style={{
                                  width: "100vw",
                                  position: "relative",
                                  left: "50%",
                                  right: "50%",
                                  marginLeft: "-50vw",
                                  marginRight: "-50vw",
                                  paddingLeft: "max(2rem, calc((100vw - 1600px) / 2))",
                                  paddingRight: "max(2rem, calc((100vw - 1600px) / 2))",
                                }}
                              >
                                <div className="flex flex-col mb-8 px-4 gap-4">
                                  <div className="flex items-center justify-between">
                                    <h3 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                                      Bulk Reconciliation Results
                                    </h3>
                                  </div>

                                  {/* Inline Progress Indicator */}
                                  {bulkLoading && (
                                    <div className={`rounded-xl p-6 border ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
                                      <div className="flex items-start gap-4">
                                        {/* Mini Spinner / Lottie */}
                                        <div style={{ width: "48px", height: "48px", flexShrink: 0 }}>
                                          {animationData ? (
                                            <Lottie
                                              animationData={animationData}
                                              loop={true}
                                              style={{ width: "100%", height: "100%" }}
                                            />
                                          ) : (
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
                                          )}
                                        </div>

                                        <div className="flex-1">
                                          <h4 className={`text-lg font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                            {processingStatus || "Processing..."}
                                          </h4>
                                          <p className={`text-sm mb-3 ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                                            Updating results in real-time.
                                          </p>

                                          {/* Progress Bar */}
                                          <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-blue-500 animate-[shimmer_2s_infinite]"
                                              style={{
                                                width: '100%',
                                                backgroundSize: '200% auto',
                                                backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)'
                                              }}>
                                            </div>
                                          </div>

                                          {/* Warning */}
                                          <div className={`text-xs font-semibold flex items-center gap-2 ${darkMode ? "text-amber-400" : "text-amber-700"}`}>
                                            <AlertCircle size={14} />
                                            <span>Please do not reload or close this page until the process is complete.</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-4">
                                  {/* Overall Summary Report Card */}
                                  {(() => {
                                    const filesObj = bulkResult.files || {};
                                    // The value in filesObj is the URL. The key is the filename.
                                    const fileUrl = summaryKey ? filesObj[summaryKey] : null;
                                    const fileName = summaryKey || "Overall Summary Report.xlsx";

                                    return (
                                      <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm relative overflow-hidden group hover:shadow-lg ${darkMode ? "border-slate-700 hover:shadow-slate-700/50" : "border-blue-100 hover:shadow-blue-100"}`}>
                                        {/* Gradient Background */}
                                        <div className={`absolute inset-0 opacity-10 ${darkMode ? "bg-gradient-to-br from-blue-600 to-cyan-400" : "bg-gradient-to-br from-blue-500 to-cyan-300"}`} />

                                        <div className="relative z-10 flex items-start justify-between">
                                          <div className="flex gap-4">
                                            <div className={`p-3 rounded-xl h-fit shadow-sm ${darkMode ? "bg-slate-800 text-blue-400" : "bg-white text-blue-600"}`}>
                                              <FileText size={32} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                              <h4 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Overall Summary Report</h4>
                                              <p className={`text-sm mb-4 font-medium opacity-80 ${darkMode ? "text-slate-300" : "text-gray-600"}`}>{fileName}</p>

                                              <div className="flex gap-3">
                                                {fileUrl ? (
                                                  <>
                                                    <button
                                                      onClick={() => handleAuthenticatedDownload(fileUrl, fileName)}
                                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                                                    >
                                                      <Download size={16} />
                                                      Download
                                                    </button>
                                                    <button
                                                      onClick={() => handlePreviewFile(fileUrl, fileName)}
                                                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all active:scale-95 ${darkMode ? "bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" : "bg-white/60 border-blue-200 text-blue-700 hover:bg-white"}`}
                                                    >
                                                      {previewLoading && previewFilename === fileName ? (
                                                        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                      ) : (
                                                        <Eye size={16} />
                                                      )}
                                                      Preview
                                                    </button>
                                                  </>
                                                ) : (
                                                  <span className="text-sm text-gray-400 italic">
                                                    {bulkLoading ? "Wait for completion..." : "File not found"}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Consolidated Matches Card */}
                                  {(() => {
                                    const filesObj = bulkResult.files || {};
                                    const fileUrl = consolidatedKey ? filesObj[consolidatedKey] : null;
                                    const fileName = consolidatedKey || "Final posting sheet (Consolidated).xlsx";

                                    return (
                                      <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm relative overflow-hidden group hover:shadow-lg ${darkMode ? "border-slate-700 hover:shadow-slate-700/50" : "border-blue-100 hover:shadow-blue-100"}`}>
                                        {/* Gradient Background */}
                                        <div className={`absolute inset-0 opacity-10 ${darkMode ? "bg-gradient-to-br from-emerald-600 to-teal-400" : "bg-gradient-to-br from-emerald-500 to-teal-300"}`} />

                                        <div className="relative z-10 flex items-start justify-between">
                                          <div className="flex gap-4">
                                            <div className={`p-3 rounded-xl h-fit shadow-sm ${darkMode ? "bg-slate-800 text-emerald-400" : "bg-white text-emerald-600"}`}>
                                              <FileSpreadsheet size={32} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                              <h4 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Final posting sheet (Consolidated)</h4>
                                              <p className={`text-sm mb-4 font-medium opacity-80 ${darkMode ? "text-slate-300" : "text-gray-600"}`}>{fileName}</p>

                                              <div className="flex gap-3">
                                                {fileUrl ? (
                                                  <>
                                                    <button
                                                      onClick={() => handleAuthenticatedDownload(fileUrl, fileName)}
                                                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                                                    >
                                                      <Download size={16} />
                                                      Download
                                                    </button>
                                                    <button
                                                      onClick={() => handlePreviewFile(fileUrl, fileName)}
                                                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all active:scale-95 ${darkMode ? "bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700" : "bg-white/60 border-emerald-200 text-emerald-700 hover:bg-white"}`}
                                                    >
                                                      {previewLoading && previewFilename === fileName ? (
                                                        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                      ) : (
                                                        <Eye size={16} />
                                                      )}
                                                      Preview
                                                    </button>
                                                  </>
                                                ) : (
                                                  <span className="text-sm text-gray-400 italic">
                                                    {bulkLoading ? "Wait for completion..." : "File not found"}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                

                                {/* Results Table */}
                                {bulkResult.summary && (
                                  <div className={`mx-4 overflow-hidden border rounded-xl shadow-sm ${darkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-left">
                                        <thead className={`text-xs uppercase font-semibold ${darkMode ? "bg-slate-700/50 text-slate-300" : "bg-gray-50 text-gray-500"}`}>
                                          <tr>
                                            <th className="px-6 py-4 whitespace-nowrap">Bank File</th>
                                            <th className="px-6 py-4 whitespace-nowrap">MIS File</th>
                                            <th className="px-6 py-4 whitespace-nowrap">Bank Type</th>
                                            <th className="px-6 py-4 whitespace-nowrap">TPA</th>
                                            <th className="px-4 py-4 text-center whitespace-nowrap">Bank Rows</th>
                                            <th className="px-4 py-4 text-center whitespace-nowrap">MIS Rows</th>
                                            <th className="px-4 py-4 text-center whitespace-nowrap">Step 2 Match</th>
                                            <th className="px-4 py-4 text-center whitespace-nowrap">Final Auto</th>
                                            <th className="px-4 py-4 text-center whitespace-nowrap">Review Match</th>
                                            <th className="px-6 py-4 whitespace-nowrap">Status</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody className={`divide-y ${darkMode ? "divide-slate-700" : "divide-gray-100"}`}>
                                          {bulkResult.summary.map((row, idx) => {
                                            const isExpanded = expandedBulkRow === idx;
                                            const outputFileName = row["Output File"] || row["Result File"] || `Result_${idx}.xlsx`;

                                            // Determine if we have any files to show
                                            const hasFiles = (row.produced_files && Object.keys(row.produced_files).length > 0) ||
                                              (bulkResult.files && (bulkResult.files[row["Output File"]] || bulkResult.files[row["Result File"]]));

                                            // Bank Card Style Helper
                                            const getBankCardStyle = (type) => {
                                              const t = (type || "").toLowerCase();
                                              if (t.includes("standard")) return { background: "linear-gradient(135deg, #003087 0%, #0056b3 100%)", icon: "💎" }; // Standard Chartered Blue
                                              if (t.includes("icici")) return { background: "linear-gradient(135deg, #871f42 0%, #f37021 100%)", icon: "🟠" }; // ICICI Orange/Red
                                              if (t.includes("axis")) return { background: "linear-gradient(135deg, #871242 0%, #be185d 100%)", icon: "🔴" }; // Axis Maroon/Pink
                                              return { background: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)", icon: "🏦" }; // Default Gray
                                            };
                                            const bankStyle = getBankCardStyle(row["Bank Type"]);

                                            return (
                                              <React.Fragment key={idx}>
                                                <tr className={`transition-colors ${darkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-50"} ${isExpanded ? (darkMode ? "bg-slate-700/30" : "bg-gray-50") : ""}`}>
                                                  <td className={`px-6 py-4 font-medium max-w-[200px] ${darkMode ? "text-slate-200" : "text-gray-900"}`} title={row["Bank File"]}>
                                                    <div className="truncate">{row["Bank File"]}</div>
                                                    {(bulkResult.bank_file_dates?.[row["Bank File"]] || row.bank_file_dates?.[row["Bank File"]]) && (
                                                      <div className="text-[10px] text-indigo-500 font-bold mt-1 flex items-center gap-1">
                                                        <span>📅</span> {bulkResult.bank_file_dates?.[row["Bank File"]] || row.bank_file_dates?.[row["Bank File"]]}
                                                      </div>
                                                    )}
                                                  </td>
                                                  <td className={`px-6 py-4 max-w-[200px] truncate ${darkMode ? "text-slate-400" : "text-gray-600"}`} title={row["MIS File"]}>
                                                    {row["MIS File"]}
                                                  </td>
                                                  <td className="px-6 py-4">
                                                    <span
                                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold text-white shadow-sm uppercase tracking-wide"
                                                      style={{ background: bankStyle.background }}
                                                    >
                                                      {row["Bank Type"] || "UNKNOWN"}
                                                    </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-blue-500 font-medium max-w-[150px] truncate">
                                                    {row["TPA"] || "IHX (Original MIS)"}
                                                  </td>
                                                  <td className={`px-4 py-4 text-center ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                                                    {row["Bank Rows"] || 0}
                                                  </td>
                                                  <td className={`px-4 py-4 text-center ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                                                    {row["MIS Rows"] || 0}
                                                  </td>
                                                  <td className={`px-4 py-4 text-center ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                                                    {row["Step 2 Match"] || 0}
                                                  </td>
                                                  <td className={`px-4 py-4 text-center font-bold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                                    {row["Final Match"] || 0}
                                                  </td>
                                                  <td className={`px-4 py-4 text-center font-bold ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
                                                    {row["Review Match"] || 0}
                                                  </td>
                                                  <td className="px-6 py-4">
                                                    {(() => {
                                                      const status = (row.Status || "").toLowerCase();
                                                      const errorText = row.Error || "";
                                                      const errorInfo = status === "failed" || errorText ? categorizeError(errorText) : null;
                                                      
                                                      let badgeClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"; 
                                                      let displayStatus = row.Status || "Unknown";
                                                      let icon = null;

                                                      if (status === "success" || status === "completed") {
                                                        badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                                                        displayStatus = "Success";
                                                      } else if (status === "pending" || status === "processing" || status === "generating") {
                                                        badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                                                      } else if (errorInfo) {
                                                        displayStatus = errorInfo.type === "User Input Error" ? "Input Error" : "System Error";
                                                        icon = <span>{errorInfo.icon}</span>;
                                                      }

                                                      return (
                                                        <Tooltip 
                                                          title={errorInfo ? (
                                                            <div className="p-2 max-w-[250px]">
                                                              <div className="font-bold mb-1">{errorInfo.title}</div>
                                                              <div className="text-xs mb-2 opacity-90">{errorInfo.message}</div>
                                                              <div className="text-[10px] p-2 bg-black/20 rounded border-l-2 border-white/50">
                                                                <strong>Solution:</strong> {errorInfo.solution}
                                                              </div>
                                                            </div>
                                                          ) : ""}
                                                          arrow
                                                        >
                                                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${badgeClass} cursor-help`}>
                                                            {icon}
                                                            {displayStatus}
                                                          </span>
                                                        </Tooltip>
                                                      );
                                                    })()}
                                                  </td>
                                                  <td className="px-6 py-4 text-right">
                                                    {hasFiles ? (
                                                      <button
                                                        onClick={() => setExpandedBulkRow(isExpanded ? null : idx)}
                                                        className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${isExpanded
                                                          ? "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                                                      >
                                                        View Files
                                                        <span className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                                                      </button>
                                                    ) : (
                                                      <span className="text-xs text-gray-400 italic">
                                                        {bulkLoading ? "Generating..." : "No Files"}
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>

                                                {/* Expanded File Details */}
                                                {isExpanded && (
                                                  <tr className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <td colSpan={10} className={`p-0 ${darkMode ? "bg-slate-800/30" : "bg-gray-50/50"}`}>
                                                      <div className={`p-6 border-b border-t ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                          {row.produced_files && typeof row.produced_files === 'object' ? (
                                                            Object.entries(row.produced_files).map(([label, fileName]) => {
                                                              const fUrl = bulkResult.files ? bulkResult.files[fileName] : null;
                                                              // Removed the 'if (!fUrl) return null' check so we can show the tile even without URL


                                                              return (
                                                                <div key={fileName} className={`flex items-center justify-between p-3 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                                                                  <div className="min-w-0 mr-4">
                                                                    <div className={`text-xs font-semibold uppercase mb-0.5 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>{label}</div>
                                                                    <div className={`text-sm truncate font-medium ${darkMode ? "text-slate-200" : "text-gray-900"}`}>{fileName}</div>
                                                                  </div>
                                                                  <div className="flex gap-2 shrink-0">
                                                                    {fUrl ? (
                                                                      <>
                                                                        <button
                                                                          onClick={() => handleAuthenticatedDownload(fUrl, fileName)}
                                                                          className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                                                                          title="Download"
                                                                        >
                                                                          <Download size={16} />
                                                                        </button>
                                                                        <button
                                                                          onClick={() => handlePreviewFile(fUrl, fileName)}
                                                                          className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                                                                          title="Preview"
                                                                        >
                                                                          <Eye size={16} />
                                                                        </button>
                                                                      </>
                                                                    ) : (
                                                                      <span className="text-xs text-amber-500 font-medium self-center px-2">
                                                                        {bulkLoading ? "Generating..." : "Pending"}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              );
                                                            })
                                                          ) : (
                                                            // Fallback logic
                                                            null
                                                          )}
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Download ZIP Button */}
                                <div className="mt-12 flex justify-center pb-8">
                                  {bulkResult.zip_url && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const token = localStorage.getItem('access_token');
                                          const headers = {};
                                          if (token) {
                                            headers['Authorization'] = `Bearer ${token}`;
                                          }
                                          const fullUrl = `${API_BASE.replace(/\/$/, "")}${bulkResult.zip_url}`;
                                          const dlRes = await authenticatedFetch(fullUrl, { headers });
                                          const blob = await dlRes.blob();
                                          const downloadUrl = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = downloadUrl;
                                          a.download = bulkResult.zip_url.split('/').pop() || 'bulk_reconciliation.zip';
                                          document.body.appendChild(a);
                                          a.click();
                                          window.URL.revokeObjectURL(downloadUrl);
                                          document.body.removeChild(a);
                                        } catch (e) {
                                          console.error("Download failed:", e);
                                          alert("Failed to download ZIP file.");
                                        }
                                      }}
                                      className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                    >
                                      <Download />
                                      <span>Download Results ZIP</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}


                          </>
                        ) : (
                          // Standard Mode: Bank Statement Card
                          <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                                  📄
                                </div>
                                <div>
                                  <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Bank Statement</h3>
                                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                                    Excel (.xlsx)
                                  </p>
                                </div>
                              </div>
                              {bankFile && (
                                <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                                  Uploaded
                                </div>
                              )}
                            </div>

                            {bankFile ? (
                              <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">📊</div>
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      onClick={() => handlePreviewLocalFile(bankFile)}
                                      className={`text-sm font-medium truncate cursor-pointer hover:underline flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                                    >
                                      {bankFile.name}
                                      {previewLoading && previewFilename === bankFile.name ? (
                                        <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                      ) : (
                                        <Eye size={14} />
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(bankFile.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setBankFile(null)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <FileUpload
                                key={`bank-${fileResetKey}`}
                                accept={accepts.bank}
                                onChange={(files) => setBankFile(files[0] || null)}
                                uploaderId="bank-upload"
                                darkMode={darkMode}
                              />
                            )}
                          </div>
                        )}

                        {/* Advance Statement Card - Hide in V2 */}
                        {pipelineMode !== 'v2' && (
                          <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${darkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                                  📑
                                </div>
                                <div>
                                  <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Advance Statement</h3>
                                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                                    Excel (.xlsx)
                                  </p>
                                </div>
                              </div>
                              {advanceFile && (
                                <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                                  Uploaded
                                </div>
                              )}
                            </div>

                            {advanceFile ? (
                              <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">📋</div>
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      onClick={() => handlePreviewLocalFile(advanceFile)}
                                      className={`text-sm font-medium truncate cursor-pointer hover:underline flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                                    >
                                      {advanceFile.name}
                                      {previewLoading && previewFilename === advanceFile.name ? (
                                        <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                      ) : (
                                        <Eye size={14} />
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(advanceFile.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setAdvanceFile(null)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <FileUpload
                                key={`advance-${fileResetKey}`}
                                accept={accepts.advance}
                                onChange={(files) => setAdvanceFile(files[0] || null)}
                                uploaderId="advance-upload"
                                darkMode={darkMode}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {activeStep === 1 && (
                    pipelineMode === 'v2' ? (
                      <>
                        <div style={{ marginBottom: 40, opacity: 0.9 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, fontSize: "16px", color: theme.text }}>
                              Detected Bank Account
                            </div>
                            <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
                              Auto-Detected
                            </div>
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "20px",
                            width: "100%"
                          }}>
                            {["Standard Chartered", "ICICI", "AXIS"].map((bank) => (
                              <div key={bank}
                                style={{ cursor: "default", height: "100%", opacity: 1 }}>
                                <WobbleCard
                                  containerClassName="h-full shadow-lg"
                                  style={{
                                    backgroundImage: bankType === bank
                                      ? (bank === "Standard Chartered"
                                        ? "linear-gradient(135deg, #003087 0%, #0056b3 100%)"
                                        : bank === "ICICI"
                                          ? "linear-gradient(135deg, #871f42 0%, #f37021 100%)"
                                          : "linear-gradient(135deg, #871242 0%, #be185d 100%)")
                                      : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                                    borderRadius: "1rem",
                                    overflow: "hidden",
                                    position: "relative",
                                    minHeight: "150px",
                                    border: bankType === bank ? "2px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.1)"
                                  }}
                                  className="p-4 flex flex-col justify-between h-full relative"
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 10 }}>
                                    <div>
                                      <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "2px", color: "white" }}>
                                        {bank}
                                      </div>
                                    </div>
                                    <div style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {bankType === bank && (
                                        <div style={{ background: "rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", padding: "5px", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                          <Check size={14} color="white" strokeWidth={3} />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ marginTop: "auto", position: "relative", zIndex: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "rgba(255,255,255,0.9)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px", backdropFilter: "blur(4px)" }}>
                                        <FileSpreadsheet size={12} />
                                        <span>Bank Statement Protocol</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{
                                    position: "absolute",
                                    right: "-15px",
                                    bottom: "-15px",
                                    opacity: 0.25,
                                    pointerEvents: "none",
                                    zIndex: 0,
                                    transform: "rotate(-15deg)"
                                  }}>
                                    <Landmark size={100} color="white" />
                                  </div>
                                </WobbleCard>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{
                          border: `2px dashed ${misFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
                          borderRadius: "12px",
                          padding: "24px",
                          textAlign: "center",
                          background: misFile
                            ? (darkMode ? "#064e3b" : "#f0fdf4")
                            : (darkMode ? "#0f172a" : "white"),
                          marginBottom: 40,
                          boxShadow: theme.shadows?.[3] || "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                        }}>
                          <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                            {misFile ? "📄" : "📊"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                            <Typography variant="h6" component="h3" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
                              MIS Extract File
                            </Typography>
                            <Tooltip title="Upload your Management Information System extract" arrow>
                              <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 14 }}>ℹ️</span>
                            </Tooltip>
                          </div>
                          <Typography variant="body2" style={{ marginBottom: "16px", fontSize: "13px", color: theme.textSecondary }}>
                            Excel (.xlsx)
                          </Typography>

                          {misFile ? (
                            <div style={{
                              background: darkMode ? "#0f172a" : "white",
                              padding: "12px",
                              borderRadius: "8px",
                              display: "inline-block",
                              border: darkMode ? "1px solid #334155" : "none"
                            }}>
                              <div
                                onClick={() => handlePreviewLocalFile(misFile)}
                                style={{ fontWeight: 600, color: "#10b981", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                                className="hover:underline"
                              >
                                ✓ {misFile.name}
                                {previewLoading && previewFilename === misFile.name ? (
                                  <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </div>
                              <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
                                {(misFile.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          ) : (
                            <FileUpload
                              key={`mis-v2-${fileResetKey}`}
                              accept={accepts.mis}
                              label="Click or drag to upload"
                              onChange={(files) => setMisFile(files[0] || null)}
                              name="mis_file"
                              uploaderId="mis-upload-v2"
                              darkMode={darkMode}
                            />
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔄</div>
                        <Typography variant="h6" component="h2" style={{ marginBottom: 16, fontWeight: 600, color: theme.text }}>
                          Bank × Advance Matching
                        </Typography>
                        <Typography variant="body2" style={{ maxWidth: "500px", margin: "0 auto", color: theme.textSecondary }}>
                          This step automatically matches Bank transactions with Advance records using reference numbers.
                          Click <strong>Next</strong> to process.
                        </Typography>
                      </div>
                    )
                  )}

                  {activeStep === 2 && (
                    <>
                      {pipelineMode !== 'v2' ? (
                        <>
                          <div style={{ position: "relative", marginBottom: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <label style={{ fontWeight: 600, fontSize: "16px", color: theme.text }}>Select TPA</label>
                              <Tooltip title="Choose your Third Party Administrator for MIS mapping" arrow>
                                <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 16 }}>ℹ️</span>
                              </Tooltip>
                            </div>
                            <div style={{ position: "relative" }}>
                              <select
                                value={tpaName}
                                onChange={(e) => setTpaName(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "16px 20px",
                                  paddingRight: "48px",
                                  appearance: "none",
                                  background: darkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
                                  backdropFilter: "blur(12px)",
                                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.05)",
                                  borderRadius: "16px",
                                  color: theme.text,
                                  fontSize: "16px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  outline: "none",
                                  boxShadow: darkMode ? "0 4px 6px rgba(0, 0, 0, 0.2)" : "0 4px 6px rgba(0, 0, 0, 0.05)",
                                  transition: "all 0.2s ease"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                                onBlur={(e) => e.target.style.borderColor = darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"}
                              >
                                {tpaChoices.map((tpa) => (
                                  <option key={tpa} value={tpa} style={{ background: darkMode ? "#1e293b" : "white", color: theme.text }}>
                                    {tpa}
                                  </option>
                                ))}
                              </select>
                              <div style={{
                                position: "absolute",
                                right: "20px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: theme.textSecondary
                              }}>
                                ▼
                              </div>
                            </div>
                          </div>

                          <div style={{
                            border: `2px dashed ${misFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
                            borderRadius: "12px",
                            padding: "24px",
                            textAlign: "center",
                            background: misFile
                              ? (darkMode ? "#064e3b" : "#f0fdf4")
                              : (darkMode ? "#0f172a" : "white"),
                            transition: "all 0.3s ease"
                          }}>
                            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                              {misFile ? "📄" : "📊"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                              <Typography variant="h6" component="h3" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
                                MIS Extract File
                              </Typography>
                              <Tooltip title="Upload your Management Information System extract" arrow>
                                <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 14 }}>ℹ️</span>
                              </Tooltip>
                            </div>
                            <Typography variant="body2" style={{ marginBottom: "16px", fontSize: "13px", color: theme.textSecondary }}>
                              Excel (.xlsx)
                            </Typography>

                            {misFile ? (
                              <div style={{
                                background: darkMode ? "#0f172a" : "white",
                                padding: "12px",
                                borderRadius: "8px",
                                display: "inline-block",
                                border: darkMode ? "1px solid #334155" : "none"
                              }}>
                                <div
                                  onClick={() => handlePreviewLocalFile(misFile)}
                                  style={{ fontWeight: 600, color: "#10b981", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                                  className="hover:underline"
                                >
                                  ✓ {misFile.name}
                                  {previewLoading && previewFilename === misFile.name ? (
                                    <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                  ) : (
                                    <Eye size={14} />
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
                                  {(misFile.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            ) : (
                              <FileUpload
                                key={`mis-${fileResetKey}`}
                                accept={accepts.mis}
                                label="Click or drag to upload"
                                onChange={(files) => setMisFile(files[0] || null)}
                                name="mis_file"
                                uploaderId="mis-upload"
                                darkMode={darkMode}
                              />
                            )}
                          </div>
                        </>
                      ) : null}
                    </>
                  )}

                  {(activeStep === 3 || (pipelineMode === 'v2' && activeStep === 2)) && (
                    <>
                      {pipelineMode === 'v2' && tpaName && (
                        <div className="mb-8 overflow-hidden rounded-2xl relative">
                          <div className={`absolute inset-0 opacity-20 ${darkMode ? 'bg-gradient-to-r from-emerald-900 to-teal-900' : 'bg-gradient-to-r from-emerald-100 to-teal-100'}`}></div>
                          <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/30">
                                🏥
                              </div>
                              <div>
                                <div className="text-sm font-medium text-emerald-500/80 uppercase tracking-wider mb-1">
                                  Detected TPA Protocol
                                </div>
                                <div className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-white to-emerald-200' : 'from-slate-800 to-emerald-700'}`}>
                                  {tpaName}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                              <span className="text-sm font-semibold text-emerald-600">Active Pipeline</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{
                        border: `2px dashed ${outstandingFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
                        borderRadius: "12px",
                        padding: "24px",
                        textAlign: "center",
                        background: outstandingFile
                          ? (darkMode ? "#064e3b" : "#f0fdf4")
                          : (darkMode ? "#0f172a" : "white"),
                        marginBottom: 40,
                        transition: "all 0.3s ease",
                        boxShadow: theme.shadows?.[3] || "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                          {outstandingFile ? "📄" : "📋"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                          <Typography variant="h6" component="h3" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
                            Outstanding Report
                          </Typography>
                          <Tooltip title="Upload your outstanding balances report" arrow>
                            <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 14 }}>ℹ️</span>
                          </Tooltip>
                        </div>
                        <Typography variant="body2" style={{ marginBottom: "16px", fontSize: "13px", color: theme.textSecondary }}>
                          Excel (.xlsx)
                        </Typography>

                        {outstandingFile ? (
                          <div style={{
                            background: darkMode ? "#0f172a" : "white",
                            padding: "12px",
                            borderRadius: "8px",
                            display: "inline-block",
                            border: darkMode ? "1px solid #334155" : "none"
                          }}>
                            <div
                              onClick={() => handlePreviewLocalFile(outstandingFile)}
                              style={{ fontWeight: 600, color: "#10b981", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                              className="hover:underline"
                            >
                              ✓ {outstandingFile.name}
                              {previewLoading && previewFilename === outstandingFile.name ? (
                                <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                <Eye size={14} />
                              )}
                            </div>
                            <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
                              {(outstandingFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        ) : (
                          <FileUpload
                            key={`outstanding-${fileResetKey}`}
                            accept={accepts.outstanding}
                            label="Click or drag to upload"
                            onChange={(files) => setOutstandingFile(files[0] || null)}
                            name="outstanding_file"
                            uploaderId="outstanding-upload"
                            darkMode={darkMode}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}



              {
                activeStep < steps.length && !isBulkMode && (
                  <div style={{
                    display: "flex",
                    flexDirection: typeof window !== 'undefined' && window.innerWidth < 600 ? "column" : "row",
                    gap: 12,
                    alignItems: "center",
                    marginTop: 20,
                    justifyContent: "center",
                    marginBottom: "16px"
                  }}>
                    <MuiButton
                      variant="text"
                      disabled={activeStep === 0 || loading}
                      onClick={handleBack}
                      style={{ minWidth: "80px" }}
                    >
                      Back
                    </MuiButton>
                    <div style={{ flex: "0 0 auto" }}>
                      <FancyButton
                        onClick={handleNext}
                        disabled={!canProceed || loading}
                        borderRadius="1.75rem"
                        className="bg-black dark:bg-slate-900 text-white dark:text-white border-neutral-200 dark:border-slate-800"
                      >
                        {loading
                          ? "Processing..."
                          : activeStep === steps.length - 1
                            ? "Finish"
                            : "Next"}
                      </FancyButton>
                    </div>
                    <MuiButton
                      variant="text"
                      onClick={handleReset}
                      disabled={loading}
                      style={{ minWidth: "80px" }}
                    >
                      Reset
                    </MuiButton>
                  </div>
                )
              }

              {/* Enhanced Processing Overlay with Lottie */}
              {
                loading && (
                  <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.85)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    animation: "fadeIn 0.3s ease"
                  }}>
                    <div style={{
                      background: darkMode
                        ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                        : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                      padding: "48px 40px",
                      borderRadius: "24px",
                      textAlign: "center",
                      minWidth: "320px",
                      maxWidth: "90%",
                      border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                      boxShadow: darkMode
                        ? "0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(79, 70, 229, 0.3)"
                        : "0 20px 60px rgba(0,0,0,0.15)",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      {/* Animated gradient background */}
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))",
                        opacity: 0.5,
                        animation: "shimmer 2s infinite"
                      }}></div>

                      {/* Step icon */}
                      <div style={{
                        fontSize: "40px",
                        marginBottom: "16px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        {activeStep === 0 && "📁"}
                        {activeStep === 1 && "🔄"}
                        {activeStep === 2 && "📊"}
                        {activeStep === 3 && "📋"}
                      </div>

                      {/* Lottie Animation */}
                      <div style={{
                        width: "160px",
                        height: "160px",
                        margin: "0 auto 24px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        {animationData ? (
                          <Lottie
                            animationData={animationData}
                            loop={true}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          // Fallback spinner if Lottie fails to load
                          <div style={{
                            width: "100%",
                            height: "100%",
                            border: `6px solid ${darkMode ? "#334155" : "#e0e0e0"}`,
                            borderTop: "6px solid #3b82f6",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite"
                          }}></div>
                        )}
                      </div>

                      {/* Step indicator with progress */}
                      <div style={{
                        background: darkMode ? "#334155" : "#f1f5f9",
                        borderRadius: "20px",
                        padding: "8px 20px",
                        display: "inline-block",
                        marginBottom: "16px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        <span style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#3b82f6",
                          textTransform: "uppercase",
                          letterSpacing: "1px"
                        }}>
                          Step {activeStep + 1} of {steps.length}
                        </span>
                      </div>

                      {/* Main heading */}
                      <Typography variant="h5" style={{
                        marginBottom: "12px",
                        color: theme.text,
                        fontWeight: 700,
                        fontSize: "24px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        Processing {steps[activeStep]?.label}
                      </Typography>

                      {/* Description */}
                      <Typography variant="body1" style={{
                        color: theme.textSecondary,
                        marginBottom: "24px",
                        fontSize: "15px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        {steps[activeStep]?.description || "Please wait..."}
                      </Typography>

                      {/* Progress bar */}
                      <div style={{
                        width: "100%",
                        height: "6px",
                        background: darkMode ? "#334155" : "#e2e8f0",
                        borderRadius: "3px",
                        overflow: "hidden",
                        marginBottom: "16px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${((activeStep + 1) / steps.length) * 100}%`,
                          background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                          borderRadius: "3px",
                          transition: "width 0.5s ease",
                          animation: "shimmer 2s infinite"
                        }}></div>
                      </div>

                      {/* Loading dots */}
                      <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                        marginTop: "20px",
                        position: "relative",
                        zIndex: 1
                      }}>
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "#3b82f6",
                              animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                            }}
                          ></div>
                        ))}
                      </div>

                      {/* Additional info */}
                      <div style={{
                        marginTop: "24px",
                        padding: "12px",
                        background: darkMode ? "rgba(51, 65, 85, 0.5)" : "rgba(241, 245, 249, 0.8)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: theme.textSecondary,
                        position: "relative",
                        zIndex: 1
                      }}>
                        <div style={{ marginBottom: "4px" }}>⏱️ This may take a few moments</div>
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>
                          Please do not close or refresh this page
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              {/* Enhanced Error Display */}
              {
                error && (() => {
                  const errorInfo = categorizeError(error);
                  return (
                    <div style={{
                      marginTop: 16,
                      background: darkMode ? "#7f1d1d" : "#fef2f2",
                      border: `2px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
                      borderRadius: 12,
                      padding: 24,
                      display: "flex",
                      flexDirection: "column",
                      gap: 20
                    }}>
                      <div style={{ display: "flex", alignItems: "start", gap: 16 }}>
                        <div style={{
                          fontSize: 32,
                          flexShrink: 0,
                          background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>{errorInfo.icon}</div>
                        <div style={{ flex: 1 }}>
                          <Typography variant="h6" component="h3" style={{ color: darkMode ? "#fecaca" : "#dc2626", marginBottom: 4, fontWeight: 700, fontSize: "18px" }}>
                            {errorInfo.type}: {errorInfo.title}
                          </Typography>
                          <Typography variant="body2" style={{ color: darkMode ? "#fca5a5" : "#7f1d1d", marginBottom: 0, fontSize: "14px", fontWeight: 500, opacity: 0.9 }}>
                            {errorInfo.message}
                          </Typography>
                        </div>
                      </div>

                      <div style={{
                        background: darkMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
                        padding: 16,
                        borderRadius: 8,
                        borderLeft: `4px solid ${darkMode ? "#fca5a5" : "#dc2626"}`
                      }}>
                        <Typography variant="body2" style={{ color: darkMode ? "#f1f5f9" : "#1e293b", fontWeight: 700, marginBottom: 4 }}>
                          💡 Suggested Solution:
                        </Typography>
                        <Typography variant="body2" style={{ color: darkMode ? "#cbd5e1" : "#475569", fontSize: "14px", lineHeight: "1.5" }}>
                          {errorInfo.solution}
                        </Typography>
                      </div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setError("")}
                          style={{
                            padding: "10px 20px",
                            background: darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                            color: darkMode ? "#f1f5f9" : "#475569",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: 14,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"}
                          onMouseLeave={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9"}
                        >
                          Dismiss
                        </button>
                        
                        {errorInfo.action === "open_tpa_sidebar" && (
                          <button
                            onClick={() => {
                              setError("");
                              openTpaSidebar();
                            }}
                            style={{
                              padding: "10px 20px",
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#2563eb";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#3b82f6";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <ListFilter size={18} />
                            Check TPA Mapping
                          </button>
                        )}

                        {errorInfo.action === "logout" && (
                          <button
                            onClick={handleLogout}
                            style={{
                              padding: "10px 20px",
                              background: "#f43f5e",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              transition: "all 0.2s"
                            }}
                          >
                            Go to Login
                          </button>
                        )}

                        <button
                          onClick={handleNext}
                          disabled={!canProceed}
                          style={{
                            padding: "10px 24px",
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: canProceed ? "pointer" : "not-allowed",
                            fontWeight: 700,
                            fontSize: 14,
                            opacity: canProceed ? 1 : 0.5,
                            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (canProceed) {
                              e.currentTarget.style.background = "#b91c1c";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (canProceed) {
                              e.currentTarget.style.background = "#dc2626";
                              e.currentTarget.style.transform = "translateY(0)";
                            }
                          }}
                        >
                          Retry Step
                        </button>
                      </div>
                    </div>
                  );
                })()
              }

              {/* Enhanced Results Display with Excel Viewer */}
              {
                Object.keys(stepResults).length > 0 && (
                  <div style={{
                    marginTop: 32,
                    background: theme.cardBg,
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: darkMode ? "0 4px 16px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.08)",
                    border: darkMode ? "1px solid #334155" : "none",
                    width: "100%",
                    boxSizing: "border-box"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 24,
                      flexWrap: "wrap",
                      gap: 12
                    }}>
                      <Typography variant="h5" style={{ fontWeight: 700, margin: 0, color: theme.text }}>
                        📊 Results
                      </Typography>
                      <div style={{
                        background: "#10b981",
                        color: "white",
                        padding: "6px 16px",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: 600
                      }}>
                        {Object.keys(stepResults).filter(k => stepResults[k]?.ok).length} / {steps.length} Complete
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: "16px" }}>
                      {steps.map((s, idx) => {
                        const res = stepResults[idx];
                        if (!res) return null;

                        return (
                          <div
                            key={s.key}
                            style={{
                              background: darkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)",
                              backdropFilter: "blur(12px)",
                              border: `1px solid ${res.ok ? (darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)") : (darkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.3)")}`,
                              borderRadius: 24,
                              padding: 24,
                              marginBottom: 20,
                              width: "100%",
                              boxSizing: "border-box",
                              boxShadow: darkMode ? "0 8px 32px rgba(0, 0, 0, 0.2)" : "0 8px 32px rgba(0, 0, 0, 0.05)",
                              animation: "slideUpFade 0.5s ease-out forwards",
                              animationDelay: `${idx * 0.1}s`,
                              opacity: 0,
                              transform: "translateY(20px)"
                            }}
                          >
                            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                              {/* Status Icon */}
                              <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                background: res.ok
                                  ? "linear-gradient(135deg, #10b981, #059669)"
                                  : "linear-gradient(135deg, #ef4444, #b91c1c)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "24px",
                                flexShrink: 0,
                                boxShadow: res.ok
                                  ? "0 0 20px rgba(16, 185, 129, 0.4)"
                                  : "0 0 20px rgba(239, 68, 68, 0.4)"
                              }}>
                                {res.ok ? "✓" : "✕"}
                              </div>

                              <div style={{ flex: 1 }}>
                                {/* Header */}
                                <div style={{ marginBottom: 12 }}>
                                  <Typography variant="h6" component="h3" style={{
                                    fontWeight: 700,
                                    fontSize: "18px",
                                    color: theme.text,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  }}>
                                    Step {idx + 1}: {s.label}
                                    {res.ok && (
                                      <span style={{
                                        fontSize: "12px",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        background: darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
                                        color: "#10b981",
                                        border: "1px solid rgba(16, 185, 129, 0.2)"
                                      }}>
                                        Completed
                                      </span>
                                    )}
                                  </Typography>
                                  <Typography variant="body2" style={{
                                    fontSize: "14px",
                                    color: theme.textSecondary,
                                    marginTop: 4
                                  }}>
                                    {s.description}
                                  </Typography>
                                </div>

                                {/* Error Message */}
                                {res.ok === false && (
                                  <div style={{
                                    background: darkMode ? "rgba(239, 68, 68, 0.1)" : "rgba(254, 242, 242, 1)",
                                    border: `1px solid ${darkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                                    borderRadius: 12,
                                    padding: "12px 16px",
                                    marginTop: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12
                                  }}>
                                    <span style={{ fontSize: "20px" }}>⚠️</span>
                                    <Typography style={{ color: darkMode ? "#fca5a5" : "#b91c1c", fontSize: "14px", fontWeight: 500 }}>
                                      {res.error}
                                    </Typography>
                                  </div>
                                )}

                                {/* Auto-Detected Info (V2) */}
                                {res.ok && res.data && (res.data.detected_bank_type || res.data.detected_tpa || res.data.bank_file_dates) && (
                                  <div style={{
                                    marginTop: 12,
                                    padding: "8px 12px",
                                    background: darkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)",
                                    borderLeft: "4px solid #3b82f6",
                                    borderRadius: 4,
                                    fontSize: "13px",
                                    color: theme.textSecondary
                                  }}>
                                    {res.data.detected_bank_type && (
                                      <div><strong>Detected Bank:</strong> {res.data.detected_bank_type}</div>
                                    )}
                                    {res.data.detected_tpa && (
                                      <div><strong>Detected TPA:</strong> {res.data.detected_tpa}</div>
                                    )}
                                    {res.data.bank_file_dates && Object.keys(res.data.bank_file_dates).length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        {Object.entries(res.data.bank_file_dates).map(([filename, range]) => (
                                          <div key={filename} className="flex items-center gap-2">
                                            <span className="shrink-0">📅</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{range}</span>
                                            <span className="opacity-70 text-[11px]">({filename})</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Excel Viewer */}
                                {res.ok && res.downloadLinks && (
                                  <div style={{ marginTop: 20 }}>
                                    {res.downloadLinks.map((link, i) => (
                                      <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          marginBottom: 8,
                                          color: theme.textSecondary,
                                          fontSize: "13px",
                                          fontFamily: "monospace"
                                        }}>
                                          <span>📄</span>
                                          {link.label}
                                        </div>
                                        <ExcelDataViewer
                                          url={link.url}
                                          label={link.label}
                                          darkMode={darkMode}
                                          apiBase={API_BASE}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ZIP Download Button */}
                                {res.zipUrl && (
                                  <div style={{
                                    marginTop: 24,
                                    paddingTop: 24,
                                    borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                                    display: "flex",
                                    justifyContent: "flex-end"
                                  }}>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const token = localStorage.getItem('access_token');
                                          const headers = {};
                                          if (token) {
                                            headers['Authorization'] = `Bearer ${token}`;
                                          }

                                          const fullUrl = `${API_BASE.replace(/\/$/, "")}${res.zipUrl}`;
                                          console.log('[ZIP Download] Fetching:', fullUrl);

                                          const response = await fetch(fullUrl, { headers });

                                          if (!response.ok) {
                                            throw new Error(`Download failed: ${response.status}`);
                                          }

                                          const blob = await response.blob();
                                          const downloadUrl = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = downloadUrl;
                                          a.download = res.zipUrl.split('/').pop() || 'reconciliation.zip';
                                          document.body.appendChild(a);
                                          a.click();
                                          window.URL.revokeObjectURL(downloadUrl);
                                          document.body.removeChild(a);

                                          console.log('[ZIP Download] ✓ Success!');
                                        } catch (err) {
                                          console.error('[ZIP Download] Error:', err);
                                          alert('ZIP download failed. Please try again.');
                                        }
                                      }}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "16px 32px",
                                        background: bankType === "Standard Chartered"
                                          ? "linear-gradient(135deg, #003087 0%, #0056b3 100%)"
                                          : bankType === "ICICI"
                                            ? "linear-gradient(135deg, #871f42 0%, #f37021 100%)"
                                            : "linear-gradient(135deg, #871242 0%, #be185d 100%)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 16,
                                        cursor: "pointer",
                                        fontSize: 16,
                                        fontWeight: 700,
                                        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        animation: "pulse 2s infinite"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                                        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.3)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
                                      }}
                                    >
                                      <span style={{ fontSize: 24 }}>📦</span>
                                      <div>
                                        <div style={{ fontSize: "12px", opacity: 0.9, fontWeight: 500 }}>Reconciliation Complete</div>
                                        <div>Download Package</div>
                                      </div>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              }

              {
                activeStep >= steps.length && (
                  <div style={{
                    marginTop: 24,
                    textAlign: "center",
                    padding: "32px",
                    background: theme.cardBg,
                    borderRadius: 16,
                    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                    border: darkMode ? "1px solid #334155" : "none"
                  }}>
                    <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: theme.text }}>
                      Reconciliation Completed!
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, color: theme.textSecondary }}>
                      All steps have been processed successfully. You can view and download the results above or reset to start over.
                    </Typography>
                    <MuiButton
                      variant="contained"
                      onClick={handleReset}
                      style={{
                        background: darkMode
                          ? "linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        padding: "12px 32px",
                        fontSize: "16px",
                        fontWeight: 600,
                        textTransform: "none",
                        borderRadius: "8px"
                      }}
                    >
                      Start New Reconciliation
                    </MuiButton>
                  </div>
                )
              }
            </>
          )}
        </main >

        {/* ✅ NEW: AI Assistant Modal - Add this component here */}
        {/* <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        darkMode={darkMode}
        apiBase={API_BASE}
      /> */}
      </div >

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shimmer {
          0% { 
            background-position: -200% center;
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
          100% { 
            background-position: 200% center;
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .file-upload-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Floating Action Buttons for Sidebars */}
      <div style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 999
      }}>
        {/* TPA Reference Button */}
        <button
          onClick={openTpaSidebar}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: darkMode
              ? "linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: darkMode
              ? "0 4px 12px rgba(102, 126, 234, 0.3)"
              : "0 4px 12px rgba(102, 126, 234, 0.4)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = darkMode
              ? "0 6px 20px rgba(102, 126, 234, 0.5)"
              : "0 6px 20px rgba(102, 126, 234, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = darkMode
              ? "0 4px 12px rgba(102, 126, 234, 0.3)"
              : "0 4px 12px rgba(102, 126, 234, 0.4)";
          }}
          title="TPA Reference"
        >
          📋
        </button>

        {/* Video Tutorials Button */}
        <button
          onClick={openVideoSidebar}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: darkMode
              ? "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)"
              : "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: darkMode
              ? "0 4px 12px rgba(20, 184, 166, 0.3)"
              : "0 4px 12px rgba(20, 184, 166, 0.4)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = darkMode
              ? "0 6px 20px rgba(20, 184, 166, 0.5)"
              : "0 6px 20px rgba(20, 184, 166, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = darkMode
              ? "0 4px 12px rgba(20, 184, 166, 0.3)"
              : "0 4px 12px rgba(20, 184, 166, 0.4)";
          }}
          title="Video Tutorials"
        >
          🎥
        </button>
      </div>

      {/* Backdrop Overlay */}
      {(tpaSidebarOpen || videoSidebarOpen) && (
        <div
          onClick={() => {
            setTpaSidebarOpen(false);
            setVideoSidebarOpen(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease-out"
          }}
        />
      )}

      {/* TPA Mapping Sidebar */}
      <div style={{
        position: "fixed",
        top: 0,
        right: tpaSidebarOpen ? 0 : -450,
        width: 450,
        height: "100vh",
        background: darkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        boxShadow: darkMode
          ? "-4px 0 20px rgba(0, 0, 0, 0.5)"
          : "-4px 0 20px rgba(0, 0, 0, 0.1)",
        zIndex: 1001,
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflowY: "auto",
        borderLeft: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ padding: 24 }}>
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: darkMode ? "2px solid rgba(255, 255, 255, 0.1)" : "2px solid rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: darkMode ? "#f8fafc" : "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              📋 TPA Reference
            </h2>
            <button
              onClick={() => setTpaSidebarOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: darkMode ? "#94a3b8" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 14,
            color: darkMode ? "#94a3b8" : "#64748b",
            marginBottom: 20,
            lineHeight: 1.6
          }}>
            Column names expected in MIS files for each TPA
          </p>

          {/* TPA Table */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            {isTpaMappingsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: darkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}>
                <span className="animate-pulse">Loading TPA mappings...</span>
              </div>
            ) : Object.keys(tpaMappings).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: darkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}>
                No TPA mappings found.
              </div>
            ) : (
              Object.entries(tpaMappings).map(([tpaName, mapping], idx) => (
                <div
                  key={idx}
                  style={{
                    background: darkMode ? "rgba(30, 41, 59, 0.6)" : "rgba(248, 250, 252, 0.8)",
                    borderRadius: 12,
                    padding: 16,
                    border: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode ? "rgba(30, 41, 59, 0.8)" : "rgba(241, 245, 249, 1)";
                    e.currentTarget.style.transform = "translateX(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = darkMode ? "rgba(30, 41, 59, 0.6)" : "rgba(248, 250, 252, 0.8)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: darkMode ? "#f1f5f9" : "#1e293b",
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)"
                  }}>
                    {tpaName}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12
                    }}>
                      <span style={{
                        color: darkMode ? "#94a3b8" : "#64748b",
                        fontWeight: 600
                      }}>
                        Claim No:
                      </span>
                      <code style={{
                        background: darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        color: darkMode ? "#a5f3fc" : "#0e7490",
                        fontFamily: "monospace"
                      }}>
                        {mapping["Claim No"]}
                      </code>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12
                    }}>
                      <span style={{
                        color: darkMode ? "#94a3b8" : "#64748b",
                        fontWeight: 600
                      }}>
                        Cheque/UTR:
                      </span>
                      <code style={{
                        background: darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        color: darkMode ? "#a5f3fc" : "#0e7490",
                        fontFamily: "monospace"
                      }}>
                        {mapping["Cheque/ NEFT/ UTR No."]}
                      </code>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Video Tutorials Sidebar */}
      <div style={{
        position: "fixed",
        top: 0,
        right: videoSidebarOpen ? 0 : -450,
        width: 450,
        height: "100vh",
        background: darkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        boxShadow: darkMode
          ? "-4px 0 20px rgba(0, 0, 0, 0.5)"
          : "-4px 0 20px rgba(0, 0, 0, 0.1)",
        zIndex: 1001,
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflowY: "auto",
        borderLeft: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ padding: 24 }}>
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: darkMode ? "2px solid rgba(255, 255, 255, 0.1)" : "2px solid rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: darkMode ? "#f8fafc" : "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              🎥 Video Tutorials
            </h2>
            <button
              onClick={() => setVideoSidebarOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: darkMode ? "#94a3b8" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 14,
            color: darkMode ? "#94a3b8" : "#64748b",
            marginBottom: 24,
            lineHeight: 1.6
          }}>
            Watch these tutorials to learn how to use the reconciliation system
          </p>

          {/* Video Links */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            {/* Video 1: How to run recon */}
            <a
              href="https://drive.google.com/file/d/1RyB4cR-gRO1plpTQg3OBX1zc7piE4LsZ/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                background: darkMode
                  ? "linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)"
                  : "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                borderRadius: 16,
                padding: 20,
                border: darkMode ? "1px solid rgba(102, 126, 234, 0.3)" : "1px solid rgba(102, 126, 234, 0.2)",
                transition: "all 0.3s ease",
                display: "block"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = darkMode
                  ? "0 8px 24px rgba(102, 126, 234, 0.3)"
                  : "0 8px 24px rgba(102, 126, 234, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: darkMode
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0
                }}>
                  ▶️
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: "0 0 8px 0",
                    fontSize: 16,
                    fontWeight: 700,
                    color: darkMode ? "#f1f5f9" : "#1e293b"
                  }}>
                    How to Run Reconciliation
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: darkMode ? "#94a3b8" : "#64748b",
                    lineHeight: 1.5
                  }}>
                    Step-by-step guide on running the reconciliation process
                  </p>
                </div>
                <div style={{
                  fontSize: 20,
                  color: darkMode ? "#94a3b8" : "#64748b"
                }}>
                  →
                </div>
              </div>
            </a>

            {/* Video 2: Troubleshoot guide */}
            <a
              href="https://drive.google.com/file/d/16tQHCsuLvN0BmWFLy5ZInbPZ1aCKyFNq/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                background: darkMode
                  ? "linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)"
                  : "linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
                borderRadius: 16,
                padding: 20,
                border: darkMode ? "1px solid rgba(20, 184, 166, 0.3)" : "1px solid rgba(20, 184, 166, 0.2)",
                transition: "all 0.3s ease",
                display: "block"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = darkMode
                  ? "0 8px 24px rgba(20, 184, 166, 0.3)"
                  : "0 8px 24px rgba(20, 184, 166, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: darkMode
                    ? "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)"
                    : "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0
                }}>
                  🔧
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: "0 0 8px 0",
                    fontSize: 16,
                    fontWeight: 700,
                    color: darkMode ? "#f1f5f9" : "#1e293b"
                  }}>
                    Troubleshooting Guide
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: darkMode ? "#94a3b8" : "#64748b",
                    lineHeight: 1.5
                  }}>
                    Common issues and how to resolve them
                  </p>
                </div>
                <div style={{
                  fontSize: 20,
                  color: darkMode ? "#94a3b8" : "#64748b"
                }}>
                  →
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <DataModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        data={previewData}
        columns={previewColumns}
        filename={previewFilename}
        darkMode={darkMode}
      />
    </>
  );
}