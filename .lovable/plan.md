

## Analysis

The current automatic parsing system has two significant gaps compared to what I extracted manually:

### Problem 1: File Size and PDF Handling
- The edge function has an **8MB limit** -- your file is larger than that
- The `estimatePdfPages` heuristic incorrectly rejects valid PDFs (returns 0 pages for compressed PDFs), causing the "document has no pages" error
- These two issues mean the parser **fails before even reaching the AI model**

### Problem 2: Shallow Extraction
- The current prompt asks for brief consultant notes, but when I parsed manually, I extracted **detailed quoted sections** per consultant (Traffic, Drainage, Environment, etc.)
- Consultant data is dumped into history entries rather than structured, editable fields
- The prompt doesn't instruct the AI to quote specific plan clauses per consultant topic

### Plan

**1. Fix Edge Function (`supabase/functions/parse-plan-instructions/index.ts`)**
- Increase file size limit from 8MB to 20MB
- Remove the unreliable `estimatePdfPages` check that blocks valid PDFs
- Keep only the `isPdf` magic-bytes check
- Upgrade model to `google/gemini-2.5-pro` for better accuracy with large documents
- Enhance the system prompt to extract **detailed, quoted clauses** per consultant topic (matching the quality of manual extraction)

**2. Update Frontend Parsing Handler (`src/pages/BinuiProjectDetail.tsx`)**
- Store consultant notes in a dedicated `consultantNotes` field on the project (structured object) instead of dumping into history
- Display each consultant's extracted content in its own editable text area with the consultant name as label
- Add a comments input field next to each consultant's extracted data

**3. Add `consultant_notes` Column**
- Database migration to add a JSONB `consultant_notes` column to `binui_projects` table for structured storage

### Summary of Changes
- 1 edge function update (bigger limit, better prompt, remove bad heuristic)
- 1 database migration (add `consultant_notes` JSONB column)
- 1 page update (display consultant notes as editable fields with comment support)

