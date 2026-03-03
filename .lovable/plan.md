

## Problem Diagnosis

The documents won't open because **localStorage has exceeded its ~5MB quota**. When you uploaded documents, they were converted to base64 (which increases size by ~33%) and the app tried to save everything to localStorage. The save failed with a `QuotaExceededError`, meaning the attachment data was lost.

The `saveBinuiProjects` function has no error handling — it just calls `localStorage.setItem()` directly and crashes silently.

## Solution: Compress and Handle Quota Gracefully

Since this project uses localStorage (no Supabase backend), we need to:

### 1. Add error handling to `saveBinuiProjects` in `src/lib/binuiConstants.ts`
- Wrap `localStorage.setItem` in a try/catch
- Show a user-friendly toast/alert when quota is exceeded
- Explain the file was too large to store

### 2. Add file size validation before upload in `src/pages/BinuiPage.tsx`
- Before converting to base64, check file size (reject files > ~1MB with a warning toast)
- Show remaining approximate storage capacity

### 3. Same fix for `src/lib/domainConstants.ts` (generic projects)
- Apply the same error handling pattern to `saveGenericProjects`

### 4. Same fix for `src/pages/GenericDomainPage.tsx`
- Add file size validation before upload

### File Changes

| File | Change |
|------|--------|
| `src/lib/binuiConstants.ts` | Add try/catch to `saveBinuiProjects`, return success boolean |
| `src/lib/domainConstants.ts` | Add try/catch to save function, return success boolean |
| `src/pages/BinuiPage.tsx` | Add file size check before upload, show toast on quota error, revert state on save failure |
| `src/pages/BinuiPage.tsx` | Same for detail page |
| `src/pages/GenericDomainPage.tsx` | Same file size check and error handling |

### Technical Details
- Max file size limit: ~1MB per file (base64 encoding adds ~33%, and localStorage total is ~5MB shared across all data)
- On save failure: revert the in-memory state to the previous version so the UI stays consistent
- Use `sonner` toast (already installed) to show user-friendly error messages in Hebrew

