import React from "react";
import { useNavigate, useRouteError } from "react-router-dom";
import AppLayout from "../layouts/App.layout";

interface RouteError {
  statusText?: string;
  message?: string;
  status?: number;
}

export const ErrorBoundaryPage: React.FC = () => {
  const navigate = useNavigate();
  const error = useRouteError() as RouteError;

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const errorMessage =
    error?.statusText || error?.message || "An unexpected error occurred";
  const errorStatus = error?.status;

  return (
    <AppLayout title="Error">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center text-4xl text-red-600">
              ⚠️
            </div>

            {errorStatus && (
              <div className="text-6xl font-bold text-gray-300 mb-2">
                {errorStatus}
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 mb-6">{errorMessage}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="w-4 h-4 mr-2 inline-flex items-center justify-center">
                🏠
              </span>
              Go to Home
            </button>

            <button
              onClick={handleGoBack}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="w-4 h-4 mr-2 inline-flex items-center justify-center">
                ↩️
              </span>
              Go Back
            </button>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            If this problem persists, please contact support.
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ErrorBoundaryPage;
