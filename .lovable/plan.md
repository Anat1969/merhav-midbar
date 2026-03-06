

## Fix: PDF blocked by Chrome

### Problem
Chrome blocks cross-origin `<iframe src="https://supabase-storage-url/...pdf">` because the storage domain differs from the app domain.

### Solution (minimal change)
Replace all 4 `<iframe src={url}>` PDF renderings with `window.open(url, '_blank')` — i.e., open PDFs in a new browser tab instead of embedding them. This is the simplest fix, zero new files, and works reliably across all browsers.

### Changes
In each of these 4 files, replace the `<iframe>` PDF block with a centered "Open PDF" auto-trigger + button:

1. `src/components/FileDropZone.tsx` (line ~244)
2. `src/pages/BinuiProjectDetail.tsx` (line ~1055)
3. `src/pages/BinuiPage.tsx` (line ~757)
4. `src/pages/GenericDomainPage.tsx` (line ~813)

Replace pattern:
```tsx
// Before
if (ft === "pdf") return <iframe src={url} ... />;

// After
if (ft === "pdf") return (
  <div className="flex flex-col items-center justify-center p-12">
    <FileText size={48} className="text-red-400 mb-4" />
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
      פתח PDF
    </a>
  </div>
);
```

This avoids iframe cross-origin issues entirely with a single-line change per file.

