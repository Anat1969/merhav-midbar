

## Add File Attachments to Records

### Overview
Add a "קבצים" (Files) button to each record card that opens an attachments panel. Users can attach multiple files (booklets, presentations, emails, etc.) via drag-and-drop, paste, or file picker. Clicking an attached file opens a fullscreen viewer for browsing, then closing returns to the list.

### Data Model Change
Add an `attachments` array to `GenericProject` in `src/lib/domainConstants.ts`:

```ts
interface Attachment {
  id: number;
  name: string;
  data: string;  // base64 data URL
}

// Add to GenericProject:
attachments: Attachment[];
```

New projects will initialize with `attachments: []`. Existing records without the field will default to `[]` via a fallback in the load function.

### UI Changes in `src/pages/GenericDomainPage.tsx`

1. **"קבצים" button** in each card's action row (Row 4), showing a count badge when files exist.

2. **Attachments panel** — toggled inline below the card (similar to the existing note panel). Contains:
   - A `FileDropZone` for adding new files (drag/drop/paste/click).
   - A horizontal list of attached file thumbnails with name, delete button, and click-to-view.

3. **Fullscreen viewer** — reuse the existing viewer pattern from `FileDropZone.tsx`. Clicking a thumbnail opens a modal overlay showing the file at full size (images, videos, PDFs). A close button returns to the list. Navigation between attachments via prev/next buttons.

### File Changes

| File | Change |
|------|--------|
| `src/lib/domainConstants.ts` | Add `Attachment` interface, add `attachments` field to `GenericProject`, add fallback in `loadGenericProjects` |
| `src/pages/GenericDomainPage.tsx` | Add attachments toggle state, add/remove attachment handlers, attachments panel UI, fullscreen viewer modal |

### Technical Notes
- Files stored as base64 in localStorage (consistent with existing image storage pattern).
- The `loadGenericProjects` function will map loaded records to ensure `attachments` defaults to `[]` for backward compatibility.
- Fullscreen viewer supports image, video, PDF preview and download for unsupported types.

