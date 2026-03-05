import { supabase } from "@/integrations/supabase/client";
import { BinuiProject } from "./binuiConstants";
import { GenericProject, DomainConfig, PITUA_CONFIG, MEYADIM_CONFIG, PEULOT_CONFIG } from "./domainConstants";

// ─── Domain key mapping ───
const DOMAIN_KEY_MAP: Record<string, string> = {
  [PITUA_CONFIG.storageKey]: "pitua",
  [MEYADIM_CONFIG.storageKey]: "meyadim",
  [PEULOT_CONFIG.storageKey]: "peulot",
};

const DOMAIN_NAME_TO_KEY: Record<string, string> = {
  "פיתוח": "pitua",
  "מיידעים": "meyadim",
  "פעולות": "peulot",
};

function getDomainKey(storageKeyOrName: string): string {
  return DOMAIN_KEY_MAP[storageKeyOrName] || DOMAIN_NAME_TO_KEY[storageKeyOrName] || storageKeyOrName;
}

// ─── Attachment type ───
export interface CloudAttachment {
  id: number;
  name: string;
  file_url: string;
}

// ─── Binui Projects ───

export async function loadBinuiProjectsAsync(): Promise<BinuiProject[]> {
  const { data: projects, error } = await supabase
    .from("binui_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Load attachments
  const ids = (projects || []).map((p: any) => p.id);
  const { data: attachments } = ids.length > 0
    ? await supabase
        .from("project_attachments")
        .select("*")
        .eq("project_type", "binui")
        .in("project_id", ids)
    : { data: [] };

  const attachMap = new Map<number, CloudAttachment[]>();
  for (const a of attachments || []) {
    const list = attachMap.get(a.project_id) || [];
    list.push({ id: a.id, name: a.name, file_url: a.file_url });
    attachMap.set(a.project_id, list);
  }

  return (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    sub: p.sub,
    status: p.status,
    created: p.created,
    note: p.note,
    history: p.history || [],
    details: p.details || {},
    images: p.images || { tashrit: null, tza: null, hadmaya: null },
    attachments: (attachMap.get(p.id) || []).map((a) => ({
      id: a.id,
      name: a.name,
      data: a.file_url, // Use URL instead of base64
    })),
  }));
}

export async function saveBinuiProjectAsync(project: BinuiProject): Promise<BinuiProject> {
  const row: any = {
    name: project.name,
    category: project.category,
    sub: project.sub,
    status: project.status,
    created: project.created,
    note: project.note,
    history: project.history,
    details: project.details,
    images: project.images,
  };

  if (project.id && project.id > 0) {
    // Check if exists in DB
    const { data: existing } = await supabase
      .from("binui_projects")
      .select("id")
      .eq("id", project.id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("binui_projects")
        .update(row)
        .eq("id", project.id)
        .select()
        .single();
      if (error) throw error;
      return { ...project, id: data.id };
    }
  }

  // Insert new
  const { data, error } = await supabase
    .from("binui_projects")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return { ...project, id: data.id };
}

export async function deleteBinuiProjectAsync(id: number): Promise<void> {
  // Delete attachments first
  await supabase.from("project_attachments").delete().eq("project_type", "binui").eq("project_id", id);
  const { error } = await supabase.from("binui_projects").delete().eq("id", id);
  if (error) throw error;
}

// ─── Generic Projects ───

export async function loadGenericProjectsAsync(storageKeyOrDomain: string): Promise<GenericProject[]> {
  const domain = getDomainKey(storageKeyOrDomain);
  const { data: projects, error } = await supabase
    .from("generic_projects")
    .select("*")
    .eq("domain", domain)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (projects || []).map((p: any) => p.id);
  const { data: attachments } = ids.length > 0
    ? await supabase
        .from("project_attachments")
        .select("*")
        .eq("project_type", "generic")
        .in("project_id", ids)
    : { data: [] };

  const attachMap = new Map<number, CloudAttachment[]>();
  for (const a of attachments || []) {
    const list = attachMap.get(a.project_id) || [];
    list.push({ id: a.id, name: a.name, file_url: a.file_url });
    attachMap.set(a.project_id, list);
  }

  return (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    poeticName: p.poetic_name || "",
    poem: p.poem || "",
    category: p.category,
    sub: p.sub,
    status: p.status as any,
    created: p.created,
    note: p.note,
    description: p.description || "",
    document: p.document || "",
    task: p.task || "",
    decision: p.decision || "",
    history: p.history || [],
    tracking: p.tracking || { date: "", note: "", agent: "" },
    initiator: p.initiator || "",
    image: p.image,
    attachments: (attachMap.get(p.id) || []).map((a) => ({
      id: a.id,
      name: a.name,
      data: a.file_url,
    })),
  }));
}

export async function saveGenericProjectAsync(storageKeyOrDomain: string, project: GenericProject): Promise<GenericProject> {
  const domain = getDomainKey(storageKeyOrDomain);
  const row: any = {
    domain,
    name: project.name,
    poetic_name: project.poeticName,
    poem: project.poem,
    category: project.category,
    sub: project.sub,
    status: project.status,
    created: project.created,
    note: project.note,
    description: project.description,
    document: project.document,
    task: project.task,
    decision: project.decision,
    history: project.history,
    tracking: project.tracking,
    initiator: project.initiator,
    image: project.image,
  };

  if (project.id && project.id > 0) {
    const { data: existing } = await supabase
      .from("generic_projects")
      .select("id")
      .eq("id", project.id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("generic_projects")
        .update(row)
        .eq("id", project.id)
        .select()
        .single();
      if (error) throw error;
      return { ...project, id: data.id };
    }
  }

  const { data, error } = await supabase
    .from("generic_projects")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return { ...project, id: data.id };
}

