"use client";

import { useMemo, useState } from "react";

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

  // Download helper for blob responses (when backend streams a file)
  const downloadBlob = async (res) => {
    const cd = res.headers.get("Content-Disposition") || "";
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
    const suggested =
      decodeURIComponent(match?.[1] || "") || match?.[2] || `recon_${Date.now()}.xlsx`;

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
      // Adjust field names if Kartik’s endpoint expects different keys
      fd.append("pdf", pdf);
      fd.append("bank1", bank);        // for multiple banks: append bank2, bank3, ...
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
    <main style={{ padding: 24, maxWidth: 840, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Recon Uploader</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Upload required documents and run reconciliation.
      </p>

      {!API_BASE && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            padding: 8,
            borderRadius: 6,
            marginBottom: 12
          }}
        >
          <strong>Note:</strong> <code>NEXT_PUBLIC_API_BASE_URL</code> is not set.
          Configure it in your hosting env.
        </div>
      )}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 16,
          display: "grid",
          gap: 12
        }}
      >
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] || null)}
          />
          {pdf && <small>Selected: {pdf.name}</small>}
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Bank (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setBank(e.target.files?.[0] || null)}
          />
          {bank && <small>Selected: {bank.name}</small>}
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>MIS (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setMis(e.target.files?.[0] || null)}
          />
          {mis && <small>Selected: {mis.name}</small>}
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>
            Outstanding (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setOutstanding(e.target.files?.[0] || null)}
          />
          {outstanding && <small>Selected: {outstanding.name}</small>}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={runRecon}
            disabled={!canSubmit || loading}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              cursor: canSubmit && !loading ? "pointer" : "not-allowed"
            }}
          >
            {loading ? "Running..." : "Run Recon"}
          </button>
          {error && <span style={{ color: "#c00" }}>Error: {error}</span>}
        </div>
      </div>

      {result && (
        <div
          style={{
            marginTop: 16,
            border: "1px solid '#eee'",
            borderRadius: 10,
            padding: 12
          }}
        >
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(result, null, 2)}
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
  );
}
