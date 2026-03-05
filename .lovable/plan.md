

## Migration Plan: localStorage to Lovable Cloud

This is a large migration touching the entire data layer. I'll break it into phases.

### Phase 1: Database Schema

Create two tables matching existing data structures:

**`binui_projects`** — for מבנים domain:
- `id` (bigint, PK), `name`, `category`, `sub`, `status`, `created` (text), `note` (text)
- `history` (jsonb), `details` (jsonb), `images` (jsonb), `created_at` (timestamptz)

**`generic_projects`** — for פיתוח, מיידעים, פעולות domains:
- `id` (bigint, PK), `domain` (text — "pitua"/"meyadim"/"peulot"), `name`, `poetic_name`, `poem`, `category`, `sub`, `status`, `created` (text), `note`, `description`, `document`, `task`, `decision`
- `history` (jsonb), `tracking` (jsonb), `initiator` (text), `image` (text, nullable), `created_at` (timestamptz)

**`project_attachments`** — shared attachment metadata:
- `id` (bigint, PK), `project_type` (text — "binui"/"generic"), `project_id` (bigint), `name` (text), `file_url` (text), `created_at` (timestamptz)

**Storage bucket**: `project-files` (public) for file uploads.

**RLS policies**: Since there's no authentication yet, all tables will have public read/write policies for `anon` role. Authentication can be layered on later.

### Phase 2: File Storage Utility

Create **`src/lib/fileStorage.ts`**:
- `uploadFile(file: File, path: string)` → uploads to `project-files` bucket, returns public URL
- `deleteFile(path: string)` → removes from storage
- Increase `MAX_FILE_SIZE_BYTES` to 20MB in both constants files

### Phase 3: Data Access Layer

Create **`src/lib/supabaseStorage.ts`** — async replacements for all localStorage functions:
- `loadBinuiProjectsAsync()` / `saveBinuiProjectAsync(project)` / `deleteBinuiProject(id)`
- `loadGenericProjectsAsync(domain)` / `saveGenericProjectAsync(domain, project)` / `deleteGenericProject(domain, id)`
- `loadAttachments(projectType, projectId)` / `saveAttachment(...)` / `deleteAttachment(id)`

### Phase 4: Update Constants & Storage Layer

- **`binuiConstants.ts`**: Change `MAX_FILE_SIZE_BYTES` to 20MB, keep types, remove localStorage load/save functions (replaced by supabaseStorage)
- **`domainConstants.ts`**: Same — raise limit, remove localStorage functions
- **`storage.ts`**: Replace `getProjects`/`saveProjects`/`countProjects` and all search/count functions to use async Supabase queries
- **`moveProject.ts`**: Update move functions to use async Supabase operations

### Phase 5: Update All Page Components

Update these 6 pages to use async data fetching (React Query):

1. **`BinuiPage.tsx`** — Replace `useState(loadBinuiProjects)` with `useQuery`, replace `persist()` with mutation calls
2. **`BinuiProjectDetail.tsx`** — Same pattern
3. **`GenericDomainPage.tsx`** — Replace `loadGenericProjects` with async query
4. **`GenericDomainDetail.tsx`** — Same pattern
5. **`Index.tsx`** — Update stats/counts to use async queries
6. **`DomainPage.tsx`** — Update ProjectPanel to use async data

Update supporting components:
- **`GlobalSearch.tsx`** — async search
- **`StatsBar.tsx`** — async counts
- **`ProjectPanel.tsx`** — async load/save
- **`FileDropZone.tsx`** — use new upload utility instead of FileReader base64

### Phase 6: Data Migration Helper

Add a one-time migration button/utility that reads existing localStorage data and inserts it into the database, so no existing data is lost.

---

### Summary of Scope

- 1 SQL migration (3 tables + 1 storage bucket + RLS policies)
- 2 new utility files (`fileStorage.ts`, `supabaseStorage.ts`)
- 2 constants files updated (raise file limit)
- ~10 components/pages refactored to async
- 1 migration helper for existing data

This is a significant refactor. I recommend implementing it in stages across multiple messages to avoid errors.

