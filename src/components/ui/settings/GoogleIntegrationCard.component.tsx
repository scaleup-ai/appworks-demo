import React, { useEffect, useState } from "react";
import axiosClient, { API_SERVICE_BASE_URL } from "../../../apis/axios-client";
import { AuthStorage } from "../../../store/slices/auth.slice";
import StatusBadge from "../StatusBadge.component";

const GoogleIntegrationCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [persistSession, setPersistSession] = useState<boolean>(() => {
    try {
      return localStorage.getItem("remember_me") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mounted = true;
    const probe = async () => {
      setLoading(true);
      try {
        const resp = await axiosClient.get("/api/v1/google/status");
        if (!mounted) return;
        setConnected(Boolean(resp.data && resp.data.connected));
        setPayload(resp.data ?? null);
      } catch (err) {
        if (!mounted) return;
        setConnected(false);
        setPayload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void probe();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-medium">Google Integration</h2>
      <p className="mb-2 text-sm text-gray-600">Google authentication status and quick actions.</p>

      <div className="max-w-2xl p-4 bg-white border rounded">
        {loading ? (
          <div className="text-sm text-gray-600">Checking Google connection…</div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-600">Google</div>
                <div className="mt-1">
                  {connected === null ? (
                    <span className="text-sm text-gray-500">Unknown</span>
                  ) : connected === true ? (
                    <StatusBadge variant="green">Connected</StatusBadge>
                  ) : (
                    <StatusBadge variant="red">Not connected</StatusBadge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm mr-2">
                  <input
                    type="checkbox"
                    checked={persistSession}
                    onChange={(e) => setPersistSession(e.target.checked)}
                  />
                  Keep me signed in
                </label>
                <button
                  onClick={async () => {
                    if (connecting) return;
                    try {
                      setConnecting(true);
                      const url = (API_SERVICE_BASE_URL || "").replace(/\/$/, "") + "/api/v1/google/auth/start";
                      const headers: Record<string, string> = {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                      };
                      try {
                        const sel =
                          AuthStorage && typeof AuthStorage.getSelectedTenantId === "function"
                            ? AuthStorage.getSelectedTenantId()
                            : null;
                        if (sel) headers["X-Openid-Sub"] = String(sel);
                      } catch {}
                      if (persistSession) headers["X-Remember-Me"] = "1";
                      const resp = await fetch(url, {
                        method: "POST",
                        credentials: "include",
                        headers,
                        body: JSON.stringify({ format: "json" }),
                      });
                      if (!resp.ok) throw new Error(`Auth start failed: ${resp.status}`);
                      const data = await resp.json();
                      const redirectUrl = data?.url;
                      if (redirectUrl) {
                        window.location.href = redirectUrl;
                      } else {
                        alert("Failed to get Google consent URL from server");
                      }
                    } catch (err) {
                      console.error("startGoogleAuth failed", err);
                      alert("Failed to start Google auth. Check server logs for details.");
                    } finally {
                      setConnecting(false);
                    }
                  }}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  {connecting ? "Connecting…" : "Connect Google"}
                </button>
                <button
                  onClick={() => setShowRaw((s) => !s)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  {showRaw ? "Hide raw JSON" : "Show raw JSON"}
                </button>
              </div>
            </div>

            {connected === false && (
              <div className="p-3 mt-3 text-sm text-yellow-800 border-l-4 border-yellow-400 rounded bg-yellow-50">
                Google is not connected. Click{" "}
                <button onClick={() => window.open("/api/v1/google/connect", "_blank")} className="underline">
                  Connect Google
                </button>{" "}
                to enable features.
              </div>
            )}

            {showRaw && (
              <div className="p-2 mt-3 text-xs border rounded bg-gray-50">
                <pre className="overflow-auto">{JSON.stringify(payload ?? { connected }, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default GoogleIntegrationCard;
