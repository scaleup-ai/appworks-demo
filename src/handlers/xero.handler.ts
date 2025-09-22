import showToast from "../utils/toast";
import { startXeroAuth } from "../apis/xero.api";

export function makeHandleXeroAuth() {
  return async function handleXeroAuth() {
    try {
      const authResponse = await startXeroAuth("json");
      if ("url" in authResponse && authResponse.url) {
        window.location.href = authResponse.url;
      } else {
        throw new Error("No OAuth URL received");
      }
    } catch (error) {
      console.error("Xero auth failed:", error);
      showToast(`Xero authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`, {
        type: "error",
      });
    }
  };
}
