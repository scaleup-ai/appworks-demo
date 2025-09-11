import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getXeroAuthUrl } from "../apis/xero.api";
import handleXeroRedirect from "../utils/xeroRedirectHandler";

const LoginForm: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for OAuth redirect params when the component mounts. Use an
    // async IIFE so we can await the handler and avoid unhandled promise
    // rejections seen previously.
    (async () => {
      try {
        const ok = await handleXeroRedirect(dispatch as any);
        // future: show a toast or navigate on success
        if (ok) {
          // eslint-disable-next-line no-console
          console.log("Xero auth completed successfully");
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Unhandled error handling Xero redirect", err);
      }
    })();
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Perform a full navigation so the browser follows the backend's 302 -> Xero
    // consent page without triggering CORS on the XHR/fetch path.
    try {
      window.location.href = getXeroAuthUrl();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to navigate to Xero auth URL", err);
      try {
        window.alert("Failed to start Xero auth. See console for details.");
      } catch {}
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to Xero</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Xero account
          </p>
        </div>

        <div className="px-6 py-8 bg-white border rounded-lg shadow-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <button
              type="submit"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in to Xero
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
