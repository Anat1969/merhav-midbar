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

export async function openFileInNewTab(fileUrl: string): Promise<void> {
  const resolved = await resolveAccessibleFileUrl(fileUrl);
  window.open(resolved, "_blank", "noopener,noreferrer");
}

export async function downloadFile(fileUrl: string, fileName?: string): Promise<void> {
  const resolved = await resolveAccessibleFileUrl(fileUrl);
  const a = document.createElement("a");
  a.href = resolved;
  if (fileName) a.download = fileName;
  a.click();
}
