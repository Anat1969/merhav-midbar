import { toast } from "sonner";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export type GenericProjectStatus = "planning" | "inprogress" | "review" | "done";

export interface Attachment {
  id: number;
  name: string;
  data: string;
}

export interface GenericProject {
  id: number;
  name: string;
  poeticName: string;
  poem: string;
  category: string;
  sub: string;
  status: GenericProjectStatus;
  created: string;
  note: string;
  description: string;
  document: string;
  task: string;
  decision: string;
  history: { date: string; note: string }[];
  tracking: { date: string; note: string; agent: string };
  initiator: string;
  image: string | null;
  attachments: Attachment[];
  link: string;
}

export interface DomainConfig {
  storageKey: string;
  color: string;
  domainName: string;
  routeBase: string;
  categories: Record<string, string[]>;
  extraFields: "poetic" | "task";
  hasLink?: boolean;
}

export const STATUS_OPTIONS = [
  { value: "planning",   label: "בתכנון",  color: "#3B82F6", bg: "#EFF6FF" },
  { value: "inprogress", label: "בתהליך",  color: "#F59E0B", bg: "#FFFBEB" },
  { value: "review",     label: "בבדיקה",  color: "#F97316", bg: "#FFF7ED" },
  { value: "done",       label: "בוצע",    color: "#10B981", bg: "#F0FDF4" },
] as const;

export const PITUA_CONFIG: DomainConfig = {
  storageKey: "pitua_projects",
  color: "#3A7D6F",
  domainName: "פיתוח",
  routeBase: "pitua",
  categories: {
    "מרחב": ["עיר", "רובע", "מתחם"],
    "אלמנט": ["מתקנים", "פסלים", "גרפיטי", "שלטים"],
  },
  extraFields: "poetic",
};

export const MEYADIM_CONFIG: DomainConfig = {
  storageKey: "meyadim_projects",
  color: "#4A6741",
  domainName: "מיידעים",
  routeBase: "meyadim",
  categories: {
    "א. מדריכים": [],
    "ב. מדיניות": [],
    "ג. הנחיות": [],
  },
  extraFields: "task",
};

export const PEULOT_CONFIG: DomainConfig = {
  storageKey: "peulot_projects",
  color: "#5A5A7A",
  domainName: "פעולות",
  routeBase: "peulot",
  categories: {
    "יוזמות (אדריכליות)": [],
    "משימות (מנהלים)": [],
  },
  extraFields: "task",
};

export const APPS_CONFIG: DomainConfig = {
  storageKey: "apps_projects",
  color: "#2E5F7A",
  domainName: "אפליקציות",
  routeBase: "apps",
  categories: {
    "אפליקציות": [],
  },
  extraFields: "task",
  hasLink: true,
};

export function loadGenericProjects(key: string): GenericProject[] {
  try {
    const raw = localStorage.getItem(key);
    const list: GenericProject[] = raw ? JSON.parse(raw) : [];
    return list.map((p) => ({ ...p, attachments: p.attachments || [], document: p.document || "", poem: p.poem || "" }));
  } catch {
    return [];
  }
}

export function saveGenericProjects(key: string, projects: GenericProject[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(projects));
    return true;
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
      toast.error("נפח האחסון מלא. הקובץ גדול מדי לשמירה. נסה קובץ קטן יותר (עד 1MB).");
      return false;
    }
    throw error;
  }
}

export function getHebrewDateNow(): string {
  return new Date().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getSubsForCategory(config: DomainConfig, category: string): string[] {
  const subs = config.categories[category];
  return subs && subs.length > 0 ? subs : [category];
}

export function getAllCategoryNames(config: DomainConfig): string[] {
  return Object.keys(config.categories);
}
