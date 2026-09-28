import { useAuth } from "../hooks/useAuth";

/**
 * Downloads a file from an authenticated API endpoint as a blob,
 * preventing 'Unauthorized' error pages from raw window.open calls.
 */
export async function downloadAuthorizedFile(url: string, filename: string): Promise<void> {
  const token = useAuth.getState().token || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Append token as query parameter as well for bulletproof auth
  let finalUrl = url;
  if (token && !url.includes("token=")) {
    finalUrl += (url.includes("?") ? "&" : "?") + `token=${encodeURIComponent(token)}`;
  }

  const res = await fetch(finalUrl, { headers, credentials: "include" });
  if (!res.ok) {
    let errorMsg = `Download failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error || errJson?.message) errorMsg = errJson.error || errJson.message;
    } catch {}
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
