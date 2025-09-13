import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { handleOAuthRedirect } from "../../apis/xero.api";
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

      // For the Xero OAuth callback, state parameter might be optional
      // depending on how the backend is configured
      if (!code) {
        showToast("Missing OAuth code parameter", { type: "error" });
        navigate("/login");
        return;
      }

      try {
        // Use the Xero API directly - pass state if available, otherwise undefined
        const response = await handleOAuthRedirect({
          code,
          state: state || undefined,
        });

        console.log("OAuth response:", response);

        if (response.status >= 200 && response.status < 300) {
          showToast("Xero integration completed successfully!", { type: "success" });
          navigate("/dashboard");
        } else {
          // Extract error message from response
          let errorMessage = `OAuth failed with status ${response.status}`;
          if (response.data) {
            if (typeof response.data === "string") {
              errorMessage = response.data;
            } else if (response.data.message) {
              errorMessage = response.data.message;
            } else if (response.data.error) {
              errorMessage = response.data.error;
            }
          }
          console.error("OAuth failed:", response);
          showToast(`Xero authentication failed: ${errorMessage}`, { type: "error" });
          navigate("/login");
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }
        showToast(`OAuth completion failed: ${errorMessage}`, { type: "error" });
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
