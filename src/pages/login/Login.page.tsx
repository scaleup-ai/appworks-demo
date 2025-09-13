import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getXeroAuthUrl } from "../../services/auth.service";
import showToast from "../../utils/toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleXeroLogin = async () => {
    try {
      setIsLoading(true);
      const authData = await getXeroAuthUrl();

      // Redirect to Xero OAuth
      window.location.href = authData.url;
    } catch (error) {
      console.error("Failed to initiate Xero OAuth:", error);
      showToast("Failed to start Xero authentication", { type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipAuth = () => {
    // For demo purposes, allow access without auth
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">ScaleUp AI</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Welcome to the Demo</h2>
          <p className="mt-2 text-sm text-gray-600">Connect with Xero or explore the demo features</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 sm:px-10">
          <div className="space-y-6">
            {/* Xero OAuth Login */}
            <div>
              <Button
                onClick={handleXeroLogin}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Connecting to Xero...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Connect with Xero
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Demo Access */}
            <div>
              <Button
                onClick={handleSkipAuth}
                variant="secondary"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Explore Demo Features
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Demo mode allows you to explore collections, email, and payment features without Xero integration.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
