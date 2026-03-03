export type GenericProjectStatus = "planning" | "inprogress" | "review" | "done";

export interface GenericProject {
  id: number;
  name: string;
  poeticName: string;
  category: string;
  sub: string;
  status: GenericProjectStatus;
  created: string;
  note: string;
  description: string;
  task: string;
  decision: string;
  history: { date: string; note: string }[];
  tracking: { date: string; note: string; agent: string };
  initiator: string;
  image: string | null;
}

export interface DomainConfig {
  storageKey: string;
  color: string;
  domainName: string;
  routeBase: string;
  categories: Record<string, string[]>;
  extraFields: "poetic" | "task";
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

export function loadGenericProjects(key: string): GenericProject[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGenericProjects(key: string, projects: GenericProject[]): void {
  localStorage.setItem(key, JSON.stringify(projects));
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
