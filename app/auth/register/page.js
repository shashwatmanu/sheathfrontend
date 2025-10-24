"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SparklesCore } from "../../../components/ui/sparkles";
import { register } from "../../../lib/auth";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    fullName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Register user
    const result = await register({
      username: formData.username,
      password: formData.password,
      email: formData.email || undefined,
      full_name: formData.fullName || undefined,
    });

    setLoading(false);

    if (result.success) {
      // Registration successful - redirect to login
      router.push("/auth/login?registered=true");
    } else {
      setError(result.error || "Registration failed. Please try again.");
    }
  };

  // Memoize sparkles so it doesn't re-init on every render
  const sparkles = useMemo(
    () => (
      <SparklesCore
        id="registerSparkles"
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

      {/* Register box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 z-10 mx-4 my-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
          Create Account
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          Join RGCIRC Recon Dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              placeholder="johndoe"
              required
              minLength={3}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">At least 3 characters</p>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              placeholder="john@example.com"
            />
          </div>

          {/* Full Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Full Name (Optional)
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              placeholder="John Doe"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:bg-neutral-800 dark:text-gray-100"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black hover:bg-gray-800 text-white font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </motion.button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="text-black dark:text-white font-semibold hover:underline"
          >
            Login here
          </a>
        </div>
      </motion.div>
    </div>
  );
}