"use client";

import React, { useState, useMemo } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { X, Download, Eye, FileSpreadsheet } from "lucide-react";

const ReconciliationFilesModal = ({
    open,
    onClose,
    reconciliation,
    files,
    loading,
    darkMode,
    apiBase,
    onViewFile
}) => {
    if (!reconciliation) return null;

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        bgcolor: darkMode ? '#0f172a' : '#ffffff',
        borderRadius: '24px',
        boxShadow: darkMode
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Helper function to get bank-specific styling
    const getBankCardStyle = (bankType) => {
        const type = (bankType || "").toLowerCase();
        if (type.includes("standard")) return {
            background: "linear-gradient(135deg, #003087 0%, #0056b3 100%)",
            icon: "💎"
        };
        if (type.includes("icici")) return {
            background: "linear-gradient(135deg, #871f42 0%, #f37021 100%)",
            icon: "🟠"
        };
        if (type.includes("axis")) return {
            background: "linear-gradient(135deg, #871242 0%, #be185d 100%)",
            icon: "🔴"
        };
        return {
            background: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
            icon: "🏦"
        };
    };

    // Helper function to extract file type from filename
    const getFileTypeLabel = (fileName) => {
        const lower = fileName.toLowerCase();
        if (lower.includes('step_2') || lower.includes('match')) return 'Matches';
        if (lower.includes('step_4') || lower.includes('outstanding')) return 'Outstanding';
        if (lower.includes('step_3') || lower.includes('advance')) return 'Advance';
        if (lower.includes('summary')) return 'Summary';
        if (lower.includes('consolidated') || lower.includes('posting')) return 'Consolidated';
        return 'Report';
    };

    // Organize files by category
    const organizedFiles = useMemo(() => {
        if (!files) return {};

        const categories = {
            summary: [],
            consolidated: [],
            bankSpecific: []
        };

        Object.entries(files).forEach(([fileName, fileUrl]) => {
            if (fileName === 'zip') return; // Skip zip file

            const lowerName = fileName.toLowerCase();

            if (lowerName.includes('overall') || lowerName.includes('summary')) {
                categories.summary.push({ fileName, fileUrl });
            } else if (lowerName.includes('consolidated') || lowerName.includes('posting')) {
                categories.consolidated.push({ fileName, fileUrl });
            } else {
                // Extract bank and TPA info from filename if possible
                categories.bankSpecific.push({ fileName, fileUrl });
            }
        });

        return categories;
    }, [files]);

    const downloadFile = async (fileUrl, fileName) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const fullUrl = `${apiBase.replace(/\/$/, "")}${fileUrl}`;
            const response = await fetch(fullUrl, { headers });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            alert('Download failed. Please try again.');
        }
    };

    const FileCard = ({ fileName, fileUrl }) => {
        // Try to extract bank type from filename
        const detectBankFromFilename = (name) => {
            const upper = name.toUpperCase();
            if (upper.includes('ICICI')) return 'ICICI';
            if (upper.includes('AXIS')) return 'AXIS';
            if (upper.includes('STANDARD')) return 'STANDARD CHARTERED';
            // Fall back to reconciliation bank type
            return reconciliation.bank_type || 'Bank';
        };

        const detectedBank = detectBankFromFilename(fileName);
        const bankStyle = getBankCardStyle(detectedBank);
        const fileType = getFileTypeLabel(fileName);

        return (
            <div
                className="group p-4 rounded-xl border transition-all hover:shadow-md"
                style={{
                    background: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                    borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Bank Badge */}
                        <div
                            className="px-3 py-2 rounded-lg shadow-sm"
                            style={{
                                background: bankStyle.background,
                            }}
                        >
                            <div className="text-white font-bold text-xs text-center">
                                {bankStyle.icon}
                            </div>
                            <div className="text-white font-bold text-[10px] text-center mt-0.5 uppercase tracking-wide">
                                {detectedBank}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p
                                className="font-semibold text-sm truncate"
                                style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                                title={fileName}
                            >
                                {fileName.replace(/_/g, ' ').replace(/\.xlsx$/i, '')}
                            </p>
                            <p
                                className="text-xs mt-0.5 flex items-center gap-1"
                                style={{ color: darkMode ? '#94a3b8' : '#64748b' }}
                            >
                                <FileSpreadsheet size={12} />
                                {fileType}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onViewFile(fileUrl, fileName)}
                            className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-80"
                            style={{
                                background: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                color: darkMode ? '#60a5fa' : '#2563eb',
                                border: `1px solid ${darkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                            }}
                        >
                            <Eye size={16} />
                            Preview
                        </button>
                        <button
                            onClick={() => downloadFile(fileUrl, fileName)}
                            className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-80"
                            style={{
                                background: darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                                color: darkMode ? '#6ee7b7' : '#059669',
                                border: `1px solid ${darkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                            }}
                        >
                            <Download size={16} />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="reconciliation-files-modal"
        >
            <Box sx={modalStyle}>
                {/* Header */}
                <div
                    className="p-6 border-b"
                    style={{
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        background: darkMode ? '#1e293b' : '#f8fafc',
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                                    style={{
                                        background: getBankCardStyle(reconciliation.bank_type).background
                                    }}
                                >
                                    {reconciliation.bank_type || "Unknown"}
                                </div>
                                {reconciliation.username && (
                                    <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/90 text-white shadow-lg flex items-center gap-1">
                                        👤 {reconciliation.username}
                                    </div>
                                )}
                            </div>
                            <h2
                                className="text-2xl font-bold mb-1"
                                style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                            >
                                Reconciliation Files
                            </h2>
                            <p
                                className="text-sm"
                                style={{ color: darkMode ? '#94a3b8' : '#64748b' }}
                            >
                                📅 {formatDate(reconciliation.timestamp)}
                                {reconciliation.tpa_name && ` • 🏢 ${reconciliation.tpa_name}`}
                            </p>
                        </div>
                        <IconButton
                            onClick={onClose}
                            sx={{
                                color: darkMode ? '#94a3b8' : '#64748b',
                                '&:hover': {
                                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                }
                            }}
                        >
                            <X size={24} />
                        </IconButton>
                    </div>

                    {/* Stats */}
                    {reconciliation.summary && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div
                                className="p-3 rounded-xl border"
                                style={{
                                    background: darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                                    borderColor: darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                                }}
                            >
                                <div
                                    className="text-xs mb-1"
                                    style={{ color: darkMode ? '#6ee7b7' : '#059669' }}
                                >
                                    Settled Claims
                                </div>
                                <div
                                    className="font-bold text-lg"
                                    style={{ color: darkMode ? '#34d399' : '#047857' }}
                                >
                                    {reconciliation.summary.step2_matches || 0}
                                </div>
                            </div>
                            <div
                                className="p-3 rounded-xl border"
                                style={{
                                    background: darkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.05)',
                                    borderColor: darkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
                                }}
                            >
                                <div
                                    className="text-xs mb-1"
                                    style={{ color: darkMode ? '#fcd34d' : '#d97706' }}
                                >
                                    Found in Outstanding
                                </div>
                                <div
                                    className="font-bold text-lg"
                                    style={{ color: darkMode ? '#fbbf24' : '#b45309' }}
                                >
                                    {reconciliation.summary.step4_outstanding || 0}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Files List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-5xl mb-4 animate-pulse">⏳</div>
                            <p style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
                                Loading files...
                            </p>
                        </div>
                    ) : !files || Object.keys(files).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-5xl mb-4 opacity-50">📭</div>
                            <p
                                className="text-lg font-semibold"
                                style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                            >
                                No files available
                            </p>
                            <p
                                className="text-sm mt-1"
                                style={{ color: darkMode ? '#94a3b8' : '#64748b' }}
                            >
                                Files may still be processing or unavailable
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Reports */}
                            {organizedFiles.summary.length > 0 && (
                                <div>
                                    <h3
                                        className="text-sm font-bold mb-3 flex items-center gap-2"
                                        style={{ color: darkMode ? '#60a5fa' : '#2563eb' }}
                                    >
                                        📊 Summary Reports
                                    </h3>
                                    <div className="space-y-3">
                                        {organizedFiles.summary.map(({ fileName, fileUrl }) => (
                                            <FileCard key={fileName} fileName={fileName} fileUrl={fileUrl} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Consolidated Reports */}
                            {organizedFiles.consolidated.length > 0 && (
                                <div>
                                    <h3
                                        className="text-sm font-bold mb-3 flex items-center gap-2"
                                        style={{ color: darkMode ? '#34d399' : '#059669' }}
                                    >
                                        📑 Consolidated Reports
                                    </h3>
                                    <div className="space-y-3">
                                        {organizedFiles.consolidated.map(({ fileName, fileUrl }) => (
                                            <FileCard key={fileName} fileName={fileName} fileUrl={fileUrl} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bank-Specific Files */}
                            {organizedFiles.bankSpecific.length > 0 && (
                                <div>
                                    <h3
                                        className="text-sm font-bold mb-3 flex items-center gap-2"
                                        style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                                    >
                                        🏦 {reconciliation.bank_type || 'Bank'} • {reconciliation.tpa_name || 'TPA'} Files
                                    </h3>
                                    <div className="space-y-3">
                                        {organizedFiles.bankSpecific.map(({ fileName, fileUrl }) => (
                                            <FileCard key={fileName} fileName={fileName} fileUrl={fileUrl} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Box>
        </Modal>
    );
};

export default ReconciliationFilesModal;
