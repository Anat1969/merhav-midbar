import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BinuiProject } from "@/lib/binuiConstants";
import {
  loadBinuiProjectsAsync,
  saveBinuiProjectAsync,
  deleteBinuiProjectAsync,
} from "@/lib/supabaseStorage";
import { toast } from "sonner";

export function useBinuiProjects() {
  return useQuery({
    queryKey: ["binui-projects"],
    queryFn: loadBinuiProjectsAsync,
  });
}

export function useSaveBinuiProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: BinuiProject) => saveBinuiProjectAsync(project),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["binui-projects"] }),
    onError: (err: any) => toast.error(`שגיאה בשמירה: ${err.message}`),
  });
}

export function useDeleteBinuiProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBinuiProjectAsync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["binui-projects"] }),
    onError: (err: any) => toast.error(`שגיאה במחיקה: ${err.message}`),
  });
}

/** Optimistic update helper: update a project in the cache and save to DB */
export function useUpdateBinuiProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: BinuiProject) => saveBinuiProjectAsync(project),
    onMutate: async (project) => {
      await qc.cancelQueries({ queryKey: ["binui-projects"] });
      const prev = qc.getQueryData<BinuiProject[]>(["binui-projects"]);
      qc.setQueryData<BinuiProject[]>(["binui-projects"], (old) =>
        (old || []).map((p) => (p.id === project.id ? project : p))
      );
      return { prev };
    },
    onError: (_err, _project, context) => {
      if (context?.prev) qc.setQueryData(["binui-projects"], context.prev);
      toast.error("שגיאה בעדכון");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["binui-projects"] }),
  });
}
