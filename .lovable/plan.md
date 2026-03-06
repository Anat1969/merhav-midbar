

## Problem

The project description textarea binds directly to `project.note` from the server query cache. Every keystroke calls `update({ note: e.target.value })`, which saves to the database and invalidates the query. The refetch resets the input value, causing typed text to disappear or behave erratically.

## Solution

Add local state to buffer the project description text, syncing it from the server on initial load/change, and only saving to the database on blur (when the user clicks away).

### Changes in `src/pages/BinuiProjectDetail.tsx`:

1. **Add local state** for the note field:
   ```typescript
   const [localNote, setLocalNote] = useState(project?.note || "");
   ```

2. **Sync from server** when project changes (e.g., on first load):
   ```typescript
   useEffect(() => {
     if (project) setLocalNote(project.note || "");
   }, [project?.id]);
   ```

3. **Update the textarea** to use `localNote` for value and `setLocalNote` for onChange, and save on blur:
   ```tsx
   <textarea
     value={localNote}
     onChange={(e) => setLocalNote(e.target.value)}
     onBlur={() => update({ note: localNote })}
   />
   ```

This prevents the query cache from resetting the input while the user is typing.