export async function deleteGenericProjectAsync(storageKeyOrDomain: string, id: number): Promise<void> {
  await supabase.from("project_attachments").delete().eq("project_type", "generic").eq("project_id", id);
  const { error } = await supabase.from("generic_projects").delete().eq("id", id);
  if (error) throw error;
}

// ─── Attachments ───

export async function saveAttachmentAsync(
  projectType: "binui" | "generic",
  projectId: number,
  name: string,
  fileUrl: string
): Promise<CloudAttachment> {
  const { data, error } = await supabase
    .from("project_attachments")
    .insert({ project_type: projectType, project_id: projectId, name, file_url: fileUrl })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, file_url: data.file_url };
}

export async function deleteAttachmentAsync(id: number): Promise<void> {
  const { error } = await supabase.from("project_attachments").delete().eq("id", id);
  if (error) throw error;
}

// ─── Counts & Search ───

export async function countAllStatusAsync(): Promise<Record<string, number>> {
  const counts: Record<string, number> = { planning: 0, inprogress: 0, review: 0, done: 0 };

  const { data: binui } = await supabase.from("binui_projects").select("status");
  for (const p of binui || []) {
    if (counts[p.status] !== undefined) counts[p.status]++;
  }

  const { data: generic } = await supabase.from("generic_projects").select("status");
  for (const p of generic || []) {
    if (counts[p.status] !== undefined) counts[p.status]++;
  }

  return counts;
}

export async function countDomainProjectsAsync(domainName: string): Promise<number> {
  if (domainName === "מבנים") {
    const { count } = await supabase.from("binui_projects").select("*", { count: "exact", head: true });
    return count || 0;
  }
  const key = DOMAIN_NAME_TO_KEY[domainName];
  if (key) {
    const { count } = await supabase
      .from("generic_projects")
      .select("*", { count: "exact", head: true })
      .eq("domain", key);
    return count || 0;
  }
  return 0;
}

export async function countCategoryProjectsAsync(domainName: string, category: string): Promise<number> {
  if (domainName === "מבנים") {
    const { count } = await supabase
      .from("binui_projects")
      .select("*", { count: "exact", head: true })
      .eq("category", category);
    return count || 0;
  }
  const key = DOMAIN_NAME_TO_KEY[domainName];
  if (key) {
    const { count } = await supabase
      .from("generic_projects")
      .select("*", { count: "exact", head: true })
      .eq("domain", key)
      .eq("category", category);
    return count || 0;
  }
  return 0;
}

export async function countSubProjectsAsync(domainName: string, category: string, sub: string): Promise<number> {
  if (domainName === "מבנים") {
    const { count } = await supabase
      .from("binui_projects")
      .select("*", { count: "exact", head: true })
      .eq("category", category)
      .eq("sub", sub);
    return count || 0;
  }
  const key = DOMAIN_NAME_TO_KEY[domainName];
  if (key) {
    const { count } = await supabase
      .from("generic_projects")
      .select("*", { count: "exact", head: true })
      .eq("domain", key)
      .eq("category", category)
      .eq("sub", sub);
    return count || 0;
  }
  return 0;
}

export interface SearchResult {
  domain: string;
  category: string;
  sub: string;
  project: { id: number; name: string; status: string; created: string; note: string; history: any[] };
  color: string;
  detailRoute?: string;
}

export async function searchAllProjectsAsync(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const q = query.trim().toLowerCase();
  if (!q) return results;

  // Search binui
  const { data: binui } = await supabase
    .from("binui_projects")
    .select("id, name, category, sub, status, created, note, history")
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,sub.ilike.%${q}%,note.ilike.%${q}%`)
    .limit(15);

  for (const p of binui || []) {
    results.push({
      domain: "מבנים",
      category: p.category,
      sub: p.sub,
      project: { id: p.id, name: p.name, status: p.status, created: p.created, note: p.note, history: (p.history as any[]) || [] },
      color: "#2C6E6A",
      detailRoute: `/binui/${p.id}`,
    });
  }

  // Search generic
  const { data: generic } = await supabase
    .from("generic_projects")
    .select("id, domain, name, poetic_name, category, sub, status, created, note, description, history")
    .or(`name.ilike.%${q}%,poetic_name.ilike.%${q}%,category.ilike.%${q}%,sub.ilike.%${q}%,note.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(15);

  const domainColors: Record<string, string> = { pitua: "#3A7D6F", meyadim: "#4A6741", peulot: "#5A5A7A" };
  const domainNames: Record<string, string> = { pitua: "פיתוח", meyadim: "מיידעים", peulot: "פעולות" };
  const domainRoutes: Record<string, string> = { pitua: "pitua", meyadim: "meyadim", peulot: "peulot" };

  for (const p of generic || []) {
    results.push({
      domain: domainNames[p.domain] || p.domain,
      category: p.category,
      sub: p.sub,
      project: { id: p.id, name: p.name, status: p.status, created: p.created, note: p.note, history: (p.history as any[]) || [] },
      color: domainColors[p.domain] || "#666",
      detailRoute: `/${domainRoutes[p.domain] || p.domain}/${p.id}`,
    });
  }

  return results.slice(0, 30);
}
