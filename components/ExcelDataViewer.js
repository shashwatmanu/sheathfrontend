"use client";

import React, { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import Collapse from "@mui/material/Collapse";
import DataModal from './ui/DataModal';

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

// Excel Data Viewer Component
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
                            No data found
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

export default ExcelDataViewer;
