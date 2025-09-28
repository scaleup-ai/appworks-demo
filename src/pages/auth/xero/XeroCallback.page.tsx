import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { startXeroAuth } from "../../../apis/xero.api";
import LoadingSpinner from "../../../components/ui/LoadingSpinner.component";
import useProcessXeroCallback from "../../../hooks/auth/useProcessXeroCallback.effect";

const XeroCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useProcessXeroCallback({
    onDashboard: () => {
      setProcessing(false);
    },
    onSelectTenant: () => {
      setProcessing(false);
    },
    onRestartAuth: () => {
      setProcessing(false);
    },
    onError: (message?: string) => {
      setProcessing(false);
      setErrorMessage(message || "Failed to complete Xero authentication");
    },
  });

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-lg font-medium text-gray-900">Processing Xero Authentication...</h2>
          <p className="text-gray-500">Please wait while we complete your login.</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="max-w-lg text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Authentication issue</h2>
          <p className="mb-6 text-sm text-gray-700">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={async () => {
                try {
                  const data = (await startXeroAuth("json")) as import("../../../types/api.types").ConsentUrlResponse;
                  if (data && data.url) {
                    window.location.href = data.url;
                  }
                } catch {
                  // noop
                }
              }}
              className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Retry Connect
            </button>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="px-4 py-3 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Return home
            </button>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="px-4 py-3 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default XeroCallback;
