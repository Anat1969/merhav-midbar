

## Plan: Blob URL fallback for file access

The current `openFileInNewTab` and `downloadFile` functions use signed URLs which Chrome blocks. The fix: download the file bytes via the Supabase SDK, create a local `blob:` URL, and open/download that instead. This is free, no tokens, purely client-side.

### Changes

**`src/lib/fileAccess.ts`** — Rewrite `openFileInNewTab` and `downloadFile` to:
1. Extract bucket/path from the URL
2. Use `supabase.storage.from(bucket).download(path)` to fetch file bytes
3. Create a `blob:` URL via `URL.createObjectURL()`
4. Open blob URL in new tab (for viewing) or trigger download via anchor element
5. Fall back to current signed-URL approach if blob download fails

The `resolveAccessibleFileUrl` function stays as-is for components that need a URL string (e.g., image `src` attributes). Only the "open" and "download" actions change to use blobs.

No other files need changes since `FileDropZone`, `GenericDomainPage`, and `BinuiPage` already call these helper functions.

