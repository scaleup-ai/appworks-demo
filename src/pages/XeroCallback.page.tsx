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
        navigate("/auth");
        return;
      }

      if (!code) {
        showToast("No authorization code received", { type: "error" });
        navigate("/auth");
        return;
      }

      try {
        const response = await handleOAuthRedirect({ code, state: state || "" });

        if (response.status === 200) {
          dispatch(setXeroConnected());
          showToast("Successfully connected to Xero!", { type: "success" });
          navigate("/dashboard");
        } else {
          throw new Error("OAuth callback failed");
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        showToast("Failed to complete Xero authentication", { type: "error" });
        navigate("/auth");
      }
    };

    processCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        <h2 className="text-lg font-medium text-gray-900">Processing Xero Authentication...</h2>
        <p className="text-gray-500">Please wait while we complete your login.</p>
      </div>
    </div>
  );
};

export default XeroCallback;
