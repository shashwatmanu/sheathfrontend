// lib/auth.js - Complete authentication functions with proper error handling and cookie support

import { jwtDecode } from "jwt-decode";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

console.log("[auth.js] API_BASE_URL:", API_BASE_URL);

/**
 * Parse error from API response (handles FastAPI validation errors)
 */
function parseError(error) {
  if (!error.detail) {
    return error.message || 'An error occurred';
  }

  // Handle validation errors (422) - array of error objects
  if (Array.isArray(error.detail)) {
    return error.detail
      .map(err => {
        if (typeof err === 'string') return err;
        if (err.msg) return err.msg;
        return JSON.stringify(err);
      })
      .join(', ');
  }

  // Handle string detail
  if (typeof error.detail === 'string') {
    return error.detail;
  }

  // Fallback
  return JSON.stringify(error.detail);
}

/**
 * Set a cookie with proper attributes
 */
function setCookie(name, value, days = 7) {
  const maxAge = days * 24 * 60 * 60; // Convert days to seconds
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/**
 * Delete a cookie
 */
function deleteCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Register a new user
 */
export async function register(userData) {
  console.log("[auth.js] register() called with:", { ...userData, password: "***" });

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    console.log("[auth.js] register() response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("[auth.js] register() error:", error);

      return {
        success: false,
        error: parseError(error)
      };
    }

    const data = await response.json();
    console.log("[auth.js] register() success:", data);

    return { success: true, data };
  } catch (error) {
    console.error("[auth.js] register() exception:", error);
    return {
      success: false,
      error: error.message || 'Network error during registration'
    };
  }
}

/**
 * Login user - saves token to BOTH localStorage AND cookies
 */
export async function login(username, password) {
  console.log("[auth.js] login() called for username:", username);

  try {
    // FastAPI OAuth2 expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    console.log("[auth.js] login() sending request to:", `${API_BASE_URL}/auth/login`);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    console.log("[auth.js] login() response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("[auth.js] login() error:", error);

      return {
        success: false,
        error: parseError(error) || 'Invalid username or password'
      };
    }

    const data = await response.json();
    console.log("[auth.js] login() success, token received:", data.access_token ? "YES" : "NO");

    if (!data.access_token) {
      console.error("[auth.js] login() no access_token in response!");
      return {
        success: false,
        error: 'Server did not return authentication token'
      };
    }

    // Save token to BOTH localStorage AND cookies
    console.log("[auth.js] login() saving to localStorage and cookies...");
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', username);

    // Save to cookies (this allows middleware to access the token)
    setCookie('access_token', data.access_token, 7); // 7 days expiry
    setCookie('username', username, 7);

    console.log("[auth.js] login() localStorage and cookies saved!");

    // Verify it was saved
    const savedToken = localStorage.getItem('access_token');
    console.log("[auth.js] login() verification - token saved:", savedToken ? "YES" : "NO");

    // Fetch user profile to get is_admin and other data
    console.log("[auth.js] login() fetching user profile...");
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      console.log("[auth.js] login() profile response status:", profileResponse.status);

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log("[auth.js] login() user profile fetched successfully:", profile);
        console.log("[auth.js] login() is_admin status:", profile.is_admin);
        localStorage.setItem('user_profile', JSON.stringify(profile));
        console.log("[auth.js] login() profile saved to localStorage");
      } else {
        const errorText = await profileResponse.text();
        console.warn("[auth.js] login() failed to fetch profile:", profileResponse.status, errorText);
      }
    } catch (profileError) {
      console.warn("[auth.js] login() profile fetch error:", profileError);
      // Don't fail login if profile fetch fails - user can still use the app
    }

    return { success: true };
  } catch (error) {
    console.error("[auth.js] login() exception:", error);
    return {
      success: false,
      error: error.message || 'Network error during login'
    };
  }
}

/**
 * Logout user - clears BOTH localStorage AND cookies
 */
export function logout() {
  console.log("[auth.js] logout() called");

  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('username');
  localStorage.removeItem('user_profile');

  // Clear cookies
  deleteCookie('access_token');
  deleteCookie('username');

  console.log("[auth.js] logout() localStorage and cookies cleared");
}

/**
 * Fetch user profile from /auth/me endpoint
 */
export async function getUserProfile() {
  console.log("[auth.js] getUserProfile() called");

  try {
    const response = await authenticatedFetch('/auth/me');

    if (!response.ok) {
      const error = await response.json();
      console.error("[auth.js] getUserProfile() error:", error);
      return { success: false, error: parseError(error) };
    }

    const profile = await response.json();
    console.log("[auth.js] getUserProfile() success:", { ...profile, username: profile.username });

    // Store profile data in localStorage
    localStorage.setItem('user_profile', JSON.stringify(profile));

    return { success: true, data: profile };
  } catch (error) {
    console.error("[auth.js] getUserProfile() exception:", error);
    return { success: false, error: error.message || 'Failed to fetch user profile' };
  }
}

/**
 * Get stored user profile
 */
export function getStoredProfile() {
  if (typeof window === 'undefined') return null; // SSR safety

  const profileStr = localStorage.getItem('user_profile');
  if (!profileStr) return null;

  try {
    return JSON.parse(profileStr);
  } catch (error) {
    console.error("[auth.js] Error parsing stored profile:", error);
    return null;
  }
}

/**
 * Check if current user is an admin
 */
export function isAdmin() {
  const profile = getStoredProfile();
  return profile?.is_admin === true;
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("[auth.js] Error decoding token:", error);
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false; // SSR safety

  const token = localStorage.getItem('access_token');

  if (!token) {
    console.log("[auth.js] isAuthenticated(): No token found -> false");
    return false;
  }

  // Check expiration
  if (isTokenExpired(token)) {
    console.warn("[auth.js] isAuthenticated(): Token expired -> logging out");
    logout(); // Auto-logout if expired
    return false;
  }

  console.log("[auth.js] isAuthenticated(): Token valid -> true");
  return true;
}

/**
 * Get current user's token
 */
export function getToken() {
  if (typeof window === 'undefined') return null; // SSR safety
  const token = localStorage.getItem('access_token');
  // console.log("[auth.js] getToken():", token ? "Found" : "Not found");
  return token;
}

/**
 * Get current username
 */
export function getUsername() {
  if (typeof window === 'undefined') return null; // SSR safety
  const username = localStorage.getItem('username');
  console.log("[auth.js] getUsername():", username || "Not found");
  return username;
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getToken();

  if (!token) {
    console.error("[auth.js] authenticatedFetch() - No token available");
    // Redirect logic handled by component/page usually, but we could enforce it here
    if (typeof window !== 'undefined') window.location.href = "/auth/login";
    throw new Error('Not authenticated');
  }

  // Check expiry before making request to save a round trip
  if (isTokenExpired(token)) {
    console.error("[auth.js] authenticatedFetch() - Token expired before request");
    logout();
    if (typeof window !== 'undefined') window.location.href = "/auth/login";
    throw new Error('Session expired');
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  console.log("[auth.js] authenticatedFetch() to:", fullUrl);

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log("[auth.js] authenticatedFetch() response:", response.status);

  if (response.status === 401) {
    console.error("[auth.js] authenticatedFetch() - Unauthorized (401), clearing token and redirecting");
    logout();
    if (typeof window !== 'undefined') window.location.href = "/auth/login";
    throw new Error('Session expired');
  }

  return response;
}