// Consolidated UI helper utilities used across handlers and pages.
export function downloadJson(filename: string, data: unknown): boolean {
  try {
    const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn("downloadJson failed", err);
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText failed", err);
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (err) {
    console.warn("copyToClipboard fallback failed", err);
    return false;
  }
}

export function openExternal(url: string, target: string = "_blank"): boolean {
  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const finalUrl = isAbsolute ? url : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
    window.open(finalUrl, target, "noopener,noreferrer");
    return true;
  } catch (err) {
    console.warn("openExternal failed", err);
    try {
      window.location.href = url;
      return true;
    } catch (err2) {
      console.warn("openExternal fallback failed", err2);
      return false;
    }
  }
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const uiHelpers = {
  downloadJson,
  copyToClipboard,
  openExternal,
  formatCurrency,
};

export default uiHelpers;
