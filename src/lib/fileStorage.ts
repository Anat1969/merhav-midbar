import { supabase } from "@/integrations/supabase/client";

const BUCKET = "project-files";

export async function uploadFile(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Upload a File and return the public URL.
 * Path is auto-generated from projectType/projectId/timestamp-filename.
 */
export async function uploadProjectFile(
  file: File,
  projectType: "binui" | "generic",
  projectId: number
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectType}/${projectId}/${Date.now()}-${safeName}`;
  return uploadFile(file, path);
}
