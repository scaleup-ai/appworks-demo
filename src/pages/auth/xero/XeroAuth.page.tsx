import React, { useState } from "react";
import showToast from "../../../utils/toast";
import { startXeroAuth } from "../../../apis/xero.api";

const XeroAuthPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleXeroAuth = async () => {
    setIsLoading(true);
    try {
      // Start Xero OAuth flow (backend handles creds from env)
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
          <h2 className="mb-8 text-xl text-gray-600">Xero Integration</h2>
          <p className="mb-8 text-gray-500">Connect with Xero to access your financial data</p>
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
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Connect your Xero account to access receivables, collections, and payment features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XeroAuthPage;
