import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GenericProject } from "@/lib/domainConstants";
import {
  loadGenericProjectsAsync,
  saveGenericProjectAsync,
  deleteGenericProjectAsync,
} from "@/lib/supabaseStorage";
import { toast } from "sonner";

export function useGenericProjects(storageKey: string) {
  return useQuery({
    queryKey: ["generic-projects", storageKey],
    queryFn: () => loadGenericProjectsAsync(storageKey),
  });
}

export function useSaveGenericProject(storageKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: GenericProject) => saveGenericProjectAsync(storageKey, project),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["generic-projects", storageKey] }),
    onError: (err: any) => toast.error(`שגיאה בשמירה: ${err.message}`),
  });
}

export function useDeleteGenericProject(storageKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGenericProjectAsync(storageKey, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["generic-projects", storageKey] }),
    onError: (err: any) => toast.error(`שגיאה במחיקה: ${err.message}`),
  });
}

export function useUpdateGenericProject(storageKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: GenericProject) => saveGenericProjectAsync(storageKey, project),
    onMutate: async (project) => {
      await qc.cancelQueries({ queryKey: ["generic-projects", storageKey] });
      const prev = qc.getQueryData<GenericProject[]>(["generic-projects", storageKey]);
      qc.setQueryData<GenericProject[]>(["generic-projects", storageKey], (old) =>
        (old || []).map((p) => (p.id === project.id ? project : p))
      );
      return { prev };
    },
    onError: (_err, _project, context) => {
      if (context?.prev) qc.setQueryData(["generic-projects", storageKey], context.prev);
      toast.error("שגיאה בעדכון");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["generic-projects", storageKey] }),
  });
}
