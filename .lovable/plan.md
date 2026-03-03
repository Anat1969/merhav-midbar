

# Plan: Full Project Management for /pitua, /meyadim, /peulot

## Approach
Create a shared constants file and a generic page/detail component pair that all three domains reuse, configured via domain-specific constants. This avoids duplicating ~500 lines of BinuiPage three times.

## Files to Create

### 1. `src/lib/domainConstants.ts`
Shared configuration for all three domains:
- `DomainConfig` interface: storageKey, color, domainName, routeBase, categories (Record<string, string[]>), extraFields config
- `GenericProject` interface with all fields (id, name, poeticName, category, sub, status, created, note, description, task, decision, history, tracking, initiator, image)
- `loadProjects(key)` / `saveProjects(key, projects)` helpers
- Three config objects: `PITUA_CONFIG`, `MEYADIM_CONFIG`, `PEULOT_CONFIG`
- Category definitions per domain matching the spec exactly

### 2. `src/pages/GenericDomainPage.tsx`
Reusable list page component accepting a `DomainConfig` prop. Structure mirrors BinuiPage:
- TopNav + breadcrumb
- Action bar: search, new name input, category select, sub select (dynamic), "הוספה" button (domain color), "שמירה", count badge
- Filter pills: categories + status with counts
- Project cards (horizontal): LEFT = single image slot (base64 upload), RIGHT = index + name (clickable → detail) + status dropdown, description (inline editable with pencil icon), haiku/poetic text (italic, editable), action buttons ("פתח", "חוות דעת", "×" delete)
- For meyadim/peulot: show "משימה" + "החלטה" fields instead of haiku
- Empty state

### 3. `src/pages/GenericDomainDetail.tsx`
Reusable detail page accepting `DomainConfig` prop. Simpler than BinuiProjectDetail:
- TopNav + full breadcrumb (דשבורד ← domain ← project name)
- Header bar: prev/next navigation + editable name + status dropdown
- Two-column grid:
  - LEFT: note tab (textarea + save) + history tab (timeline with add entry)
  - RIGHT: "שם פואטי" editable field, single image slot, status block (dropdown + date input for tracking + initiator text field)
- Below grid: full-width "תיאור" textarea (auto-save on blur)

### 4. `src/pages/PituaPage.tsx` — thin wrapper
```tsx
import GenericDomainPage from "./GenericDomainPage";
import { PITUA_CONFIG } from "@/lib/domainConstants";
export default () => <GenericDomainPage config={PITUA_CONFIG} />;
```

### 5. `src/pages/PituaDetail.tsx` — thin wrapper

### 6. `src/pages/MeyadimPage.tsx` — thin wrapper

### 7. `src/pages/MeyadimDetail.tsx` — thin wrapper

### 8. `src/pages/PeulotPage.tsx` — thin wrapper

### 9. `src/pages/PeulotDetail.tsx` — thin wrapper

### 10. `src/App.tsx` — add routes
Add 6 new routes (3 list + 3 detail) before the `/:slug` catch-all:
```
/pitua, /pitua/:id
/meyadim, /meyadim/:id
/peulot, /peulot/:id
```

### 11. `src/components/DomainCard.tsx` — update DOMAINS_WITH_PAGES
Add "פיתוח", "מיידעים", "פעולות" to the set so SubButtons navigate to domain pages instead of opening ProjectPanel.

### 12. `src/lib/storage.ts` — update counts/search
Add the three new storage keys to `countDomainProjects`, `searchAllProjects`, and `getAllStatusCounts` so dashboard stats reflect these domains.

## What stays untouched
- Home page layout, BinuiPage, BinuiProjectDetail, ProjectPanel, all UI components

