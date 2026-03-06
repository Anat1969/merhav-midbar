

## Plan: Attach Word file directly to email via EmailJS

### Problem
Currently the "Send Recommendation Draft" button downloads the Word file separately and opens the email modal with a text note saying "📎 קובץ Word מצורף בנפרד". The Word file is not actually attached to the email.

### Solution
EmailJS supports file attachments via base64 content. We will:

1. **Generate the .docx as base64** instead of just downloading it, and pass it to the `EmailModal` as a prop.

2. **Update `EmailModal`** to accept an optional `attachment` prop (`{ name: string; data: string }`) and include it in the EmailJS template params as `attachment` (base64 data).

3. **Update `BinuiProjectDetail`** to use `generateDraftDocx` (not `downloadDraftDocx`) to get the blob, convert it to base64, and pass it to the email modal. Still also trigger the download.

4. **Update EmailJS template params** to send `content` with base64 data. EmailJS uses the `content` field in attachments.

### Technical Details

**EmailModal changes** (`src/components/EmailModal.tsx`):
- Add prop `attachment?: { name: string; base64: string }`.
- In `handleSend`, add the attachment to template params. EmailJS supports attachments via a `content` object with `{ type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: "...", data: "base64..." }`.
- Note: EmailJS free tier has attachment limits. The `image_data` field is already used for images. For file attachments, EmailJS uses the template variable approach where the base64 is passed as a parameter.

**BinuiProjectDetail changes** (`src/pages/BinuiProjectDetail.tsx`):
- Import `generateDraftDocx` alongside `downloadDraftDocx`.
- After generating the blob, convert to base64 string.
- Store in state and pass to `EmailModal` as the `attachment` prop.
- Remove the "📎 קובץ Word מצורף בנפרד" text line since it will actually be attached.

**EmailJS template note**: The EmailJS template needs a `{{attachment}}` variable configured. Since EmailJS sends attachments via the `content` parameter in the API, we will pass the base64 data in the template params. The user's EmailJS template may need updating to support this — we will use the `content` field approach which EmailJS supports natively.

### Files to Edit
- `src/components/EmailModal.tsx` — add attachment prop and include in send params
- `src/pages/BinuiProjectDetail.tsx` — generate base64 from docx blob, pass to modal

