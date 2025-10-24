"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { SparklesCore } from "../../../components/ui/sparkles";
import { login, isAuthenticated } from "../../../lib/auth";

// Inner component that uses useSearchParams
function LoginFormContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user just registered
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registration successful! Please login.");
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      console.log("[Login] User already authenticated, redirecting to dashboard");
      window.location.href = "/dashboard"; // Hard redirect
    }
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[Login] Form submitted");
    console.log("[Login] Username:", username);
    console.log("[Login] Password length:", password.length);
    
    setError("");
    setSuccessMessage("");

    if (!username || !password) {
      console.log("[Login] Validation failed: Missing credentials");
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    console.log("[Login] Calling login function...");

    try {
      // Call actual login API
      const result = await login(username, password);
      console.log("[Login] Login result:", result);

      setLoading(false);

      if (result.success) {
        console.log("[Login] ✅ Login successful!");
        
        // Check localStorage
        const token = localStorage.getItem('access_token');
        const savedUsername = localStorage.getItem('username');
        console.log("[Login] Token saved:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
        console.log("[Login] Username saved:", savedUsername);
        
        // Login successful - use window.location for hard redirect
        console.log("[Login] Redirecting to /dashboard...");
        
        // Give cookies a moment to be set, then redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      } else {
        console.log("[Login] ❌ Login failed:", result.error);
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("[Login] ❌ Exception during login:", error);
      setLoading(false);
      setError("An unexpected error occurred. Check console for details.");
    }
  };

  // Memoize sparkles so it doesn't re-init on every render
  const sparkles = useMemo(
    () => (
      <SparklesCore
        id="loginSparkles"
        background="#000000"
        minSize={0.1}
        maxSize={0.8}
        particleDensity={100}
        particleColor="#FFFFFF"
      />
    ),
    []
  );

  // Debug info on component mount
  useEffect(() => {
    console.log("=== LOGIN PAGE DEBUG INFO ===");
    console.log("Current URL:", window.location.href);
    console.log("Is authenticated:", isAuthenticated());
    console.log("localStorage token:", localStorage.getItem('access_token') ? "EXISTS" : "NONE");
    console.log("API Base URL:", process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET (using default)");
    console.log("============================");
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black">
      {/* Sparkles background */}
      <div className="absolute inset-0 z-0">{sparkles}</div>

      {/* Login box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 z-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">
          Welcome Back
        </h2>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 text-green-600 text-sm text-center font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                console.log("[Login] Username changed:", e.target.value);
                setUsername(e.target.value);
              }}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                console.log("[Login] Password changed, length:", e.target.value.length);
                setPassword(e.target.value);
              }}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            onClick={(e) => {
              console.log("[Login] Button clicked!");
            }}
            className="w-full py-3 rounded-lg bg-black hover:bg-gray-800 text-white font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <a
            href="/auth/register"
            className="text-black dark:text-white font-semibold hover:underline"
          >
            Register here
          </a>
        </div>

        {/* Debug info (remove in production) */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <div className="font-bold mb-1">Debug Info:</div>
          <div>Loading: {loading ? "YES" : "NO"}</div>
          <div>Username: {username || "(empty)"}</div>
          <div>Password: {password ? "●".repeat(password.length) : "(empty)"}</div>
          <div>Error: {error || "None"}</div>
        </div>
      </motion.div>
    </div>
  );

}

// Wrapper component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <div style={{ color: "white", fontSize: "20px" }}>Loading...</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}