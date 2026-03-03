export type ProjectStatus = "planning" | "inprogress" | "review" | "done";

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  created: string;
  note: string;
  history: { date: string; note: string }[];
}

export interface CategoryDef {
  items: string[];
}

export interface DomainDef {
  icon: string;
  color: string;
  description: string;
  categories: Record<string, CategoryDef>;
}

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  planning:   { label: "תכנון",   color: "#3B82F6", bg: "#EFF6FF" },
  inprogress: { label: "בביצוע",  color: "#F59E0B", bg: "#FFFBEB" },
  review:     { label: "בבדיקה",  color: "#F97316", bg: "#FFF7ED" },
  done:       { label: "בוצע",    color: "#10B981", bg: "#F0FDF4" },
};

export const HIERARCHY: Record<string, DomainDef> = {
  "מבנים": {
    icon: "🏛",
    color: "#2C6E6A",
    description: "קומפוזיציה, אסטרטגיה, סירקולציה",
    categories: {
      "תכנון": { items: ["בניינים", "תשתיות"] },
      "בינוי": { items: ["עירייה", "יזם"] },
      "רישוי": { items: ['בנייה חדשה', 'תמ"א 38', "תוספות"] },
    },
  },
  "פיתוח": {
    icon: "🌿",
    color: "#3A7D6F",
    description: "הפעלה, התרגשות, אינטראקציה",
    categories: {
      "מרחב": { items: ["עיר", "רובע", "מתחם"] },
      "אלמנט": { items: ["מתקנים", "פסלים", "גרפיטי", "שלטים"] },
    },
  },
  "מיידעים": {
    icon: "📋",
    color: "#4A6741",
    description: "ידע, מדיניות והנחיות",
    categories: {
      "א. מדריכים": { items: [] },
      "ב. מדיניות": { items: [] },
      "ג. הנחיות": { items: [] },
    },
  },
  "פעולות": {
    icon: "⚡",
    color: "#5A5A7A",
    description: "משימות ויוזמות בתהליך",
    categories: {
      "יוזמות (אדריכליות)": { items: [] },
      "משימות (מנהלים)": { items: [] },
    },
  },
  "אפליקציות": {
    icon: "💻",
    color: "#2E5F7A",
    description: "כלים ופלטפורמות דיגיטליות",
    categories: {
      "אפליקציות": { items: [] },
    },
  },
};

export function getStorageKey(domain: string, category: string, sub: string): string {
  return `${domain}__${category}__${sub}`;
}

export function getHebrewDate(): string {
  return new Date().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
