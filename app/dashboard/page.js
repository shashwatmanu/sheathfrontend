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

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

  return (
    <>
      <nav style={{ 
        background: "#111111", 
        color: "#fff", 
        padding: "12px 24px", 
        marginBottom: 24, 
        borderRadius: "0 0 6px 6px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        maxHeight: "48px" 
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bolder", height: "24px" }}>RGCIRC</h1>
          <p style={{ width: "90px", fontSize: "10px", fontWeight: "bold" }}>Recon Dashboard</p>
        </div>
        <SparklesCore 
          id="tsparticlesfullpage" 
          background="transparent" 
          minSize={0.1} 
          maxSize={0.8} 
          particleDensity={100} 
          className="w-full h-full" 
          particleColor="#FFFFFF"
        />
      </nav>

      <main style={{ margin: "0 auto", maxWidth: 720, marginTop: "40px" }}>
        <p style={{ color: "#555", marginTop: 0, marginBottom: "40px" }}>
          Complete each step in sequence. Click <strong>Next</strong> to proceed.
        </p>

        {!API_BASE && (
          <div style={{ 
            background: "#fff3cd", 
            border: "1px solid #ffeeba", 
            padding: 8, 
            borderRadius: 6, 
            marginBottom: 12 
          }}>
            <strong>Note:</strong> <code>NEXT_PUBLIC_API_BASE_URL</code> is not set.
          </div>
        )}

        <Box sx={{ width: "100%", mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((s, idx) => (
              <Step key={s.key} completed={!!stepResults[idx]?.ok}>
                <StepLabel>{s.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <div style={{
          borderRadius: 16,
          padding: 24,
          background: `linear-gradient(135deg, #f0f4ff, #ffffff)`,
          boxShadow: `0 0 50px ${bankShadowColor}`,
          transition: "all 0.3s ease"
        }}>
          
          {activeStep === 0 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Select Bank Type
                </label>
                <div style={{ display: "flex", gap: 12 }}>
                  {["ICICI", "AXIS"].map((bank) => (
                    <div 
                      key={bank} 
                      onClick={() => setBankType(bank)} 
                      style={{
                        cursor: "pointer",
                        padding: "10px 24px",
                        borderRadius: "20px",
                        border: `2px solid ${bankType === bank ? (bank === "ICICI" ? "#bf2a2a" : "#871f42") : "#ccc"}`,
                        background: bankType === bank ? `${bank === "ICICI" ? "#ffe6eb" : "#fbeaf0"}` : "#f8f8f8",
                        fontWeight: 600,
                        transition: "all 0.3s"
                      }}
                    >
                      {bank}
                    </div>
                  ))}
                </div>
                <small style={{ display: "block", marginTop: 8, color: "#666" }}>
                  {bankType === "ICICI" 
                    ? "ICICI: Bank (Excel) + Advance (PDF)" 
                    : "AXIS: Bank (PDF) + Advance (Excel)"}
                </small>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                  Bank Statement ({bankType === "ICICI" ? "Excel" : "PDF"})
                </label>
                <FileUpload 
                  key={`bank-${fileResetKey}`}
                  accept={accepts.bank}
                  label={`Select Bank Statement`}
                  onChange={(files) => setBankFile(files[0] || null)}
                  name="bank_file"
                  uploaderId="bank-upload"
                />
                {bankFile && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: bankType === "ICICI" ? "#bf2a2a" : "#871f42",
                      animation: "pulse 1.2s infinite",
                    }}></div>
                    <small>Selected: {bankFile.name}</small>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                  Advance Account Statement ({bankType === "ICICI" ? "PDF" : "Excel"})
                </label>
                <FileUpload 
                  key={`advance-${fileResetKey}`}
                  accept={accepts.advance}
                  label={`Select Advance Statement`}
                  onChange={(files) => setAdvanceFile(files[0] || null)}
                  name="advance_file"
                  uploaderId="advance-upload"
                />
                {advanceFile && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: bankType === "ICICI" ? "#bf2a2a" : "#871f42",
                      animation: "pulse 1.2s infinite",
                    }}></div>
                    <small>Selected: {advanceFile.name}</small>
                  </div>
                )}
              </div>
            </>
          )}

          {activeStep === 1 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Typography variant="h6" style={{ marginBottom: 12 }}>
                Bank × Advance Matching
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This step automatically matches Bank transactions with Advance records.
                Click <strong>Next</strong> to process.
              </Typography>
            </div>
          )}

          {activeStep === 2 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <FormControl fullWidth>
                  <InputLabel>Select TPA</InputLabel>
                  <Select
                    value={tpaName}
                    label="Select TPA"
                    onChange={(e) => setTpaName(e.target.value)}
                  >
                    {tpaChoices.map((tpa) => (
                      <MenuItem key={tpa} value={tpa}>{tpa}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                  MIS Extract File
                </label>
                <FileUpload 
                  key={`mis-${fileResetKey}`}
                  accept={accepts.mis}
                  label="Select MIS File"
                  onChange={(files) => setMisFile(files[0] || null)}
                  name="mis_file"
                  uploaderId="mis-upload"
                />
                {misFile && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#3b82f6",
                      animation: "pulse 1.2s infinite",
                    }}></div>
                    <small>Selected: {misFile.name}</small>
                  </div>
                )}
              </div>
            </>
          )}

          {activeStep === 3 && (
            <div>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                Outstanding Report
              </label>
              <FileUpload 
                key={`outstanding-${fileResetKey}`}
                accept={accepts.outstanding}
                label="Select Outstanding File"
                onChange={(files) => setOutstandingFile(files[0] || null)}
                name="outstanding_file"
                uploaderId="outstanding-upload"
              />
              {outstandingFile && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#10b981",
                    animation: "pulse 1.2s infinite",
                  }}></div>
                  <small>Selected: {outstandingFile.name}</small>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ 
          display: "flex", 
          gap: 8, 
          alignItems: "center", 
          marginTop: 16, 
          justifyContent: "center", 
          marginBottom: "8px" 
        }}>
          <MuiButton 
            variant="text" 
            disabled={activeStep === 0 || loading} 
            onClick={handleBack}
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
          >
            Reset
          </MuiButton>
        </div>

        {error && (
          <div style={{ 
            marginTop: 12, 
            padding: 12, 
            background: "#fee", 
            border: "1px solid #fcc", 
            borderRadius: 6, 
            color: "#c00" 
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {Object.keys(stepResults).length > 0 && (
          <div style={{ 
            marginTop: 24, 
            border: "1px solid #eee", 
            borderRadius: 10, 
            padding: 16 
          }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>
              Step Results
            </Typography>
            {steps.map((s, idx) => {
              const res = stepResults[idx];
              if (!res) return null;
              return (
                <div 
                  key={s.key} 
                  style={{ 
                    marginTop: 12, 
                    padding: 12, 
                    borderBottom: "1px solid #f2f2f2", 
                    marginBottom: 12 
                  }}
                >
                  <strong>Step {idx + 1}: {s.label}</strong>
                  <div style={{ marginTop: 8 }}>
                    {res?.ok && (
                      <>
                        <div style={{ color: "#059669", marginBottom: 12 }}>
                          ✓ Processing successful
                        </div>
                        
                        {res.downloadLinks && res.downloadLinks.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                            {res.downloadLinks.map((link, i) => (
                              <a
                                key={i}
                                href={`${API_BASE.replace(/\/$/, "")}${link.url}`}
                                download
                                style={{
                                  textDecoration: "none",
                                  padding: "8px 14px",
                                  background: "#111",
                                  color: "#fff",
                                  borderRadius: "6px",
                                  width: "fit-content",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                }}
                              >
                                ⬇️ {link.label}
                              </a>
                            ))}
                          </div>
                        )}

                        {res.zipUrl && (
                          <div style={{ marginTop: 12 }}>
                            <a 
                              href={`${API_BASE.replace(/\/$/, "")}${res.zipUrl}`}
                              download
                              style={{ 
                                display: "inline-block",
                                padding: "12px 24px",
                                background: "#10b981",
                                color: "white",
                                borderRadius: 6,
                                textDecoration: "none",
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#059669"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#10b981"}
                            >
                              📦 Download Complete ZIP Package
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    {res?.ok === false && (
                      <div style={{ color: "#c00" }}>
                        ✗ Processing failed: {res.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeStep >= steps.length && (
          <div style={{ marginTop: 16 }}>
            <Typography sx={{ mt: 2, mb: 1 }}>
              Reconciliation completed! You can reset to start over.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Box sx={{ flex: "1 1 auto" }} />
              <MuiButton onClick={handleReset}>Reset</MuiButton>
            </Box>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
      `}</style>
    </>
  );
}