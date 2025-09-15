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

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const [bankFile, setBankFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [misFile, setMisFile] = useState(null);
  const [outstandingFile, setOutstandingFile] = useState(null);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stepResults, setStepResults] = useState({});

  const steps = [
    { key: "bank", label: "Bank Account Statement", fieldName: "bank1", endpoint: "/reconcile/bank", accept: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" },
    { key: "pdf", label: "Advanced Account Statement (PDF)", fieldName: "pdf", endpoint: "/reconcile/pdf", accept: ".pdf,application/pdf" },
    { key: "mis", label: "MIS Extract", fieldName: "mis", endpoint: "/reconcile/mis", accept: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" },
    { key: "outstanding", label: "Outstanding Report", fieldName: "outstanding", endpoint: "/reconcile/outstanding", accept: ".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" },
  ];

  const getFileForIndex = (i) => {
    const m = { 0: bankFile, 1: pdfFile, 2: misFile, 3: outstandingFile };
    return m[i];
  };
  const setFileForIndex = (i, f) => {
    if (i === 0) setBankFile(f);
    if (i === 1) setPdfFile(f);
    if (i === 2) setMisFile(f);
    if (i === 3) setOutstandingFile(f);
  };

  // ✅ FIXED: added all file states as dependencies
  const hasFileForActiveStep = useMemo(
    () => !!getFileForIndex(activeStep),
    [activeStep, bankFile, pdfFile, misFile, outstandingFile]
  );

  useEffect(() => {
    return () => {
      Object.values(stepResults).forEach((r) => {
        if (r && r.blobUrl) URL.revokeObjectURL(r.blobUrl);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, [stepResults]); // ✅ added dependency

  const extractFilenameFromDisposition = (cdHeader) => {
    if (!cdHeader) return null;
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cdHeader);
    return decodeURIComponent(match?.[1] || "") || match?.[2] || null;
  };

  const saveStepResult = (idx, resultObj) =>
    setStepResults((prev) => ({ ...prev, [idx]: resultObj }));

  const uploadStep = async (index) => {
    setError("");
    setLoading(true);

    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL is not set.");
      setLoading(false);
      return false;
    }

    const step = steps[index];
    if (!step) {
      setError("Invalid step.");
      setLoading(false);
      return false;
    }

    const file = getFileForIndex(index);
    if (!file) {
      setError(`Please select a file for "${step.label}".`);
      setLoading(false);
      return false;
    }

    try {
      const fd = new FormData();
      fd.append(step.fieldName, file);

      const endpoint = `${API_BASE.replace(/\/$/, "")}${step.endpoint}`;
      const res = await fetch(endpoint, { method: "POST", body: fd });

      const ctype = res.headers.get("Content-Type") || "";

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          if (ctype.includes("application/json")) {
            const j = await res.json();
            msg = j?.detail || j?.error || JSON.stringify(j);
          } else {
            msg = await res.text();
          }
        } catch (_) {}
        saveStepResult(index, { ok: false, error: msg });
        setError(msg);
        return false;
      }

      if (ctype.includes("application/json")) {
        const data = await res.json();
        saveStepResult(index, { ok: true, json: data });
      } else {
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const filename =
          extractFilenameFromDisposition(cd) ||
          `recon_${steps[index].key}_${Date.now()}.xlsx`;
        const blobUrl = URL.createObjectURL(blob);
        saveStepResult(index, { ok: true, blobUrl, filename });
      }

      return true;
    } catch (e) {
      const msg = e?.message || "Upload failed";
      saveStepResult(index, { ok: false, error: msg });
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setError("");
    const ok = await uploadStep(activeStep);
    if (ok) {
      setActiveStep((s) => Math.min(s + 1, steps.length));
    }
  };

  const handleBack = () => {
    setError("");
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const handleReset = () => {
    Object.values(stepResults).forEach((r) => {
      if (r && r.blobUrl) URL.revokeObjectURL(r.blobUrl);
    });
    setBankFile(null);
    setPdfFile(null);
    setMisFile(null);
    setOutstandingFile(null);
    setStepResults({});
    setActiveStep(0);
    setError("");
  };

  const handleDownloadBlob = (blobUrl, filename) => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || `recon_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const currentStepCfg = steps[activeStep];

  return (
    <>
      <nav
        style={{
          background: "#111111",
          color: "#fff",
          padding: "12px 24px",
          marginBottom: 24,
          borderRadius: "0 0 6px 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxHeight: "48px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: "bolder",
              height: "24px",
            }}
          >
            RGCIRC
          </h1>
          <p style={{ width: "90px", fontSize: "10px", fontWeight: "bold" }}>
            Recon Dashboard
          </p>
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

      <main style={{ margin: "0 auto", maxWidth: 720, marginTop: "80px" }}>
        <p style={{ color: "#555", marginTop: 0, marginBottom: "40px" }}>
          Upload one file per step. Choose file and click <strong>Next</strong>.
        </p>

        {!API_BASE && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffeeba",
              padding: 8,
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <strong>Note:</strong>{" "}
            <code>NEXT_PUBLIC_API_BASE_URL</code> is not set.
          </div>
        )}

        <Box sx={{ width: "100%", mb: 2 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((s, idx) => (
              <Step key={s.key} completed={!!stepResults[idx]?.ok}>
                <StepLabel>{s.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 20,
            boxShadow: "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
            background: "#ffffffff",
          }}
        >
          <div>
            <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
              {currentStepCfg?.label}
            </label>

            <FileUpload
              accept={currentStepCfg?.accept}
              label={`Select ${currentStepCfg?.label}`}
              onChange={(files) => setFileForIndex(activeStep, files[0] || null)}
              name={currentStepCfg?.fieldName}
              uploaderId={currentStepCfg?.key}
            />

            {getFileForIndex(activeStep) && (
              <div style={{ marginTop: 8 }}>
                <small>Selected: {getFileForIndex(activeStep).name}</small>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 16,
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
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
              disabled={!hasFileForActiveStep || loading}
              borderRadius="1.75rem"
              className="bg-black dark:bg-slate-900 text-white dark:text-white border-neutral-200 dark:border-slate-800"
            >
              {loading
                ? "Uploading..."
                : activeStep === steps.length - 1
                ? "Finish (Upload)"
                : "Next (Upload)"}
            </FancyButton>
          </div>

          <MuiButton variant="text" onClick={handleReset} disabled={loading}>
            Reset
          </MuiButton>

          {error && <span style={{ color: "#c00" }}>Error: {error}</span>}
        </div>

        <div style={{ marginTop: 16 }}>
          {Object.keys(stepResults).length > 0 && (
            <div
              style={{
                marginTop: 8,
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Typography variant="h6">Step results</Typography>

              {steps.map((s, idx) => {
                const res = stepResults[idx];
                return (
                  <div
                    key={s.key}
                    style={{
                      marginTop: 12,
                      padding: 8,
                      borderBottom: "1px solid #f2f2f2",
                    }}
                  >
                    <strong>
                      Step {idx + 1}: {s.label}
                    </strong>
                    <div style={{ marginTop: 6 }}>
                      {!res && <em>Not uploaded yet</em>}

                      {res && res.ok && res.blobUrl && (
                        <>
                          <div>Upload successful. File available to download:</div>
                          <div style={{ marginTop: 6 }}>
                            <MuiButton
                              onClick={() =>
                                handleDownloadBlob(res.blobUrl, res.filename)
                              }
                              variant="contained"
                            >
                              Download ({res.filename})
                            </MuiButton>
                          </div>
                        </>
                      )}

                      {res && res.ok && res.json && (
                        <>
                          <div>Upload successful. Response:</div>
                          <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                            {JSON.stringify(res.json, null, 2)}
                          </pre>

                          {res.json?.artifacts && (
                            <div style={{ marginTop: 8 }}>
                              {res.json.artifacts.consolidated_output && (
                                <div>
                                  <a
                                    href={res.json.artifacts.consolidated_output}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Download consolidated output
                                  </a>
                                </div>
                              )}
                              {res.json.artifacts.updated_outstanding && (
                                <div>
                                  <a
                                    href={res.json.artifacts.updated_outstanding}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Download updated outstanding
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {res && res.ok === false && (
                        <>
                          <div style={{ color: "#c00" }}>
                            Upload failed: {res.error}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeStep >= steps.length && (
          <div style={{ marginTop: 16 }}>
            <Typography sx={{ mt: 2, mb: 1 }}>
              All steps completed — you&apos;re finished
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Box sx={{ flex: "1 1 auto" }} />
              <MuiButton onClick={handleReset}>Reset</MuiButton>
            </Box>
          </div>
        )}
      </main>
    </>
  );
}
