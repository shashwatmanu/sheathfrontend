"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Typography from "@mui/material/Typography";

export default function VerifyEmailPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
  };

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const formData = new URLSearchParams();
      formData.append("token", token);

      const response = await fetch(
        `${API_BASE.replace(/\/$/, "")}/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.detail || "Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("[Verify Email] Error:", error);
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div style={{ 
      background: theme.bg,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      transition: "background 0.3s ease"
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%"
      }}>
        {/* Card */}
        <div style={{
          background: theme.cardBg,
          borderRadius: "16px",
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: darkMode 
            ? "0 8px 32px rgba(0,0,0,0.3)" 
            : "0 8px 32px rgba(0,0,0,0.1)",
          border: darkMode ? `1px solid ${theme.border}` : "none"
        }}>
          {/* Icon */}
          <div style={{ 
            fontSize: "80px", 
            marginBottom: "24px",
            animation: status === "verifying" ? "pulse 2s infinite" : "none"
          }}>
            {status === "verifying" && "⏳"}
            {status === "success" && "✅"}
            {status === "error" && "❌"}
          </div>

          {/* Title */}
          <Typography 
            variant="h4" 
            style={{ 
              fontWeight: 700, 
              color: theme.text, 
              marginBottom: "16px" 
            }}
          >
            {status === "verifying" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </Typography>

          {/* Message */}
          <Typography 
            variant="body1" 
            style={{ 
              color: theme.textSecondary, 
              marginBottom: "32px",
              lineHeight: 1.6
            }}
          >
            {message || "Please wait while we verify your email address..."}
          </Typography>

          {/* Actions */}
          {status === "success" && (
            <div style={{
              padding: "16px",
              background: darkMode ? "#064e3b" : "#f0fdf4",
              borderRadius: "8px",
              marginBottom: "24px"
            }}>
              <Typography variant="body2" style={{ 
                color: darkMode ? "#d1fae5" : "#166534",
                marginBottom: "8px"
              }}>
                🎉 Your email has been successfully verified!
              </Typography>
              <Typography variant="body2" style={{ 
                color: darkMode ? "#a7f3d0" : "#15803d",
                fontSize: "13px"
              }}>
                Redirecting to dashboard in 3 seconds...
              </Typography>
            </div>
          )}

          {status === "error" && (
            <div style={{
              padding: "16px",
              background: darkMode ? "#7f1d1d" : "#fef2f2",
              borderRadius: "8px",
              marginBottom: "24px"
            }}>
              <Typography variant="body2" style={{ 
                color: darkMode ? "#fca5a5" : "#991b1b",
                marginBottom: "12px"
              }}>
                Common issues:
              </Typography>
              <ul style={{ 
                textAlign: "left",
                color: darkMode ? "#fecaca" : "#7f1d1d",
                fontSize: "13px",
                margin: "0 0 0 20px",
                padding: 0
              }}>
                <li>Link expired (valid for 24 hours)</li>
                <li>Link already used</li>
                <li>Invalid or corrupted link</li>
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            {status === "success" && (
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "12px 32px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Go to Dashboard
              </button>
            )}

            {status === "error" && (
              <>
                <button
                  onClick={() => router.push("/dashboard/profile")}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Request New Link
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    padding: "12px 24px",
                    background: darkMode ? "#334155" : "#f3f4f6",
                    color: theme.text,
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Back to Dashboard
                </button>
              </>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              marginTop: "32px",
              padding: "8px 16px",
              background: "rgba(0,0,0,0.05)",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "14px",
              color: theme.text
            }}
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "24px",
          textAlign: "center",
          color: theme.textSecondary,
          fontSize: "13px"
        }}>
          <p style={{ margin: "8px 0" }}>
            Having trouble? Contact support or visit our help center
          </p>
          <p style={{ margin: "8px 0" }}>
            © 2025 RGCIRC Reconciliation Platform
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}