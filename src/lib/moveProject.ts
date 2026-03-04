import { BinuiProject, BINUI_CATEGORIES, loadBinuiProjects, saveBinuiProjects, getHebrewDateNow } from "./binuiConstants";
import { GenericProject, DomainConfig, loadGenericProjects, saveGenericProjects, getSubsForCategory, getAllCategoryNames, PITUA_CONFIG, MEYADIM_CONFIG, PEULOT_CONFIG } from "./domainConstants";

export interface DomainInfo {
  name: string;
  icon: string;
  color: string;
  route: string;
}

export const ALL_DOMAINS: DomainInfo[] = [
  { name: "מבנים", icon: "🏛", color: "#2C6E6A", route: "/binui" },
  { name: "פיתוח", icon: "🌿", color: "#3A7D6F", route: "/pitua" },
  { name: "מיידעים", icon: "📋", color: "#4A6741", route: "/meyadim" },
  { name: "פעולות", icon: "⚡", color: "#5A5A7A", route: "/peulot" },
];

function getConfigForDomain(domainName: string): DomainConfig | null {
  if (domainName === "פיתוח") return PITUA_CONFIG;
  if (domainName === "מיידעים") return MEYADIM_CONFIG;
  if (domainName === "פעולות") return PEULOT_CONFIG;
  return null;
}

/** Move a BinuiProject to a generic domain */
export function moveBinuiToGeneric(
  project: BinuiProject,
  targetDomain: string
): { success: boolean; route: string } {
  const config = getConfigForDomain(targetDomain);
  if (!config) return { success: false, route: "" };

  const catNames = getAllCategoryNames(config);
  const firstCat = catNames[0];
  const firstSub = getSubsForCategory(config, firstCat)[0];
  const now = getHebrewDateNow();

  // Extract the unique part of the name (after "Category:Sub - ")
  const nameParts = project.name.split(" - ");
  const uniqueName = nameParts.length > 1 ? nameParts.slice(1).join(" - ") : project.name;
  const newFullName = `${firstCat}:${firstSub} - ${uniqueName}`;

  const newProject: GenericProject = {
    id: Date.now(),
    name: newFullName,
    poeticName: "",
    poem: "",
    category: firstCat,
    sub: firstSub,
    status: project.status as any,
    created: project.created,
    note: project.note,
    description: "",
    document: "",
    task: "",
    decision: "",
    history: [{ date: now, note: `הועבר מ: מבנים` }, ...project.history],
    tracking: { date: "", note: "", agent: "" },
    initiator: "",
    image: project.images?.tashrit || project.images?.tza || project.images?.hadmaya || null,
    attachments: project.attachments?.map(a => ({ id: a.id, name: a.name, data: a.data })) || [],
  };

  // Remove from binui
  const binuiProjects = loadBinuiProjects().filter(p => p.id !== project.id);
  saveBinuiProjects(binuiProjects);

  // Add to target
  const targetProjects = loadGenericProjects(config.storageKey);
  saveGenericProjects(config.storageKey, [newProject, ...targetProjects]);

  return { success: true, route: config.routeBase };
}

/** Move a GenericProject to מבנים */
export function moveGenericToBinui(
  project: GenericProject,
  sourceDomain: string
): { success: boolean; route: string } {
  const sourceConfig = getConfigForDomain(sourceDomain);
  if (!sourceConfig) return { success: false, route: "" };

  const now = getHebrewDateNow();
  const firstCat = Object.keys(BINUI_CATEGORIES)[0];
  const firstSub = BINUI_CATEGORIES[firstCat].subs[0];

  const nameParts = project.name.split(" - ");
  const uniqueName = nameParts.length > 1 ? nameParts.slice(1).join(" - ") : project.name;
  const newFullName = `${firstCat}:${firstSub} - ${uniqueName}`;

  const newProject: BinuiProject = {
    id: Date.now(),
    name: newFullName,
    category: firstCat,
    sub: firstSub,
    status: project.status,
    created: project.created,
    note: project.note,
    history: [{ date: now, note: `הועבר מ: ${sourceDomain}` }, ...project.history],
    details: { "פרטים": {}, "מיקום": {}, 'תב"ע': {} },
    images: { tashrit: project.image, tza: null, hadmaya: null },
    attachments: project.attachments?.map(a => ({ id: a.id, name: a.name, data: a.data })) || [],
  };

  // Remove from source
  const sourceProjects = loadGenericProjects(sourceConfig.storageKey).filter(p => p.id !== project.id);
  saveGenericProjects(sourceConfig.storageKey, sourceProjects);

  // Add to binui
  const binuiProjects = loadBinuiProjects();
  saveBinuiProjects([newProject, ...binuiProjects]);

  return { success: true, route: "binui" };
}

/** Move a GenericProject to another generic domain */
export function moveGenericToGeneric(
  project: GenericProject,
  sourceDomain: string,
  targetDomain: string
): { success: boolean; route: string } {
  const sourceConfig = getConfigForDomain(sourceDomain);
  const targetConfig = getConfigForDomain(targetDomain);
  if (!sourceConfig || !targetConfig) return { success: false, route: "" };

  const now = getHebrewDateNow();
  const catNames = getAllCategoryNames(targetConfig);
  const firstCat = catNames[0];
  const firstSub = getSubsForCategory(targetConfig, firstCat)[0];

  const nameParts = project.name.split(" - ");
  const uniqueName = nameParts.length > 1 ? nameParts.slice(1).join(" - ") : project.name;
  const newFullName = `${firstCat}:${firstSub} - ${uniqueName}`;

  const newProject: GenericProject = {
    ...project,
    id: Date.now(),
    name: newFullName,
    category: firstCat,
    sub: firstSub,
    history: [{ date: now, note: `הועבר מ: ${sourceDomain}` }, ...project.history],
  };

  // Remove from source
  const sourceProjects = loadGenericProjects(sourceConfig.storageKey).filter(p => p.id !== project.id);
  saveGenericProjects(sourceConfig.storageKey, sourceProjects);

  // Add to target
  const targetProjects = loadGenericProjects(targetConfig.storageKey);
  saveGenericProjects(targetConfig.storageKey, [newProject, ...targetProjects]);

  return { success: true, route: targetConfig.routeBase };
}
