"use client";

import React, { useMemo, useState, useEffect } from "react";
import { FileUpload } from "../../components/ui/file-upload.tsx";
import { Button as FancyButton } from "../../components/ui/moving-border";
import { SparklesCore } from "../../components/ui/sparkles";

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
    pointerEvents: "none",
    zIndex: 0
  }}>
    <SparklesCore 
      id="hero-sparkles" 
      background="transparent" 
      minSize={0.1} 
      maxSize={1.2} 
      particleDensity={80} 
      className="w-full h-full" 
      particleColor="#FFFFFF"
    />
  </div>
));

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const [darkMode, setDarkMode] = useState(false);
  const [bankType, setBankType] = useState("ICICI");
  const [bankFile, setBankFile] = useState(null);
  const [advanceFile, setAdvanceFile] = useState(null);
  const [tpaName, setTpaName] = useState("");
  const [tpaChoices, setTpaChoices] = useState([]);
  const [misFile, setMisFile] = useState(null);
  const [outstandingFile, setOutstandingFile] = useState(null);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stepResults, setStepResults] = useState({});
  const [fileResetKey, setFileResetKey] = useState(0);

  const steps = [
    { key: "step1", label: "Bank & Advance Statements", description: "Upload both files together" },
    { key: "step2", label: "Match Bank × Advance", description: "Automatic processing" },
    { key: "step3", label: "MIS Mapping", description: "Select TPA & upload MIS" },
    { key: "step4", label: "Outstanding Report", description: "Final matching" },
  ];

  useEffect(() => {
    const fetchTpaChoices = async () => {
      try {
        const res = await fetch(`${API_BASE.replace(/\/$/, "")}/tpa-choices`);
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

  const saveStepResult = (idx, resultObj) => setStepResults((prev) => ({ ...prev, [idx]: resultObj }));

  const uploadStep1 = async () => {
    setError(""); 
    setLoading(true);
    
    if (!API_BASE) { 
      setError("NEXT_PUBLIC_API_BASE_URL is not set."); 
      setLoading(false); 
      return false; 
    }

    if (!bankFile || !advanceFile) {
      setError("Please select both Bank and Advance files.");
      setLoading(false);
      return false;
    }

    try {
      const fd = new FormData();
      fd.append("bank_type", bankType);
      fd.append("bank_file", bankFile);
      fd.append("advance_file", advanceFile);

      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/step1`;
      console.log("[Step1] Sending request to:", endpoint);
      
      const res = await fetch(endpoint, { method: "POST", body: fd });
      
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

      saveStepResult(0, { 
        ok: true, 
        data: data,
        downloadLinks: [
          { 
            url: data.files.bank, 
            label: `01a - Bank Clean (${bankType}) - ${data.counts?.bank_rows || 0} rows` 
          },
          { 
            url: data.files.advance, 
            label: `01b - Advance Clean (${bankType}) - ${data.counts?.advance_rows || 0} rows` 
          }
        ]
      });

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
      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/step2`;
      console.log("[Step2] Sending request to:", endpoint);
      
      const res = await fetch(endpoint, { method: "POST" });

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

      saveStepResult(1, { 
        ok: true, 
        data: data,
        downloadLinks: [
          { 
            url: data.files.matches, 
            label: `02a - Bank × Advance Matches (${data.counts?.matches || 0} rows)` 
          },
          { 
            url: data.files.not_in, 
            label: `02b - Bank Not in Advance (${data.counts?.not_in || 0} rows)` 
          }
        ]
      });

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
      
      const res = await fetch(endpoint, { method: "POST", body: fd });

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

      saveStepResult(2, { 
        ok: true, 
        data: data,
        downloadLinks: [
          { 
            url: data.files.mis, 
            label: `03 - MIS Mapped (${data.counts?.rows || 0} rows)` 
          }
        ]
      });

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
      
      const res = await fetch(endpoint, { method: "POST", body: fd });

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

      saveStepResult(3, { 
        ok: true, 
        data: data,
        downloadLinks: [
          { 
            url: data.files.outstanding, 
            label: `04 - Outstanding Matches (${data.counts?.rows || 0} rows)` 
          }
        ],
        zipUrl: data.files.zip
      });

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
        setMisFile(null);
        setFileResetKey((k) => k + 1);
      }
    } else if (activeStep === 3) {
      ok = await uploadStep4();
      if (ok) {
        setOutstandingFile(null);
        setFileResetKey((k) => k + 1);
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
    setBankType("ICICI");
    if (tpaChoices.length > 0) setTpaName(tpaChoices[0]);
  };

  const canProceed = useMemo(() => {
    if (activeStep === 0) return bankFile && advanceFile;
    if (activeStep === 1) return stepResults[0]?.ok;
    if (activeStep === 2) return misFile && tpaName;
    if (activeStep === 3) return outstandingFile;
    return false;
  }, [activeStep, bankFile, advanceFile, misFile, outstandingFile, tpaName, stepResults]);

  const bankShadowColor = bankType === "ICICI" 
    ? "rgba(191,42,42,0.2)" 
    : "rgba(135,31,66,0.25)";

  const getFileAccept = () => {
    if (activeStep === 0) {
      if (bankType === "ICICI") {
        return {
          bank: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
          advance: ".pdf,application/pdf"
        };
      } else {
        return {
          bank: ".pdf,application/pdf",
          advance: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        };
      }
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bolder" }}>RGCIRC</h1>
            <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0 }}>Recon Dashboard</p>
          </div>
          
          {/* Dark Mode Toggle */}
          <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow>
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
          </Tooltip>
        </nav>
        
        {/* Sparkles confined to navbar area - using memoized component */}
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
        maxWidth: 800, 
        padding: "24px 16px"
      }}>
        
        {/* Hero Section with sparkles */}
        <div style={{
          position: "relative",
          background: darkMode 
            ? "linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)" 
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            <h1 style={{ fontSize: "40px", marginBottom: "12px", fontWeight: "800", margin: 0 }}>
              Bank Reconciliation Dashboard
            </h1>
            <p style={{ fontSize: "16px", opacity: 0.95, maxWidth: "600px", margin: "12px auto 0" }}>
              Streamline your financial reconciliation in 4 simple steps. 
              Process bank statements, match transactions, and generate reports automatically.
            </p>
            <div style={{ 
              display: "flex", 
              gap: "32px", 
              justifyContent: "center", 
              marginTop: "28px",
              fontSize: "14px",
              flexWrap: "wrap"
            }}>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold" }}>4</div>
                <div style={{ opacity: 0.9 }}>Simple Steps</div>
              </div>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold" }}>2</div>
                <div style={{ opacity: 0.9 }}>Bank Types</div>
              </div>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold" }}>100%</div>
                <div style={{ opacity: 0.9 }}>Automated</div>
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
            <Typography variant="h6" style={{ fontWeight: 600, margin: 0, color: theme.text }}>
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
                          color: bankType === "ICICI" ? "#bf2a2a" : "#871f42",
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
                          ✓ {stepResults[idx]?.data?.counts?.rows || 
                             stepResults[idx]?.data?.counts?.matches || 
                             stepResults[idx]?.data?.counts?.bank_rows || 0} records
                        </div>
                      )}
                    </div>
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </Box>

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
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: "16px", color: theme.text }}>
                    Select Bank Type
                  </label>
                  <Tooltip title="Choose between ICICI (Bank=Excel, Advance=PDF) or AXIS (Bank=PDF, Advance=Excel)" arrow>
                    <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 16 }}>ℹ️</span>
                  </Tooltip>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["ICICI", "AXIS"].map((bank) => (
                    <div 
                      key={bank} 
                      onClick={() => setBankType(bank)} 
                      style={{
                        cursor: "pointer",
                        padding: "12px 28px",
                        borderRadius: "20px",
                        border: `2px solid ${bankType === bank ? (bank === "ICICI" ? "#bf2a2a" : "#871f42") : (darkMode ? "#475569" : "#ccc")}`,
                        background: bankType === bank 
                          ? `${bank === "ICICI" ? "#ffe6eb" : "#fbeaf0"}` 
                          : (darkMode ? "#334155" : "#f8f8f8"),
                        color: bankType === bank ? "#000" : theme.text,
                        fontWeight: 600,
                        transition: "all 0.3s",
                        fontSize: "15px"
                      }}
                    >
                      {bank}
                    </div>
                  ))}
                </div>
                <small style={{ display: "block", marginTop: 10, color: theme.textSecondary, fontSize: "13px" }}>
                  {bankType === "ICICI" 
                    ? "📊 ICICI: Bank (Excel) + Advance (PDF)" 
                    : "📊 AXIS: Bank (PDF) + Advance (Excel)"}
                </small>
              </div>

              {/* File Upload Cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 600 ? "1fr" : "1fr 1fr",
                gap: "20px",
                marginTop: "24px"
              }}>
                {/* Bank Statement Card */}
                <div style={{
                  border: `2px dashed ${bankFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: bankFile 
                    ? (darkMode ? "#064e3b" : "#f0fdf4") 
                    : (darkMode ? "#0f172a" : "white"),
                  transition: "all 0.3s ease",
                  position: "relative"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    {bankFile ? "📄" : "📁"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                    <Typography variant="h6" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
                      Bank Statement
                    </Typography>
                    <Tooltip title="Upload your bank's transaction statement" arrow>
                      <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 14 }}>ℹ️</span>
                    </Tooltip>
                  </div>
                  <Typography variant="body2" style={{ marginBottom: "16px", fontSize: "13px", color: theme.textSecondary }}>
                    {bankType === "ICICI" ? "Excel (.xlsx)" : "PDF (.pdf)"}
                  </Typography>
                  
                  {bankFile ? (
                    <div style={{
                      background: darkMode ? "#0f172a" : "white",
                      padding: "12px",
                      borderRadius: "8px",
                      display: "inline-block",
                      border: darkMode ? "1px solid #334155" : "none"
                    }}>
                      <div style={{ fontWeight: 600, color: "#10b981", fontSize: "14px" }}>✓ {bankFile.name}</div>
                      <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
                        {(bankFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <FileUpload 
                      key={`bank-${fileResetKey}`}
                      accept={accepts.bank}
                      label="Click or drag to upload"
                      onChange={(files) => setBankFile(files[0] || null)}
                      name="bank_file"
                      uploaderId="bank-upload"
                      darkMode={darkMode}
                    />
                  )}
                </div>

                {/* Advance Statement Card */}
                <div style={{
                  border: `2px dashed ${advanceFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: advanceFile 
                    ? (darkMode ? "#064e3b" : "#f0fdf4") 
                    : (darkMode ? "#0f172a" : "white"),
                  transition: "all 0.3s ease",
                  position: "relative"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    {advanceFile ? "📄" : "📁"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                    <Typography variant="h6" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
                      Advance Statement
                    </Typography>
                    <Tooltip title="Upload your advance account statement" arrow>
                      <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 14 }}>ℹ️</span>
                    </Tooltip>
                  </div>
                  <Typography variant="body2" style={{ marginBottom: "16px", fontSize: "13px", color: theme.textSecondary }}>
                    {bankType === "ICICI" ? "PDF (.pdf)" : "Excel (.xlsx)"}
                  </Typography>
                  
                  {advanceFile ? (
                    <div style={{
                      background: darkMode ? "#0f172a" : "white",
                      padding: "12px",
                      borderRadius: "8px",
                      display: "inline-block",
                      border: darkMode ? "1px solid #334155" : "none"
                    }}>
                      <div style={{ fontWeight: 600, color: "#10b981", fontSize: "14px" }}>✓ {advanceFile.name}</div>
                      <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "4px" }}>
                        {(advanceFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <FileUpload 
                      key={`advance-${fileResetKey}`}
                      accept={accepts.advance}
                      label="Click or drag to upload"
                      onChange={(files) => setAdvanceFile(files[0] || null)}
                      name="advance_file"
                      uploaderId="advance-upload"
                      darkMode={darkMode}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {activeStep === 1 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔄</div>
              <Typography variant="h6" style={{ marginBottom: 16, fontWeight: 600, color: theme.text }}>
                Bank × Advance Matching
              </Typography>
              <Typography variant="body2" style={{ maxWidth: "500px", margin: "0 auto", color: theme.textSecondary }}>
                This step automatically matches Bank transactions with Advance records using reference numbers.
                Click <strong>Next</strong> to process.
              </Typography>
            </div>
          )}

          {activeStep === 2 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: "16px", color: theme.text }}>Select TPA</label>
                  <Tooltip title="Choose your Third Party Administrator for MIS mapping" arrow>
                    <span style={{ cursor: "help", color: theme.textSecondary, fontSize: 16 }}>ℹ️</span>
                  </Tooltip>
                </div>
                <FormControl fullWidth>
                  <InputLabel style={{ color: theme.textSecondary }}>Select TPA</InputLabel>
                  <Select
                    value={tpaName}
                    label="Select TPA"
                    onChange={(e) => setTpaName(e.target.value)}
                    style={{ 
                      background: darkMode ? "#334155" : "white",
                      color: theme.text
                    }}
                  >
                    {tpaChoices.map((tpa) => (
                      <MenuItem key={tpa} value={tpa}>{tpa}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* MIS File Card */}
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
                  <Typography variant="h6" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
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
                    <div style={{ fontWeight: 600, color: "#10b981", fontSize: "14px" }}>✓ {misFile.name}</div>
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
          )}

          {activeStep === 3 && (
            <div style={{
              border: `2px dashed ${outstandingFile ? '#10b981' : (darkMode ? '#475569' : '#ddd')}`,
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              background: outstandingFile 
                ? (darkMode ? "#064e3b" : "#f0fdf4") 
                : (darkMode ? "#0f172a" : "white"),
              transition: "all 0.3s ease"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                {outstandingFile ? "📄" : "📋"}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                <Typography variant="h6" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: theme.text }}>
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
                  <div style={{ fontWeight: 600, color: "#10b981", fontSize: "14px" }}>✓ {outstandingFile.name}</div>
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
          )}
        </div>

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

        {/* Processing Overlay */}
        {loading && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}>
            <div style={{
              background: darkMode ? "#1e293b" : "white",
              padding: "40px",
              borderRadius: "16px",
              textAlign: "center",
              minWidth: "300px",
              maxWidth: "90%",
              border: darkMode ? "1px solid #334155" : "none"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                border: `4px solid ${darkMode ? "#334155" : "#e0e0e0"}`,
                borderTop: `4px solid ${bankType === "ICICI" ? "#bf2a2a" : "#871f42"}`,
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 24px"
              }}></div>
              <Typography variant="h6" style={{ marginBottom: "8px", color: darkMode ? "#f1f5f9" : "#000" }}>
                Processing Step {activeStep + 1}
              </Typography>
              <Typography variant="body2" style={{ color: darkMode ? "#94a3b8" : "textSecondary" }}>
                {steps[activeStep]?.description || "Please wait..."}
              </Typography>
              <div style={{
                marginTop: "16px",
                fontSize: "12px",
                color: darkMode ? "#64748b" : "#999"
              }}>
                This may take a few moments
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <div style={{ 
            marginTop: 16,
            background: darkMode ? "#7f1d1d" : "#fef2f2",
            border: `2px solid ${darkMode ? "#991b1b" : "#ef4444"}`,
            borderRadius: 12,
            padding: 20,
            display: "flex",
            alignItems: "start",
            gap: 16
          }}>
            <div style={{
              fontSize: 32,
              flexShrink: 0
            }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <Typography variant="h6" style={{ color: darkMode ? "#fecaca" : "#dc2626", marginBottom: 8, fontWeight: 600, fontSize: "16px" }}>
                Processing Error
              </Typography>
              <Typography variant="body2" style={{ color: darkMode ? "#fca5a5" : "#7f1d1d", marginBottom: 16, fontSize: "14px" }}>
                {error}
              </Typography>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setError("")}
                  style={{
                    padding: "8px 16px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Dismiss
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  style={{
                    padding: "8px 16px",
                    background: darkMode ? "#1e293b" : "white",
                    color: "#dc2626",
                    border: "2px solid #dc2626",
                    borderRadius: 6,
                    cursor: canProceed ? "pointer" : "not-allowed",
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: canProceed ? 1 : 0.5
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Results Display */}
        {Object.keys(stepResults).length > 0 && (
          <div style={{ 
            marginTop: 32,
            background: theme.cardBg,
            borderRadius: 16,
            padding: 24,
            boxShadow: darkMode ? "0 4px 16px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.08)",
            border: darkMode ? "1px solid #334155" : "none"
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
                📊 Processing Results
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
                      background: res.ok 
                        ? (darkMode ? "#064e3b" : "#f0fdf4") 
                        : (darkMode ? "#7f1d1d" : "#fef2f2"),
                      border: `2px solid ${res.ok ? "#10b981" : "#ef4444"}`,
                      borderRadius: 12,
                      padding: 20,
                      transition: "all 0.3s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: res.ok ? "#10b981" : "#ef4444",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "18px",
                            flexShrink: 0
                          }}>
                            {res.ok ? "✓" : "✗"}
                          </div>
                          <div>
                            <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 2, fontSize: "16px", color: res.ok ? (darkMode ? "#d1fae5" : "#000") : (darkMode ? "#fecaca" : "#000") }}>
                              Step {idx + 1}: {s.label}
                            </Typography>
                            <Typography variant="body2" style={{ fontSize: "13px", color: res.ok ? (darkMode ? "#a7f3d0" : "#666") : (darkMode ? "#fca5a5" : "#666") }}>
                              {s.description}
                            </Typography>
                          </div>
                        </div>

                        {res.ok && res.downloadLinks && (
                          <div style={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: 8, 
                            marginTop: 16 
                          }}>
                            {res.downloadLinks.map((link, i) => (
                              <a
                                key={i}
                                href={`${API_BASE.replace(/\/$/, "")}${link.url}`}
                                download
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "10px 16px",
                                  background: darkMode ? "#0f172a" : "white",
                                  border: "2px solid #10b981",
                                  color: "#10b981",
                                  borderRadius: 8,
                                  textDecoration: "none",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#10b981";
                                  e.currentTarget.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = darkMode ? "#0f172a" : "white";
                                  e.currentTarget.style.color = "#10b981";
                                }}
                              >
                                <span style={{ fontSize: 16 }}>⬇️</span>
                                {link.label}
                              </a>
                            ))}
                          </div>
                        )}

                        {res.zipUrl && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${darkMode ? "#334155" : "#e0e0e0"}` }}>
                            <a 
                              href={`${API_BASE.replace(/\/$/, "")}${res.zipUrl}`}
                              download
                              style={{ 
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "14px 28px",
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "white",
                                borderRadius: 10,
                                textDecoration: "none",
                                fontSize: 16,
                                fontWeight: 700,
                                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                              }}
                            >
                              <span style={{ fontSize: 24 }}>📦</span>
                              Download Complete Package
                            </a>
                          </div>
                        )}

                        {res.ok === false && (
                          <div style={{ color: darkMode ? "#fca5a5" : "#c00", marginTop: 12, fontSize: "14px" }}>
                            ✗ Processing failed: {res.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeStep >= steps.length && (
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
              All steps have been processed successfully. You can download the results above or reset to start over.
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
        )}
      </main>
    </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}