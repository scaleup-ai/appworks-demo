import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect } from "../apis/xero.api";
import { setXeroConnected } from "../store/authSlice";
import showToast from "../utils/toast";

const XeroCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        showToast(`Xero OAuth error: ${error}`, { type: "error" });
        navigate("/");
        return;
      }

      if (!code) {
        showToast("Missing authorization code", { type: "error" });
        navigate("/");
        return;
      }

      try {
        // Forward the OAuth callback to the backend
        const response = await handleOAuthRedirect({ code, state: state || undefined });

        if (response.status >= 200 && response.status < 300) {
          // Set Xero connected state
          dispatch(setXeroConnected());
          showToast("Xero connected successfully!", { type: "success" });
          navigate("/dashboard");
        } else {
          throw new Error(`Backend returned status ${response.status}`);
        }
      } catch (error) {
        console.error("OAuth callback failed:", error);
        showToast(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`, {
          type: "error",
        });
        navigate("/");
      }
    };

    processCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Completing Xero Authentication</h2>
          <p className="text-gray-600">Please wait while we connect your Xero account...</p>
        </div>
      </div>
    </div>
  );
};

export default XeroCallback;
