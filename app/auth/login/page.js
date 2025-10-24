"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { SparklesCore } from "../../../components/ui/sparkles";
import { login, isAuthenticated } from "../../../lib/auth";

export default function LoginPage() {
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
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, password);
      setLoading(false);

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  // Memoize sparkles so it doesn't re-init on every render
  const sparkles = useMemo(
    () => (
      <SparklesCore
        id="loginSparkles"
        background="transparent"
        minSize={0.1}
        maxSize={0.8}
        particleDensity={100}
        particleColor="#FFFFFF"
        className="w-full h-full"
      />
    ),
    []
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden">
      {/* Sparkles background - full viewport */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        {sparkles}
      </div>

      {/* Login box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 z-10 mx-4"
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
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
      </motion.div>
    </div>
  );
}