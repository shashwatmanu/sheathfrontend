"use client";

import React, { useState, useEffect } from "react";
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

// Excel Modal Viewer - Fetches Excel and shows in DataModal directly
const ExcelModalViewer = ({ open, onClose, fileUrl, filename, darkMode, apiBase }) => {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open && fileUrl) {
            fetchAndParseExcel();
        }
    }, [open, fileUrl]);

    const fetchAndParseExcel = async () => {
        setLoading(true);
        setError("");
        setData([]);
        setColumns([]);

        try {
            const fullUrl = `${apiBase.replace(/\/$/, "")}${fileUrl}`;

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
        } catch (err) {
            console.error("Error loading Excel:", err);
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Show loading state in a modal
    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                background: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                display: open ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    background: darkMode ? '#0f172a' : '#ffffff',
                    padding: '48px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    color: darkMode ? '#f1f5f9' : '#0f172a'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>⏳</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Excel file...</div>
                    <div style={{ fontSize: '14px', marginTop: '8px', color: darkMode ? '#94a3b8' : '#64748b' }}>
                        Parsing data for preview
                    </div>
                </div>
            </div>
        );
    }

    // Show error state in a modal
    if (error) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                background: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                display: open ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    background: darkMode ? '#0f172a' : '#ffffff',
                    padding: '48px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '8px' }}>
                        Failed to load file
                    </div>
                    <div style={{ fontSize: '14px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '24px' }}>
                        {error}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            background: darkMode ? '#334155' : '#e5e7eb',
                            color: darkMode ? '#f1f5f9' : '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // Show DataModal with parsed data
    return (
        <DataModal
            open={open && data.length > 0}
            onClose={onClose}
            data={data}
            columns={columns}
            filename={filename}
            darkMode={darkMode}
        />
    );
};

export default ExcelModalViewer;
