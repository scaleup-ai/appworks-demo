import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import showToast from "../utils/toast";
import { setXeroCreds, startXeroAuth } from "../apis/xero.api";
import { setDemoMode } from "../store/authSlice";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoMode = () => {
    // Demo mode - set auth state and navigate to dashboard
    dispatch(setDemoMode());
    showToast("Demo mode activated", { type: "success" });
    navigate("/dashboard");
  };

  const handleXeroAuth = async () => {
    setIsLoading(true);
    try {
      // Set default Xero credentials from env or hardcoded for demo
      const credsResponse = await setXeroCreds({
        clientId: "DB9274AFC30044CCA7A0AC94CA80810D",
        clientSecret: "FVqEhjI6_3ICcwL_C6iVYVkjQYMbNGb07Xq2vinpcYGDU-Hm",
        redirectUri: "https://scaleupai.tech/xero/oauth2/redirect",
      });

      if (!credsResponse.success) {
        throw new Error(credsResponse.error || "Failed to set Xero credentials");
      }

      // Start Xero OAuth flow
      const authResponse = await startXeroAuth("json");

      if ("url" in authResponse && authResponse.url) {
        // Redirect to Xero OAuth
        window.location.href = authResponse.url;
      } else {
        throw new Error("No OAuth URL received");
      }
    } catch (error) {
      console.error("Xero auth failed:", error);
      showToast(`Xero authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`, {
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">ScaleUp AI</h1>
          <h2 className="mb-8 text-xl text-gray-600">Welcome to the Demo</h2>
          <p className="mb-8 text-gray-500">Connect with Xero or explore the demo features</p>
        </div>

        <div className="px-4 py-8 bg-white shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            {/* Xero Connect Button */}
            <button
              onClick={handleXeroAuth}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-3 text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Connecting...
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  Connect with Xero
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">or</span>
              </div>
            </div>

            {/* Demo Mode Button */}
            <button
              onClick={handleDemoMode}
              className="flex items-center justify-center w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Explore Demo Features
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Demo mode allows you to explore collections, email, and payment features without Xero integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
