"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { cirisClient } from "../../lib/ciris-sdk";
import type { AgentInfo } from "../../lib/ciris-sdk";
import { SDK_VERSION } from "../../lib/ciris-sdk/version";
import LogoIcon from "../../components/ui/floating/LogoIcon";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const hasInitialized = useRef(false);

  // Check if setup is complete and redirect if needed
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkSetup = async () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
      cirisClient.setConfig({ baseURL: apiBaseUrl });

      try {
        const response = await cirisClient.setup.getStatus();

        if (response.setup_required) {
          // Redirect to setup wizard (use window.location for static export)
          window.location.href = "/setup";
          return;
        }

        // Setup is complete, continue with login
        localStorage.setItem("selectedAgentId", "datum");
        localStorage.setItem("selectedAgentName", "CIRIS Agent");
        console.log("Standalone login initialized with API:", apiBaseUrl);
      } catch (error) {
        console.error("Failed to check setup status:", error);
        // If the endpoint doesn't exist, assume setup is complete (backward compatibility)
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(username, password);
      // Login successful - AuthContext will handle the redirect
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking setup status
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LogoIcon className="mx-auto h-12 w-auto text-brand-primary fill-brand-primary animate-pulse" />
          <p className="mt-4 text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl">
        <div className="text-center">
          {/* Large C logo matching KMP */}
          <div className="text-7xl font-bold text-indigo-600 mb-2">C</div>
          <h2 className="text-2xl font-bold text-gray-900">CIRIS Agent</h2>
          <p className="mt-1 text-sm text-gray-500">Ethical AI Assistant</p>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          )}
        </div>

        {/* Info text matching KMP - explains local auth */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This is a standalone CIRIS deployment. Authentication is managed locally on your device.
            Your credentials were set during setup.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Privacy link matching KMP */}
        <div className="text-center">
          <a
            href="https://ciris.ai/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
          >
            View Privacy Policy
          </a>
        </div>

        {/* Footer matching KMP */}
        <div className="text-center text-xs text-gray-400">
          <p>Powered by CIRIS AI</p>
          <p className="mt-1">
            v{SDK_VERSION.version} • {SDK_VERSION.gitHash?.substring(0, 7) || "dev"}
          </p>
        </div>
      </div>
    </div>
  );
}
