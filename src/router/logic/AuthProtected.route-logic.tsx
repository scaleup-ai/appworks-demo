import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import {
  capturePostAuthRedirect,
  getIntegrationStatus,
  startXeroAuth,
} from "../../apis/xero.api";

// Keep the public name the same so imports stay valid.
const AuthProtectedRouteLogic = ({ children }: { children: ReactElement }) => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [integrated, setIntegrated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Clear old sessionStorage flags on mount
    try {
      sessionStorage.removeItem("xero_processing");
      sessionStorage.removeItem("xero_recent_auth");
    } catch {}

    if (isAuthenticated) {
      console.log("AuthProtected: User is authenticated, allowing access");
      setIntegrated(true);
      setLoading(false);
      return;
    }

    console.log("AuthProtected: Checking integration status");
    (async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );
        const statusPromise = getIntegrationStatus();
        const status = await Promise.race([statusPromise, timeoutPromise]);
        if (!mounted) return;
        const ok = Boolean(status && (status as any).connected);
        console.log("AuthProtected: Integration status", ok);
        setIntegrated(ok);
        if (!ok) {
          console.log("AuthProtected: Not integrated, starting auth");
          capturePostAuthRedirect();
          const authData = await startXeroAuth("json");
          if (authData && (authData as any).url) {
            window.location.href = (authData as any).url;
          } else {
            setError("Failed to get auth URL");
          }
        }
      } catch (err) {
        console.error("AuthProtected: Error checking integration", err);
        if (!mounted) return;
        setError(
          "Failed to check integration status: " + (err as Error).message
        );
        setIntegrated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-white">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Error</h2>
        <p className="mb-6 text-sm text-gray-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    );
  }

  if (integrated) return children;

  // If not integrated and not loading, show error
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-white">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Access Denied
      </h2>
      <p className="mb-6 text-sm text-gray-700">
        You need to connect to Xero to access this page.
      </p>
      <button
        onClick={() => {
          capturePostAuthRedirect();
          startXeroAuth("json")
            .then((data) => {
              if (data && (data as any).url) {
                window.location.href = (data as any).url;
              }
            })
            .catch(() => {
              window.location.reload();
            });
        }}
        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Connect to Xero
      </button>
    </div>
  );
};

export default AuthProtectedRouteLogic;
