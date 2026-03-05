import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadProjectFile } from "@/lib/fileStorage";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { deleteFile } from "@/lib/fileStorage";
import { toast } from "sonner";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function useUploadAttachment(projectType: "binui" | "generic", invalidateKey: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: number; file: File }) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      }
      const url = await uploadProjectFile(file, projectType, projectId);
      return saveAttachmentAsync(projectType, projectId, file.name, url);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
    onError: (err: any) => toast.error(err.message || "שגיאה בהעלאת קובץ"),
  });
}

export function useDeleteAttachment(invalidateKey: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: number; fileUrl?: string }) => {
      // Try to delete from storage too
      if (fileUrl) {
        try {
          const url = new URL(fileUrl);
          const pathMatch = url.pathname.match(/\/object\/public\/project-files\/(.+)/);
          if (pathMatch) await deleteFile(pathMatch[1]);
        } catch { /* ignore storage delete errors */ }
      }
      return deleteAttachmentAsync(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
    onError: (err: any) => toast.error(err.message || "שגיאה במחיקת קובץ"),
  });
}

/** Upload an image as a project field (returns URL) */
export function useUploadImage(projectType: "binui" | "generic") {
  return useMutation({
    mutationFn: async ({ projectId, file, slot }: { projectId: number; file: File; slot: string }) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${projectType}/${projectId}/images/${slot}-${Date.now()}-${safeName}`;
      return uploadProjectFile(file, projectType, projectId);
    },
    onError: (err: any) => toast.error(err.message || "שגיאה בהעלאת תמונה"),
  });
}
