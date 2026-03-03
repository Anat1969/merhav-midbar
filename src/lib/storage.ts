import { Project, HIERARCHY, getStorageKey } from "./hierarchy";
import { loadBinuiProjects } from "./binuiConstants";

export function getProjects(domain: string, category: string, sub: string): Project[] {
  const key = getStorageKey(domain, category, sub);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProjects(domain: string, category: string, sub: string, projects: Project[]): void {
  const key = getStorageKey(domain, category, sub);
  localStorage.setItem(key, JSON.stringify(projects));
}

export function countProjects(domain: string, category: string, sub: string): number {
  return getProjects(domain, category, sub).length;
}

export function countDomainProjects(domain: string): number {
  // בינוי uses its own dedicated storage
  if (domain === "בינוי") {
    return loadBinuiProjects().length;
  }
  const def = HIERARCHY[domain];
  if (!def) return 0;
  let total = 0;
  for (const [cat, catDef] of Object.entries(def.categories)) {
    if (catDef.items.length === 0) {
      total += countProjects(domain, cat, cat);
    } else {
      for (const item of catDef.items) {
        total += countProjects(domain, cat, item);
      }
    }
  }
  return total;
}

export interface SearchResult {
  domain: string;
  category: string;
  sub: string;
  project: Project;
  color: string;
}

export function searchAllProjects(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const q = query.trim().toLowerCase();
  if (!q) return results;

  // Search binui_projects first
  const binuiProjects = loadBinuiProjects();
  for (const p of binuiProjects) {
    if (p.name.toLowerCase().includes(q)) {
      results.push({
        domain: "בינוי",
        category: p.category,
        sub: p.sub,
        project: { id: p.id, name: p.name, status: p.status as any, created: p.created, note: p.note, history: p.history },
        color: HIERARCHY["בינוי"]?.color ?? "#2C6E6A",
      });
    }
    if (results.length >= 8) return results;
  }

  for (const [domain, def] of Object.entries(HIERARCHY)) {
    if (domain === "בינוי") continue;
    for (const [cat, catDef] of Object.entries(def.categories)) {
      const subs = catDef.items.length > 0 ? catDef.items : [cat];
      for (const sub of subs) {
        const projects = getProjects(domain, cat, sub);
        for (const p of projects) {
          if (p.name.toLowerCase().includes(q)) {
            results.push({ domain, category: cat, sub, project: p, color: def.color });
          }
        }
        if (results.length >= 8) return results;
      }
    }
  }
  return results;
}

export function getAllStatusCounts(): Record<string, number> {
  const counts: Record<string, number> = { planning: 0, inprogress: 0, review: 0, done: 0 };

  // Count binui projects
  for (const p of loadBinuiProjects()) {
    if (counts[p.status] !== undefined) counts[p.status]++;
  }

  for (const [domain, def] of Object.entries(HIERARCHY)) {
    if (domain === "בינוי") continue;
    for (const [cat, catDef] of Object.entries(def.categories)) {
      const subs = catDef.items.length > 0 ? catDef.items : [cat];
      for (const sub of subs) {
        for (const p of getProjects(domain, cat, sub)) {
          if (counts[p.status] !== undefined) counts[p.status]++;
        }
      }
    }
  }
  return counts;
}
