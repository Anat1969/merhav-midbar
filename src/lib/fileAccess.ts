import { supabase } from "@/integrations/supabase/client";

const STORAGE_OBJECT_PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
const STORAGE_OBJECT_SIGN_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/;

function extractBucketAndPath(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(fileUrl);
    const pathname = parsed.pathname;
    const publicMatch = pathname.match(STORAGE_OBJECT_PUBLIC_RE);
    const signMatch = pathname.match(STORAGE_OBJECT_SIGN_RE);
    const match = publicMatch || signMatch;
    if (!match) return null;

    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a URL that is safe to open now.
 * - Non-storage URLs and data URLs are returned as-is
 * - Storage URLs are converted to fresh signed URLs on demand
 */
export async function resolveAccessibleFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl || fileUrl.startsWith("data:")) return fileUrl;

  const target = extractBucketAndPath(fileUrl);
  if (!target) return fileUrl;

  const { data, error } = await supabase.storage
    .from(target.bucket)
    .createSignedUrl(target.path, 60 * 60);

  if (error || !data?.signedUrl) return fileUrl;
  return data.signedUrl;
}

async function fetchBlob(fileUrl: string): Promise<Blob | null> {
  const target = extractBucketAndPath(fileUrl);
  if (!target) return null;
  try {
    const { data, error } = await supabase.storage
      .from(target.bucket)
      .download(target.path);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function openFileInNewTab(fileUrl: string): Promise<void> {
  if (!fileUrl) return;

  // Open immediately in the user gesture to avoid popup blocking
  const popup = window.open("", "_blank");
  if (popup) {
    try {
      popup.opener = null;
    } catch {
      // ignore
    }
  }

  // Try blob approach first (bypasses ad-blockers)
  const blob = await fetchBlob(fileUrl);
  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    if (popup) {
      popup.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
    // Revoke after a delay to allow the tab to load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }

  // Fallback to signed URL
  const resolved = await resolveAccessibleFileUrl(fileUrl);
  if (popup) {
    popup.location.href = resolved;
  } else {
    window.open(resolved, "_blank", "noopener,noreferrer");
  }
}

export async function downloadFile(fileUrl: string, fileName?: string): Promise<void> {
  if (!fileUrl) return;
  const blob = await fetchBlob(fileUrl);
  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    return;
  }
  // Fallback
  const resolved = await resolveAccessibleFileUrl(fileUrl);
  const a = document.createElement("a");
  a.href = resolved;
  if (fileName) a.download = fileName;
  a.click();
}

/**
 * Opens an external URL in a new tab using the synchronous window.open trick
 * to bypass ad-blockers and popup blockers.
 */
export function openExternalLink(url: string): void {
  if (!url) return;

  // Must run directly in user gesture handlers (onClick)
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) return;

  // Fallback for strict blockers
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
