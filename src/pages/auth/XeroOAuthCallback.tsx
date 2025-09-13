import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { handleXeroCallback } from "../../services/auth.service";
import showToast from "../../utils/toast";

const XeroOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        showToast(`OAuth error: ${error}`, { type: "error" });
        navigate("/login");
        return;
      }

      if (!code || !state) {
        showToast("Missing OAuth parameters", { type: "error" });
        navigate("/login");
        return;
      }

      try {
        await handleXeroCallback(code, state);
        showToast("Xero integration completed successfully!", { type: "success" });
        navigate("/dashboard");
      } catch (error) {
        console.error("OAuth callback error:", error);
        showToast("OAuth completion failed", { type: "error" });
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">Completing Xero Integration...</h2>
            <p className="mt-2 text-sm text-gray-500">Please wait while we finalize your Xero connection.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XeroOAuthCallback;
