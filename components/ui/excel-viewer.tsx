"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
    Download,
    ChevronDown,
    ChevronUp,
    FileSpreadsheet,
    Table as TableIcon,
    Loader2,
    AlertCircle,
    Eye,
    Maximize2
} from "lucide-react";
import { cn } from "../../utils";
import DataModal from "./DataModal";

interface ExcelViewerProps {
    url: string;
    label: string;
    darkMode: boolean;
    apiBase: string;
}

export const ExcelViewer = ({ url, label, darkMode, apiBase }: ExcelViewerProps) => {
    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [displayLimit] = useState(50);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchAndParseExcel = async () => {
        setLoading(true);
        setError("");
        try {
            const fullUrl = `${apiBase.replace(/\/$/, "")}${url}`;
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(fullUrl, { headers });

            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            setColumns(jsonData.length > 0 ? Object.keys(jsonData[0] as object) : []);
            setData(jsonData as any[]);
            setDataLoaded(true);
        } catch (err: any) {
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

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('access_token');
            const headers: Record<string, string> = {};
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
            a.download = url.split('/').pop() || 'download.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            alert('Download failed. Please try again.');
        }
    };

    const displayData = data.slice(0, displayLimit);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "w-full rounded-xl overflow-hidden border transition-all duration-300",
                darkMode
                    ? "bg-slate-900/50 border-slate-700 backdrop-blur-sm"
                    : "bg-white border-gray-200 shadow-sm"
            )}
        >
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center justify-between p-4 cursor-pointer transition-colors",
                    darkMode ? "hover:bg-slate-800/50" : "hover:bg-gray-50",
                    expanded && (darkMode ? "bg-slate-800/50 border-b border-slate-700" : "bg-gray-50 border-b border-gray-200")
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                    )}>
                        <FileSpreadsheet size={20} />
                    </div>
                    <div>
                        <h3 className={cn(
                            "font-semibold text-sm",
                            darkMode ? "text-slate-200" : "text-gray-900"
                        )}>
                            {label}
                        </h3>
                        {dataLoaded && (
                            <p className={cn(
                                "text-xs",
                                darkMode ? "text-slate-400" : "text-gray-500"
                            )}>
                                {data.length.toLocaleString()} rows found
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className={cn(
                            "p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium",
                            darkMode
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        )}
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Download</span>
                    </button>

                    <div className={cn(
                        "p-2 rounded-lg transition-transform duration-300",
                        darkMode ? "text-slate-400" : "text-gray-400",
                        expanded && "rotate-180"
                    )}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-4">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Loader2 className={cn("animate-spin mb-3", darkMode ? "text-emerald-500" : "text-emerald-600")} size={32} />
                                    <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-gray-500")}>
                                        Parsing Excel file...
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className={cn(
                                    "flex items-center gap-3 p-4 rounded-lg",
                                    darkMode ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"
                                )}>
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {!loading && !error && dataLoaded && (
                                <>
                                    {data.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className={cn(
                                                "inline-flex p-4 rounded-full mb-3",
                                                darkMode ? "bg-slate-800 text-slate-500" : "bg-gray-100 text-gray-400"
                                            )}>
                                                <TableIcon size={32} />
                                            </div>
                                            <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-gray-500")}>
                                                No data found in this file
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Table Container */}
                                            <div className={cn(
                                                "relative overflow-hidden rounded-lg border",
                                                darkMode ? "border-slate-700" : "border-gray-200"
                                            )}>
                                                <div className="overflow-x-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className={cn(
                                                            "sticky top-0 z-10",
                                                            darkMode ? "bg-slate-800 text-slate-200" : "bg-gray-50 text-gray-700"
                                                        )}>
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b border-gray-200/10 w-12">#</th>
                                                                {columns.map((col, idx) => (
                                                                    <th key={idx} className="p-3 font-semibold border-b border-gray-200/10 min-w-[120px]">
                                                                        {col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className={cn(
                                                            "divide-y",
                                                            darkMode ? "divide-slate-800 text-slate-300" : "divide-gray-100 text-gray-600"
                                                        )}>
                                                            {displayData.map((row, rowIdx) => (
                                                                <tr
                                                                    key={rowIdx}
                                                                    className={cn(
                                                                        "transition-colors",
                                                                        darkMode
                                                                            ? "hover:bg-slate-800/50 even:bg-slate-900 odd:bg-slate-900/50"
                                                                            : "hover:bg-gray-50 even:bg-white odd:bg-gray-50/50"
                                                                    )}
                                                                >
                                                                    <td className="p-3 font-medium opacity-50">{rowIdx + 1}</td>
                                                                    {columns.map((col, colIdx) => (
                                                                        <td key={colIdx} className="p-3 truncate max-w-[200px]" title={String(row[col] || "")}>
                                                                            {String(row[col] || "")}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                                <p className={cn("text-xs", darkMode ? "text-slate-500" : "text-gray-500")}>
                                                    Showing {Math.min(displayLimit, data.length)} of {data.length} rows
                                                </p>

                                                <button
                                                    onClick={() => setModalOpen(true)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all transform active:scale-95",
                                                        darkMode
                                                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                                                    )}
                                                >
                                                    <Maximize2 size={16} />
                                                    View Full Dataset
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <DataModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                data={data}
                columns={columns}
                filename={label}
                darkMode={darkMode}
            />
        </motion.div>
    );
};
