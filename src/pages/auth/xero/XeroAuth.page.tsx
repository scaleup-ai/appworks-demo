import React, { useState } from "react";
import { makeHandleXeroAuth } from "../../../handlers/xero.handler";

const XeroAuthPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleXeroAuth = makeHandleXeroAuth();
  const [remember, setRemember] = useState<boolean>(() => {
    try {
      return localStorage.getItem("remember_me") === "1";
    } catch {
      return false;
    }
  });

  const onConnectClick = async () => {
    try {
      setIsLoading(true);
      // The startXeroAuth helper will read localStorage and include the X-Remember-Me header
      await handleXeroAuth();
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
            <div className="flex items-center space-x-3">
              <button
                onClick={onConnectClick}
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
              {/* Remember-me checkbox */}
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setRemember(v);
                    try {
                      if (v) localStorage.setItem("remember_me", "1");
                      else localStorage.removeItem("remember_me");
                    } catch {
                      // noop
                    }
                  }}
                  className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Remember me
              </label>
            </div>
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
