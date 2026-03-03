import React, { useState, useMemo } from "react";
import { Project, ProjectStatus, STATUS_CONFIG, HIERARCHY, getHebrewDate } from "@/lib/hierarchy";
import { getProjects, saveProjects } from "@/lib/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProjectPanelProps {
  domain: string;
  category: string;
  sub: string;
  onClose: () => void;
  onDataChange: () => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({
  domain,
  category,
  sub,
  onClose,
  onDataChange,
}) => {
  const color = HIERARCHY[domain]?.color ?? "#333";
  const [projects, setProjectsState] = useState<Project[]>(() =>
    getProjects(domain, category, sub)
  );
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");

  const persist = (updated: Project[]) => {
    setProjectsState(updated);
    saveProjects(domain, category, sub, updated);
    onDataChange();
  };

  const addProject = () => {
    const name = newName.trim();
    if (!name) return;
    const p: Project = {
      id: Date.now(),
      name,
      status: "planning",
      created: getHebrewDate(),
      note: "",
      history: [{ date: getHebrewDate(), note: "פרויקט נוצר" }],
    };
    persist([...projects, p]);
    setNewName("");
  };

  const updateStatus = (id: number, status: ProjectStatus) => {
    persist(
      projects.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              history: [...p.history, { date: getHebrewDate(), note: `סטטוס שונה ל${STATUS_CONFIG[status].label}` }],
            }
          : p
      )
    );
  };

  const deleteProject = (id: number) => {
    persist(projects.filter((p) => p.id !== id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  }, [projects, search]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { planning: 0, inprogress: 0, review: 0, done: 0 };
    projects.forEach((p) => { if (c[p.status] !== undefined) c[p.status]++; });
    return c;
  }, [projects]);

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 flex h-full w-[420px] max-w-[90vw] flex-col bg-white shadow-2xl"
        style={{ animation: "slideInPanel 0.35s ease-out" }}
      >
        {/* Header */}
        <div className="px-5 py-4 text-white" style={{ backgroundColor: color }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">{domain} / {category}</div>
              <h2 className="text-lg font-bold">{sub}</h2>
              <div className="mt-0.5 text-xs opacity-80">{projects.length} פרויקטים</div>
            </div>
            <button
              onClick={onClose}
              title="סגור"
              className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Add row */}
        <div className="flex gap-2 border-b px-4 py-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
            placeholder="שם הפרויקט..."
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            dir="rtl"
          />
          <button
            onClick={addProject}
            title="הוסף פרויקט"
            className="shrink-0 rounded px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            הוסף +
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 סינון..."
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
            dir="rtl"
          />
        </div>

        {/* Project list */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                {projects.length === 0 ? "אין פרויקטים עדיין" : "לא נמצאו תוצאות"}
              </div>
            )}
            {filtered.map((p, idx) => {
              const st = STATUS_CONFIG[p.status];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 text-sm"
                >
                  <span className="shrink-0 text-xs font-bold text-gray-300">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-gray-400">{p.created}</div>
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus(p.id, e.target.value as ProjectStatus)}
                    className="rounded border px-2 py-1 text-xs font-medium"
                    style={{ backgroundColor: st.bg, color: st.color, direction: "rtl" }}
                    title="שנה סטטוס"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        title="מחק פרויקט"
                        className="shrink-0 rounded p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        🗑
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם למחוק את "{p.name}"? לא ניתן לשחזר.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogAction
                          onClick={() => deleteProject(p.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          מחק
                        </AlertDialogAction>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
              ([key, cfg]) => (
                <div key={key} className="rounded-lg p-2" style={{ backgroundColor: cfg.bg }}>
                  <div className="font-bold" style={{ color: cfg.color }}>
                    {statusCounts[key]}
                  </div>
                  <div className="text-gray-500">{cfg.label}</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
