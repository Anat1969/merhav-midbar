import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import { HierarchyFilter } from "@/components/HierarchyFilter";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
// [UPGRADE: view-mode] Import new components
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SortBar, SortKey, SortDir } from "@/components/SortBar";
import { RecordLinks, LinkEntry } from "@/components/RecordLinks";
import { KnowledgeLibrary, KnowledgeItem } from "@/components/KnowledgeLibrary";
import { AIGalleryManager, AIGallery } from "@/components/AIGalleryManager";
import {
  BINUI_CATEGORIES,
  STATUS_OPTIONS,
  DETAIL_FIELDS,
  BinuiProject,
  BinuiAttachment,
  getHebrewDateNow,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/binuiConstants";
import { toast } from "sonner";
import { Camera, X, Search, Paperclip, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet, ArrowRightLeft, Trash2 } from "lucide-react";
import { ALL_DOMAINS } from "@/lib/moveProject";
import { useBinuiProjects, useSaveBinuiProject, useDeleteBinuiProject } from "@/hooks/use-binui-projects";
import { uploadProjectFile } from "@/lib/fileStorage";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { openFileInNewTab, downloadFile } from "@/lib/fileAccess";
import { EmptyState } from "@/components/EmptyState";
import { getAttachType, IMAGE_LABELS } from "@/lib/utils";

// [UPGRADE: sort] Sort projects by key
function sortProjects(list: BinuiProject[], key: SortKey, dir: SortDir): BinuiProject[] {
  const STATUS_ORDER: Record<string, number> = { planning: 0, inprogress: 1, review: 2, done: 3 };
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (key === "name")     cmp = a.name.localeCompare(b.name, "he");
    else if (key === "date") cmp = a.created.localeCompare(b.created, "he");
    else if (key === "status") cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    return dir === "asc" ? cmp : -cmp;
  });
}

// [UPGRADE: knowledge-library] localStorage keys for per-domain data
const KL_KEY = "binui_knowledge_library";
const GAL_KEY = "binui_ai_galleries";

function loadFromStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

const BinuiPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useBinuiProjects();
  const saveMutation = useSaveBinuiProject();
  const deleteMutation = useDeleteBinuiProject();

  const urlFilter = searchParams.get("filter");

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState(Object.keys(BINUI_CATEGORIES)[0]);
  const [newSub, setNewSub] = useState(BINUI_CATEGORIES[Object.keys(BINUI_CATEGORIES)[0]].subs[0]);
  // [DESIGN: filter sync] Auto-set filterCat when urlFilter matches a sub-category
  const getInitialFilterCat = (): string | null => {
    if (!urlFilter) return null;
    for (const [cat, def] of Object.entries(BINUI_CATEGORIES)) {
      if (def.subs.includes(urlFilter)) return cat;
    }
    // If urlFilter matches a category name directly
    if (Object.keys(BINUI_CATEGORIES).includes(urlFilter)) return urlFilter;
    return null;
  };
  const [filterCat, setFilterCat] = useState<string | null>(getInitialFilterCat());
  const [filterSub, setFilterSub] = useState<string | null>(urlFilter);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [attachOpen, setAttachOpen] = useState<number | null>(null);
  const [viewerData, setViewerData] = useState<{ attachments: BinuiAttachment[]; index: number } | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; subject: string; body: string }>({ open: false, subject: "", body: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // [UPGRADE: view-mode] View/Work mode state
  const [isWorkMode, setIsWorkMode] = useState(false);

  // [UPGRADE: sort] Sort state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // [UPGRADE: knowledge-library] Knowledge library and galleries per domain
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => loadFromStorage(KL_KEY, []));
  const [galleries, setGalleries] = useState<AIGallery[]>(() => loadFromStorage(GAL_KEY, []));

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const saveKnowledge = (items: KnowledgeItem[]) => {
    setKnowledgeItems(items);
    localStorage.setItem(KL_KEY, JSON.stringify(items));
  };
  const saveGalleries = (g: AIGallery[]) => {
    setGalleries(g);
    localStorage.setItem(GAL_KEY, JSON.stringify(g));
  };

  const saveOne = useCallback(async (project: BinuiProject) => {
    try { await saveMutation.mutateAsync(project); } catch {}
  }, [saveMutation]);

  const namePrefix = `${newCat}:${newSub} - `;

  const addProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const fullName = `${namePrefix}${trimmed}`;
    const now = getHebrewDateNow();
    const p: BinuiProject = {
      id: 0,
      name: fullName,
      category: newCat,
      sub: newSub,
      status: "planning",
      created: now,
      note: "",
      history: [{ date: now, note: "נוצר" }],
      details: { "פרטים": {}, "מיקום": {}, 'תב"ע': {} },
      images: { tashrit: null, tza: null, hadmaya: null },
      attachments: [],
      consultant_notes: {},
    };
    try { await saveMutation.mutateAsync(p); setNewName(""); } catch {}
  };

  const deleteProject = async (id: number) => {
    if (!window.confirm("האם למחוק את הפרויקט?")) return;
    try { await deleteMutation.mutateAsync(id); } catch {}
  };

  const changeStatus = async (id: number, status: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    await saveOne({
      ...project,
      status,
      history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...project.history],
    });
  };

  const changeCategory = async (id: number, newCatValue: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newSubValue = BINUI_CATEGORIES[newCatValue].subs[0];
    const nameParts = project.name.split(" - ");
    const uniqueName = nameParts.length > 1 ? nameParts.slice(1).join(" - ") : project.name;
    const newFullName = `${newCatValue}:${newSubValue} - ${uniqueName}`;
    await saveOne({
      ...project,
      name: newFullName,
      category: newCatValue,
      sub: newSubValue,
      history: [{ date: getHebrewDateNow(), note: `קטגוריה שונתה ל: ${newCatValue}` }, ...project.history],
    });
  };

  const changeSub = async (id: number, newSubValue: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const nameParts = project.name.split(" - ");
    const uniqueName = nameParts.length > 1 ? nameParts.slice(1).join(" - ") : project.name;
    const newFullName = `${project.category}:${newSubValue} - ${uniqueName}`;
    await saveOne({
      ...project,
      name: newFullName,
      sub: newSubValue,
      history: [{ date: getHebrewDateNow(), note: `תת-קטגוריה שונתה ל: ${newSubValue}` }, ...project.history],
    });
  };

  const moveToDomain = async (project: BinuiProject, targetDomain: string) => {
    if (targetDomain === "מבנים") return;
    if (!window.confirm(`להעביר את "${project.name}" לדומיין ${targetDomain}?`)) return;
    const { moveBinuiToGeneric } = await import("@/lib/moveProject");
    const result = moveBinuiToGeneric(project, targetDomain);
    if (result.success) {
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
      qc.invalidateQueries({ queryKey: ["generic-projects"] });
      toast.success(`הפרויקט הועבר ל${targetDomain}`);
    }
  };

  const handleImage = async (id: number, slot: "tashrit" | "tza" | "hadmaya", file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) { toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB."); return; }
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    try {
      const url = await uploadProjectFile(file, "binui", id);
      await saveOne({ ...project, images: { ...project.images, [slot]: url } });
    } catch (err: any) { toast.error(err.message || "שגיאה בהעלאת תמונה"); }
  };

  const saveNote = async (id: number) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    await saveOne({ ...project, note: noteText });
    setNoteOpen(null);
  };

  const addAttachment = async (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) { toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB."); return; }
    try {
      const url = await uploadProjectFile(file, "binui", id);
      await saveAttachmentAsync("binui", id, file.name, url);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) { toast.error(err.message || "שגיאה בהעלאת קובץ"); }
  };

  const removeAttachment = async (projectId: number, attachId: number) => {
    try {
      await deleteAttachmentAsync(attachId);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) { toast.error(err.message || "שגיאה במחיקת קובץ"); }
  };

  const baseFiltered = useMemo(() => {
    let list = projects;
    if (filterCat) list = list.filter((p) => p.category === filterCat);
    if (filterSub) list = list.filter((p) => p.sub === filterSub);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        for (const sec of Object.values(p.details)) {
          for (const v of Object.values(sec)) {
            if (v && v.toLowerCase().includes(q)) return true;
          }
        }
        return false;
      });
    }
    return list;
  }, [projects, filterCat, filterSub, filterStatus, search]);

  // [UPGRADE: sort] Apply sort after filter
  const filtered = useMemo(() => sortProjects(baseFiltered, sortKey, sortDir), [baseFiltered, sortKey, sortDir]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let base = projects;
    if (filterCat) base = base.filter((p) => p.category === filterCat);
    if (filterSub) base = base.filter((p) => p.sub === filterSub);
    for (const s of STATUS_OPTIONS) counts[s.value] = 0;
    for (const p of base) { if (counts[p.status] !== undefined) counts[p.status]++; }
    return counts;
  }, [projects, filterCat, filterSub]);

  const activeSubs = filterCat ? BINUI_CATEGORIES[filterCat]?.subs ?? [] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
        <TopNav />
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">🏛</div>
            <div className="text-lg text-muted-foreground font-medium">טוען פרויקטים...</div>
            <div className="skeleton h-3 w-40 mt-4 mx-auto rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* [UPGRADE: navigation] Domain header banner with breadcrumb */}
      <div
        className="mx-4 mt-4 rounded-2xl px-6 py-6 text-white print:hidden"
        style={{ background: "linear-gradient(135deg, #2C6E6A 0%, #2C6E6ACC 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl drop-shadow">🏛</span>
            <div>
              {/* [UPGRADE: navigation] Breadcrumb */}
              <nav className="breadcrumb mb-1" aria-label="breadcrumb">
                <a onClick={() => navigate("/")} style={{ cursor: "pointer" }}>דשבורד</a>
                <span className="sep">←</span>
                <span>מבנים</span>
              </nav>
              {/* [UPGRADE: typography] h1 at 32px+ */}
              <h1 style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.2 }}>מבנים</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 0 && (
              <span className="rounded-full bg-white/20 px-4 py-2 num-value font-black backdrop-blur-sm" style={{ fontSize: "1.1rem" }}>
                {projects.length} פרויקטים
              </span>
            )}
          </div>
        </div>
      </div>

      {/* === Navigation buttons bar === */}
      <div className="no-print mx-4 mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate("/")}
          className="h-12 px-8 rounded-xl text-white text-base font-black hover:brightness-110 transition-all shadow-md flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #2C6E6A, #1E5E5A)" }}
        >
          🏠 חזור לדשבורד
        </button>
        <button
          onClick={() => navigate("/plan-instructions")}
          className="h-11 px-5 rounded-xl border-2 text-base font-bold transition-colors flex items-center gap-2"
          style={{ borderColor: "#2C6E6A", color: "#2C6E6A" }}
        >
          <FileText size={18} /> הוראות תוכנית
        </button>
        <button
          onClick={() => navigate(-1)}
          className="h-11 px-5 rounded-xl border-2 border-gray-300 text-base font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          → חזור אחורה
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-11 px-4 rounded-xl border border-gray-200 text-base font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ↑ ראש העמוד
        </button>

        {/* [UPGRADE: view-mode] Prominent view/work mode toggle */}
        <div className="mr-auto">
          <ViewModeToggle isWorkMode={isWorkMode} onToggle={setIsWorkMode} />
        </div>
      </div>

      {/* === Action panels === */}
      <div className="no-print mx-4 mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Panel 1: Search */}
        <div className="rounded-xl bg-card shadow-sm border border-border/50 p-5">
          <div className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">🔍 חיפוש</div>
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-12 rounded-xl border border-input pr-10 pl-3 text-base focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              style={{ direction: "rtl" }}
              placeholder="חיפוש לפי שם, מיקום, פרטים..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">חיפוש חופשי ברשימת הפרויקטים</p>
        </div>

        {/* Panel 2: Add new record */}
        <div className="rounded-xl bg-card shadow-sm border border-border/50 p-5 lg:col-span-2">
          <div className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">➕ הוספת רשומה חדשה</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500 font-semibold">① קטגוריה</label>
              <select
                title="קטגוריה"
                className="h-11 rounded-xl border border-gray-200 px-3 text-base bg-white focus:ring-2 focus:ring-ring"
                style={{ direction: "rtl" }}
                value={newCat}
                onChange={(e) => { setNewCat(e.target.value); setNewSub(BINUI_CATEGORIES[e.target.value].subs[0]); }}
              >
                {Object.keys(BINUI_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500 font-semibold">② תת-קטגוריה</label>
              <select
                title="תת-קטגוריה"
                className="h-11 rounded-xl border border-gray-200 px-3 text-base bg-white focus:ring-2 focus:ring-ring"
                style={{ direction: "rtl" }}
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
              >
                {BINUI_CATEGORIES[newCat]?.subs.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-sm text-gray-500 font-semibold">③ שם ייחודי</label>
              <div className="h-11 flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden" dir="rtl">
                <span className="px-3 text-sm font-medium text-gray-400 whitespace-nowrap select-none bg-gray-50 h-full flex items-center border-l border-gray-200">
                  {namePrefix}
                </span>
                <input
                  title="שם פרויקט חדש"
                  className="h-full flex-1 px-3 text-base focus:outline-none"
                  style={{ direction: "rtl" }}
                  placeholder="הקלד שם..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProject()}
                />
              </div>
            </div>
            <button
              title="הוסף פרויקט"
              onClick={addProject}
              className="h-11 px-8 rounded-xl text-white text-base font-black hover:opacity-90 transition-opacity shadow-md"
              style={{ background: "#2C6E6A" }}
            >
              + הוספה
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">בחר קטגוריה ותת-קטגוריה, הקלד שם ולחץ הוספה</p>
        </div>
      </div>

      <HierarchyFilter
        activeDomain="מבנים"
        domainColor="#2C6E6A"
        categories={Object.entries(BINUI_CATEGORIES).map(([cat, def]) => ({
          name: cat, color: def.color, count: projects.filter((p) => p.category === cat).length,
        }))}
        filterCat={filterCat}
        onFilterCat={(cat) => { setFilterCat(cat); setFilterSub(null); }}
        subs={activeSubs.map((s) => ({ name: s, count: projects.filter((p) => p.sub === s).length }))}
        filterSub={filterSub}
        onFilterSub={setFilterSub}
        statusOptions={STATUS_OPTIONS}
        statusCounts={statusCounts}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        totalCount={projects.length}
        filteredCount={filtered.length}
      />

      {/* [UPGRADE: sort] Sort bar */}
      <div className="px-4 pt-2 pb-1 no-print">
        <SortBar
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          totalCount={projects.length}
          filteredCount={filtered.length}
          label="פרויקטים"
        />
      </div>

      {/* Project cards */}
      <div className="px-4 pb-8 space-y-3">
        {filtered.length === 0 && <EmptyState domainName="מבנים" />}

        {/* [UPGRADE: view-mode] View Mode — card grid, read-only, scannable */}
        {!isWorkMode && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p, idx) => {
              const statusCfg = STATUS_OPTIONS.find((s) => s.value === p.status);
              const mainImage = p.images.hadmaya || p.images.tashrit || p.images.tza;
              return (
                <div
                  key={p.id}
                  className="view-mode-card project-card bg-white rounded-2xl shadow-sm overflow-hidden border border-border/40 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => navigate(`/binui/${p.id}`)}
                  style={{ minHeight: 220 }}
                >
                  {/* Image — if exists, full width top */}
                  {mainImage && (
                    <div className="w-full aspect-video overflow-hidden bg-gray-100">
                      <img src={mainImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-5">
                    {/* [UPGRADE: typography] Name 18px+ bold */}
                    <h3 className="font-black text-gray-800 leading-snug group-hover:text-primary transition-colors mb-2" style={{ fontSize: "1.1rem" }}>
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold px-2 py-1 rounded-lg" style={{ color: statusCfg?.color, background: statusCfg?.bg }}>
                        {statusCfg?.label}
                      </span>
                      <span className="text-sm text-gray-400">{p.category} › {p.sub}</span>
                    </div>
                    {p.note && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.note}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <span className="text-xs text-gray-400">{p.created}</span>
                      {p.attachments.length > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Paperclip size={11} /> {p.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* [UPGRADE: view-mode] Work Mode — expanded rows, all editable fields visible */}
        {isWorkMode && filtered.map((p, idx) => (
          <div
            key={p.id}
            className="work-mode-row project-card bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col border border-border/50"
            style={{ minHeight: 140 }}
          >
            {/* Top row */}
            <div className="flex flex-col lg:flex-row">
              {/* Left — images */}
              <div className="flex-shrink-0 flex lg:border-l border-gray-100" style={{ width: undefined }}>
                <div className="flex">
                  {(["tashrit", "tza", "hadmaya"] as const).map((slot) => (
                    <FileDropZone
                      key={slot}
                      onFile={(f) => handleImage(p.id, slot, f)}
                      onDelete={async () => { await saveOne({ ...p, images: { ...p.images, [slot]: null } }); }}
                      currentSrc={p.images[slot]}
                      label={IMAGE_LABELS[slot]}
                      className="w-24 h-24 lg:w-20 lg:h-full border-l border-gray-100 hover:bg-gray-50"
                    />
                  ))}
                </div>
              </div>

              {/* Right — info */}
              <div className="flex-1 p-4 flex flex-col gap-2">
                {/* Row 1 — name + selectors + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400 font-mono w-6 flex-shrink-0">{idx + 1}.</span>
                  {/* [UPGRADE: typography] Name 18px bold */}
                  <span
                    className="font-extrabold cursor-pointer hover:underline hover:text-primary transition-colors"
                    style={{ fontSize: "1.0625rem", color: "#1a1a1a" }}
                    title="פתח פרויקט"
                    onClick={() => navigate(`/binui/${p.id}`)}
                  >
                    {p.name}
                  </span>

                  {/* [UPGRADE: interactions] Inline category/sub/domain selectors — auto-save on change */}
                  <select
                    title="שנה קטגוריה"
                    className="text-sm text-gray-500 bg-transparent border border-transparent hover:border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ direction: "rtl" }}
                    value={p.category}
                    onChange={(e) => changeCategory(p.id, e.target.value)}
                  >
                    {Object.keys(BINUI_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <select
                    title="שנה תת-קטגוריה"
                    className="text-sm text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ direction: "rtl" }}
                    value={p.sub}
                    onChange={(e) => changeSub(p.id, e.target.value)}
                  >
                    {BINUI_CATEGORIES[p.category]?.subs.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <select
                    title="העבר לדומיין"
                    className="text-sm text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ direction: "rtl" }}
                    value="מבנים"
                    onChange={(e) => moveToDomain(p, e.target.value)}
                  >
                    {ALL_DOMAINS.map((d) => (<option key={d.name} value={d.name}>{d.icon} {d.name}</option>))}
                  </select>

                  {/* [UPGRADE: typography] Status badge larger */}
                  <select
                    title="שנה סטטוס"
                    className="status-badge mr-auto h-8 rounded-lg border text-sm font-semibold px-2"
                    style={{
                      direction: "rtl",
                      color: STATUS_OPTIONS.find((s) => s.value === p.status)?.color,
                      background: STATUS_OPTIONS.find((s) => s.value === p.status)?.bg,
                      borderColor: STATUS_OPTIONS.find((s) => s.value === p.status)?.color + "44",
                    }}
                    value={p.status}
                    onChange={(e) => changeStatus(p.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>

                {/* Row 2 — detail pills */}
                <div className="flex flex-wrap gap-1 items-center pills-row">
                  <span className="text-xs text-gray-400 ml-1 font-medium">פרטים:</span>
                  {DETAIL_FIELDS["פרטים"].slice(0, 4).map((f) => (
                    <DetailPill
                      key={f.key}
                      label={f.label}
                      value={p.details?.["פרטים"]?.[f.key]}
                      color="#2C6E6A"
                      onClick={() => navigate(`/binui/${p.id}`)}
                    />
                  ))}
                </div>

                {/* Row 3 — location pills */}
                <div className="flex flex-wrap gap-1 items-center pills-row">
                  <span className="text-xs text-gray-400 ml-1 font-medium">מיקום:</span>
                  {DETAIL_FIELDS["מיקום"].map((f) => (
                    <DetailPill
                      key={f.key}
                      label={f.label}
                      value={p.details?.["מיקום"]?.[f.key]}
                      color="#2C6E6A"
                      onClick={() => navigate(`/binui/${p.id}`)}
                    />
                  ))}
                </div>

                {/* Row 4 — actions */}
                <div className="flex items-center gap-2 mt-auto flex-wrap">
                  <button
                    title="סרטוט / פתח"
                    className="h-8 px-5 rounded-lg text-white text-sm font-bold hover:brightness-110 transition-all shadow-sm"
                    style={{ background: "linear-gradient(135deg, #2C6E6A, #2C6E6ADD)" }}
                    onClick={() => navigate(`/binui/${p.id}`)}
                  >
                    סרטוט / פתח ←
                  </button>
                  <button
                    title="חוות דעת"
                    className="h-8 px-3 rounded-lg border text-sm font-semibold hover:brightness-110 transition-all"
                    style={{ borderColor: "#2C6E6A44", color: "#2C6E6A", background: "#2C6E6A0A" }}
                    onClick={() => { setNoteOpen(noteOpen === p.id ? null : p.id); setNoteText(p.note); }}
                  >
                    חוות דעת
                  </button>
                  <button
                    title="שלח חוות דעת במייל"
                    className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const statusLabel = STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status;
                      const details = p.details?.["פרטים"] ?? {};
                      const location = p.details?.["מיקום"] ?? {};
                      setEmailModal({
                        open: true,
                        subject: `חוות דעת: ${p.name}`,
                        body: `שם פרויקט: ${p.name}\nקטגוריה: ${p.category} › ${p.sub}\nסטטוס: ${statusLabel}\nתאריך: ${p.created}\n\nהערות:\n${p.note || ""}\n\nפרטים:\nאדריכל: ${details.architect || "—"}\nמנהל פרויקט: ${details.manager || "—"}\nמיקום: ${location.city || ""} ${location.quarter || ""} ${location.street || ""}`,
                      });
                    }}
                  >
                    ✉️ שלח
                  </button>
                  <button
                    title="קבצים"
                    className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    onClick={() => setAttachOpen(attachOpen === p.id ? null : p.id)}
                  >
                    <Paperclip size={13} /> קבצים
                    {p.attachments.length > 0 && (
                      <span className="rounded-full text-[11px] text-white px-1.5 leading-5" style={{ background: "#2C6E6A" }}>{p.attachments.length}</span>
                    )}
                  </button>
                  <span className="text-xs text-gray-400 mr-1">{p.created}</span>
                  <button
                    title="מחק פרויקט"
                    className="no-print mr-auto h-8 w-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
                    onClick={() => deleteProject(p.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* [UPGRADE: interactions] Inline note with auto-save on blur */}
                {noteOpen === p.id && (
                  <div className="mt-2 border-t pt-3 flex gap-2">
                    <textarea
                      title="חוות דעת"
                      className="flex-1 rounded-xl border border-gray-200 p-3 text-base resize-none"
                      style={{ direction: "rtl", minHeight: 72 }}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      // [UPGRADE: interactions] Auto-save on blur
                      onBlur={() => saveNote(p.id)}
                      placeholder="כתוב חוות דעת..."
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        title="שמור חוות דעת"
                        className="h-9 px-4 rounded-lg text-white text-sm font-bold"
                        style={{ background: "#2C6E6A" }}
                        onClick={() => saveNote(p.id)}
                      >
                        שמור
                      </button>
                      <button
                        title="ביטול"
                        className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-500"
                        onClick={() => setNoteOpen(null)}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* [UPGRADE: links] Record Links section in work mode */}
                {isWorkMode && (
                  <RecordLinks
                    links={
                      (() => {
                        try {
                          return JSON.parse(localStorage.getItem(`binui_links_${p.id}`) || "[]");
                        } catch { return []; }
                      })()
                    }
                    isWorkMode={true}
                    onUpdate={(links) => {
                      localStorage.setItem(`binui_links_${p.id}`, JSON.stringify(links));
                    }}
                  />
                )}

                {/* Attachments panel */}
                {attachOpen === p.id && (
                  <div className="mt-2 border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileDropZone
                        onFile={(f) => addAttachment(p.id, f)}
                        accept="image/*,video/*,application/pdf,.pptx,.docx,.xlsx,.msg,.eml"
                        label="הוסף קובץ"
                        className="h-16 w-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 flex-shrink-0"
                        style={{ background: "#FAFAF8" }}
                      />
                      <div className="flex-1 flex flex-wrap gap-2 overflow-x-auto">
                        {p.attachments.map((att, ai) => {
                          const ft = getAttachType(att.data);
                          return (
                            <div key={att.id} className="relative group flex flex-col items-center w-20 cursor-pointer" onClick={() => setViewerData({ attachments: p.attachments, index: ai })}>
                              <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
                                {ft === "image" && <img src={att.data} alt={att.name} className="w-full h-full object-cover" />}
                                {ft === "video" && <Film size={24} className="text-purple-400" />}
                                {ft === "pdf" && <FileText size={24} className="text-red-400" />}
                                {ft === "other" && <FileSpreadsheet size={24} className="text-blue-400" />}
                              </div>
                              <span className="text-[10px] text-gray-500 truncate w-full text-center mt-0.5">{att.name}</span>
                              <button
                                title="הסר קובץ"
                                className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                onClick={(e) => { e.stopPropagation(); removeAttachment(p.id, att.id); }}
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* [UPGRADE: links] View mode links strip */}
            {!isWorkMode && (() => {
              try {
                const links: LinkEntry[] = JSON.parse(localStorage.getItem(`binui_links_${p.id}`) || "[]");
                if (links.filter((l) => l.url.trim()).length === 0) return null;
                return (
                  <div className="px-4 pb-3">
                    <RecordLinks links={links} isWorkMode={false} onUpdate={(l) => localStorage.setItem(`binui_links_${p.id}`, JSON.stringify(l))} />
                  </div>
                );
              } catch { return null; }
            })()}
          </div>
        ))}
      </div>

      {/* [UPGRADE: knowledge-library] Knowledge Library and AI Galleries for domain */}
      <div className="px-4 pb-6 no-print">
        <div className="section-divider">
          <span className="section-divider-label">כלים לניהול ידע</span>
        </div>
        <KnowledgeLibrary
          domainName="מבנים"
          items={knowledgeItems}
          onUpdate={saveKnowledge}
          color="#2C6E6A"
        />
        <AIGalleryManager
          domainName="מבנים"
          galleries={galleries}
          onUpdate={saveGalleries}
          color="#2C6E6A"
        />
      </div>

      {/* Fullscreen attachment viewer */}
      {viewerData && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setViewerData(null)} style={{ direction: "rtl" }}>
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: "90vw", maxHeight: "90vh", width: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
              <span className="text-base font-bold text-gray-700">{viewerData.attachments[viewerData.index]?.name}</span>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-400">{viewerData.index + 1} / {viewerData.attachments.length}</span>
                {viewerData.attachments.length > 1 && (
                  <>
                    <button title="הקודם" className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index - 1 + viewerData.attachments.length) % viewerData.attachments.length })}><ChevronRight size={18} /></button>
                    <button title="הבא" className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index + 1) % viewerData.attachments.length })}><ChevronLeft size={18} /></button>
                  </>
                )}
                <button title="הורד" className="h-8 px-3 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center gap-1" onClick={() => { const att = viewerData.attachments[viewerData.index]; void downloadFile(att.data, att.name); }}><Download size={13} /> הורד</button>
                <button title="סגור" className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={() => setViewerData(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="flex items-center justify-center" style={{ maxHeight: "calc(90vh - 52px)", overflow: "auto" }}>
              {(() => {
                const att = viewerData.attachments[viewerData.index];
                if (!att) return null;
                const ft = getAttachType(att.data);
                if (ft === "image") return <img src={att.data} alt={att.name} className="max-w-full max-h-[80vh] object-contain" />;
                if (ft === "video") return <video src={att.data} controls autoPlay className="max-w-full max-h-[80vh]" />;
                if (ft === "pdf") return (
                  <div className="flex flex-col items-center justify-center p-12">
                    <FileText size={48} className="text-red-400 mb-4" />
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold text-base" onClick={() => void openFileInNewTab(att.data)}>פתח PDF</button>
                  </div>
                );
                return (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <FileSpreadsheet size={40} className="text-blue-400" />
                    <span className="text-base text-gray-500 mt-3">סוג קובץ זה אינו נתמך לצפייה ישירה</span>
                    <button className="mt-4 h-10 px-6 rounded-xl text-white text-sm font-bold" style={{ background: "#3B82F6" }} onClick={() => { void downloadFile(att.data, att.name); }}>הורד קובץ</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, subject: "", body: "" })}
        subject={emailModal.subject}
        body={emailModal.body}
        domainColor="#2C6E6A"
      />
    </div>
  );
};

/* ─── Small local components ─── */

// [UPGRADE: typography] DetailPill — 12px+ with hover state
function DetailPill({ label, value, color, onClick }: { label: string; value?: string; color: string; onClick: () => void; }) {
  const filled = !!value;
  return (
    <button
      title={label}
      onClick={onClick}
      className="h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:shadow-sm"
      style={{
        background: filled ? color + "1F" : "#F5F5F2",
        borderColor: filled ? color + "59" : "#E0E0D8",
        color: filled ? color : "#999",
      }}
    >
      {filled ? value : label}
    </button>
  );
}

export default BinuiPage;
