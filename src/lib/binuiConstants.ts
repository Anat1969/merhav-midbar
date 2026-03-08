import { toast } from "sonner";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const BINUI_CATEGORIES: Record<string, { color: string; subs: string[]; description: string }> = {
  "תכנון": {
    color: "#2C6E6A",
    subs: ["בניינים", "תשתיות"],
    description: "קומפוזיציה ותכנון מבני",
  },
  "בינוי": {
    color: "#3A7D6F",
    subs: ["עירייה", "יזם"],
    description: "ביצוע ויישום",
  },
  "רישוי": {
    color: "#1E5E6E",
    subs: ['בנייה חדשה', 'תמ"א 38', "תוספות"],
    description: "הליכי רישוי ואישורים",
  },
};

export const STATUS_OPTIONS = [
  { value: "planning",   label: "בתכנון",  color: "#3B82F6", bg: "#EFF6FF" },
  { value: "inprogress", label: "בתהליך",  color: "#F59E0B", bg: "#FFFBEB" },
  { value: "review",     label: "בבדיקה",  color: "#F97316", bg: "#FFF7ED" },
  { value: "done",       label: "בוצע",    color: "#10B981", bg: "#F0FDF4" },
] as const;

export const DETAIL_FIELDS: Record<string, { key: string; label: string }[]> = {
  "פרטים": [
    { key: "architect",       label: "אדריכל" },
    { key: "architect_phone", label: "נייד אדריכל" },
    { key: "architect_email", label: 'דוא"ל אדריכל' },
    { key: "architect_address", label: "כתובת דואר אדריכל" },
    { key: "manager",        label: "מנהל פרויקט" },
    { key: "manager_phone",  label: "נייד מנהל פרויקט" },
    { key: "manager_email",  label: 'דוא"ל מנהל פרויקט' },
    { key: "manager_address", label: "כתובת דואר מנהל" },
    { key: "developer",      label: "יזם" },
    { key: "developer_phone", label: "נייד יזם" },
    { key: "developer_email", label: 'דוא"ל יזם' },
    { key: "developer_address", label: "כתובת דואר יזם" },
    { key: "date",            label: "יום" },
  ],
  "מיקום": [
    { key: "quarter", label: "רובע" },
    { key: "street",  label: "כתובת" },
    { key: "block",   label: "גוש" },
    { key: "parcel",  label: "חלקה" },
  ],
  'נתוני תב"ע': [
    { key: "plan_overall", label: "מס' תוכנית כוללת" },
    { key: "plan_detail",  label: "מס' תוכנית מפורטת" },
  ],
};

export interface BinuiAttachment {
  id: number;
  name: string;
  data: string;
}

export interface ConsultantNote {
  quote: string;
  comment: string;
  status?: "pending" | "done" | "not_done";
}

export interface BinuiProject {
  id: number;
  name: string;
  category: string;
  sub: string;
  status: string;
  created: string;
  note: string;
  history: { date: string; note: string }[];
  details: Record<string, Record<string, string>>;
  images: {
    tashrit: string | null;
    tza: string | null;
    hadmaya: string | null;
  };
  attachments: BinuiAttachment[];
  consultant_notes: Record<string, ConsultantNote>;
}

const STORAGE_KEY = "binui_projects";

export function loadBinuiProjects(): BinuiProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: BinuiProject[] = raw ? JSON.parse(raw) : [];
    return list.map((p) => ({ ...p, attachments: p.attachments || [] }));
  } catch {
    return [];
  }
}

export function saveBinuiProjects(projects: BinuiProject[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
