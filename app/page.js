"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "../lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Using Next.js router, not window.location!
    if (isAuthenticated()) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      background: "#000"
    }}>
      <p style={{ color: "#fff", fontSize: "18px" }}>Loading...</p>
    </div>
  );
}