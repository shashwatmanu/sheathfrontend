"use client";

import "./globals.css";
import React, { useMemo, useState } from "react";
import { FileUpload } from "../components/ui/file-upload.tsx";
import { Button } from "../components/ui/moving-border";
import { SparklesCore } from "../components/ui/sparkles";
import { color } from "framer-motion";

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const [pdf, setPdf] = useState(null);
  const [bank, setBank] = useState(null);
  const [mis, setMis] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(
    () => !!(pdf && bank && mis && outstanding && API_BASE),
    [pdf, bank, mis, outstanding, API_BASE]
  );

  const downloadBlob = async (res) => {
    const cd = res.headers.get("Content-Disposition") || "";
    const match =
      /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
    const suggested =
      decodeURIComponent(match?.[1] || "") ||
      match?.[2] ||
      `recon_${Date.now()}.xlsx`;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggested;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const runRecon = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("pdf", pdf);
      fd.append("bank1", bank);
      fd.append("mis", mis);
      fd.append("outstanding", outstanding);

      const endpoint = `${API_BASE.replace(/\/$/, "")}/reconcile/pdf-recon`;

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
        throw new Error(msg);
      }

      if (ctype.includes("application/json")) {
        const data = await res.json();
        setResult(data);
      } else {
        await downloadBlob(res);
        setResult({ ok: true, streamed: true });
      }
    } catch (e) {
      setError(e?.message || "Upload failed");
      setResult({ ok: false, error: e?.message || "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

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
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          maxHeight: '48px',
        }}
      >
       
        <div style={{display:'flex', flexDirection:'column'}}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight:'bolder', height:'24px'}}>RGCIRC</h1>
        <p style={{width:'90px', fontSize:'10px' , fontWeight:'bold'}}>Recon Dashboard</p>
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
        {/* <h1 style={{ margin: 0, fontSize: 20 }}>Recon Dashboard</h1> */}
        
      </nav>

      <main style={{ margin: "0 auto", maxWidth: 960 }}>
        <p style={{ color: "#555", marginTop: 0 , marginBottom: 8}}>
          Upload required documents and run reconciliation.
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

        {/* Responsive grid for file uploads */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 16,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            boxShadow: "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
            background: "#ffffffff",
          }}
        >
          <div>
            <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
              Select Advanced Account Statement (.pdf)
            </label>
            <FileUpload
            key="1"
              accept="application/pdf"
              label="Select Advanced Account Statement"
              onChange={(files) => setPdf(files[0] || null)}
              name="pdf"
            />
            {pdf && <small>Selected: {pdf.name}</small>}
          </div>

          <div>
            <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
             Select Bank Account Statement (.xlsx)
            </label>
            <FileUpload
            key="2"
              accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              label="Select Bank Account Statement"
              onChange={(files) => setBank(files[0] || null)}
              name="bank1"
            />
            {bank && <small>Selected: {bank.name}</small>}
          </div>

          <div>
            <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
              Select MIS Extract (.xlsx)
            </label>
            <FileUpload
            key="3"
              accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              label="Select MIS Extract"
              onChange={(files) => setMis(files[0] || null)}
              name="mis"
            />
            {mis && <small>Selected: {mis.name}</small>}
          </div>

          <div>
            <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
              Select Outstanding Report (.xlsx)
            </label>
            <FileUpload
            key="4"
              accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              label="Select Outstanding Report"
              onChange={(files) => setOutstanding(files[0] || null)}
              name="outstanding"
            />
            {outstanding && <small>Selected: {outstanding.name}</small>}
          </div>
        </div>

        {/* Action button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 , justifyContent:'center', marginBottom:'8px'}}>
          <Button
            onClick={runRecon}
            disabled={!canSubmit || loading}
            // style={{
            //   padding: "10px 18px",
            //   borderRadius: 8,
            //   cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            //   background: "#111111",
            //   color: "#fff",
            //   border: "none",
            //   fontWeight: 600,
            // }}
            borderRadius="1.75rem"
        className="bg-black dark:bg-slate-900 text-white dark:text-white border-neutral-200 dark:border-slate-800"
          >
            {loading ? "Running..." : "Run Recon"}
          </Button>
          {error && <span style={{ color: "#c00" }}>Error: {error}</span>}
          
        </div>


        {/* Results */}
        {result && (
          <div
            style={{
              marginTop: 16,
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <pre style={{ whiteSpace: "pre-wrap" }}>
              Matches found:{" "}
              {JSON.stringify(result.summary?.matches_found, null, 2)}
            </pre>

            {result?.ok && result?.artifacts?.consolidated_output && (
              <p>
                <a
                  href={result.artifacts.consolidated_output}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download consolidated output
                </a>
              </p>
            )}

            {result?.ok && result?.artifacts?.updated_outstanding && (
              <p>
                <a
                  href={result.artifacts.updated_outstanding}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download updated outstanding
                </a>
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
