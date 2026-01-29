import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';

const SideNote = ({ darkMode }) => {
    const [isOpen, setIsOpen] = useState(true);

    // Theme configuration
    const theme = {
        bg: darkMode ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)",
        border: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        text: darkMode ? "#f1f5f9" : "#1e293b",
        textSecondary: darkMode ? "#94a3b8" : "#64748b",
        accent: "#10b981", // Emerald green for consistency
        shadow: darkMode ? "0 4px 30px rgba(0, 0, 0, 0.5)" : "0 4px 30px rgba(0, 0, 0, 0.1)",
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    right: 0,
                    top: '120px',
                    background: theme.accent,
                    color: 'white',
                    padding: '10px 4px',
                    borderRadius: '8px 0 0 8px',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 40,
                    boxShadow: theme.shadow,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '12px'
                }}
            >
                <Lightbulb size={20} />
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', marginTop: '4px' }}>Guide</span>
            </button>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                right: '20px',
                top: '120px',
                width: '320px',
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto',
                background: theme.bg,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${theme.border}`,
                borderRadius: '16px',
                padding: '24px',
                zIndex: 40,
                boxShadow: theme.shadow,
                color: theme.text,
                transition: 'all 0.3s ease',
            }}
            className="hidden xl:block" // Hide on smaller screens by default, show on XL screens
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Lightbulb size={18} color={theme.accent} strokeWidth={2.5} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Quick Guide</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.textSecondary,
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
                    onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                >
                    <X size={20} />
                </button>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '16px', fontWeight: 500 }}>
                    RecoWiz is designed to bring order to the chaotic bank-TPA reconciliation process. Please follow these simple steps:
                </p>

                <ol style={{ paddingLeft: '20px', marginBottom: '20px', color: theme.textSecondary }}>
                    <li style={{ marginBottom: '10px', paddingLeft: '4px' }}>
                        <strong style={{ color: theme.text }}>Download dumps</strong> directly from the portal (apply filters as needed during download, without modifying the file content afterwards).
                    </li>
                    {/* <li style={{ marginBottom: '10px', paddingLeft: '4px' }}>
                        <strong style={{ color: theme.text }}>Verify</strong> the file format is <code>.xlsx</code>; convert it if necessary.
                    </li> */}
                    <li style={{ marginBottom: '10px', paddingLeft: '4px' }}>
                        <strong style={{ color: theme.text }}>Upload</strong> the bank and TPA files, along with the outstanding, and let RecoWiz handle the rest 😊.
                    </li>
                </ol>

                <div style={{
                    background: darkMode ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.08)',
                    borderLeft: `3px solid ${theme.accent}`,
                    padding: '16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: theme.textSecondary,
                    fontStyle: 'italic'
                }}>
                    <strong style={{ color: theme.text, fontStyle: 'normal' }}>Note:</strong> To maintain standardization and efficiency, please prioritize using Excel dumps from the portal. If available, avoid using PDFs or alternative Excel formats received via email, as they may reintroduce the chaos.
                </div>
            </div>
        </div>
    );
};

export default SideNote;
