import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
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
import { Camera, X, Search, Paperclip, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet, ArrowRightLeft } from "lucide-react";
import { ALL_DOMAINS } from "@/lib/moveProject";
import { useBinuiProjects, useSaveBinuiProject, useDeleteBinuiProject } from "@/hooks/use-binui-projects";
import { uploadProjectFile } from "@/lib/fileStorage";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { EmptyState } from "@/components/EmptyState";

function getAttachType(src: string): "image" | "video" | "pdf" | "other" {
  if (/^(data:image|https?:.*\.(jpg|jpeg|png|gif|webp|svg))/i.test(src)) return "image";
  if (/^(data:video|https?:.*\.(mp4|webm|ogg|mov))/i.test(src)) return "video";
  if (/^(data:application\/pdf|https?:.*\.pdf)/i.test(src)) return "pdf";
  return "other";
}

const IMAGE_LABELS: Record<string, string> = {
  tashrit: "תשריט",
  tza: 'תצ"א',
  hadmaya: "הדמייה",
};

const BinuiPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useBinuiProjects();
  const saveMutation = useSaveBinuiProject();
  const deleteMutation = useDeleteBinuiProject();

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState(Object.keys(BINUI_CATEGORIES)[0]);
  const [newSub, setNewSub] = useState(BINUI_CATEGORIES[Object.keys(BINUI_CATEGORIES)[0]].subs[0]);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [filterSub, setFilterSub] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [attachOpen, setAttachOpen] = useState<number | null>(null);
  const [viewerData, setViewerData] = useState<{ attachments: BinuiAttachment[]; index: number } | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; subject: string; body: string }>({ open: false, subject: "", body: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const saveOne = useCallback(async (project: BinuiProject) => {
    try {
      await saveMutation.mutateAsync(project);
    } catch {}
  }, [saveMutation]);

  const namePrefix = `${newCat}:${newSub} - `;

  const addProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const fullName = `${namePrefix}${trimmed}`;
    const now = getHebrewDateNow();
    const p: BinuiProject = {
      id: 0, // Will be assigned by DB
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
    };
    try {
      await saveMutation.mutateAsync(p);
      setNewName("");
    } catch {}
  };

  const deleteProject = async (id: number) => {
    if (!window.confirm("האם למחוק את הפרויקט?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {}
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
    // For now, use the existing sync move function — will be migrated later
    const { moveBinuiToGeneric } = await import("@/lib/moveProject");
    const result = moveBinuiToGeneric(project, targetDomain);
    if (result.success) {
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
      qc.invalidateQueries({ queryKey: ["generic-projects"] });
      toast.success(`הפרויקט הועבר ל${targetDomain}`);
    }
  };

  const handleImage = async (id: number, slot: "tashrit" | "tza" | "hadmaya", file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    try {
      const url = await uploadProjectFile(file, "binui", id);
      await saveOne({ ...project, images: { ...project.images, [slot]: url } });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת תמונה");
    }
  };

  const saveNote = async (id: number) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    await saveOne({ ...project, note: noteText });
    setNoteOpen(null);
  };

  const addAttachment = async (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    try {
      const url = await uploadProjectFile(file, "binui", id);
      await saveAttachmentAsync("binui", id, file.name, url);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת קובץ");
    }
  };

  const removeAttachment = async (projectId: number, attachId: number) => {
    try {
      await deleteAttachmentAsync(attachId);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה במחיקת קובץ");
    }
  };

  const filtered = useMemo(() => {
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const base = filterCat ? projects.filter((p) => p.category === filterCat) : projects;
    for (const s of STATUS_OPTIONS) counts[s.value] = 0;
    for (const p of base) {
      if (counts[p.status] !== undefined) counts[p.status]++;
    }
    return counts;
  }, [projects, filterCat]);

  const activeSubs = filterCat ? BINUI_CATEGORIES[filterCat]?.subs ?? [] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ direction: "rtl" }}>
        <TopNav />
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🏛</div>
          <div className="text-muted-foreground">טוען פרויקטים...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* Domain header banner */}
      <div
        className="mx-4 mt-4 rounded-2xl px-6 py-5 text-white print:hidden"
        style={{ background: "linear-gradient(135deg, #2C6E6A 0%, #2C6E6ACC 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛</span>
            <div>
              <div className="text-xs font-light opacity-80 flex items-center gap-1">
                <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
                <span>←</span>
                <span>מבנים</span>
              </div>
              <h1 className="text-2xl font-black">מבנים</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 0 && (
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
                {projects.length} פרויקטים
              </span>
            )}
          </div>
        </div>
      </div>

      {/* === Navigation buttons bar === */}
      <div className="no-print mx-4 mt-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="h-14 px-10 rounded-xl text-white text-lg font-black hover:brightness-110 transition-all shadow-lg flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #2C6E6A, #1E5E5A)" }}
        >
          🏠 חזור לדשבורד
        </button>
        <button
          onClick={() => navigate(-1)}
          className="h-12 px-6 rounded-xl border-2 border-gray-300 text-base font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          → חזור אחורה
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-12 px-5 rounded-xl border border-gray-200 text-base font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ↑ ראש העמוד
        </button>
      </div>

      {/* === Action panels === */}
      <div className="no-print mx-4 mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Panel 1: Search */}
        <div className="rounded-xl bg-card shadow-sm border border-border/50 p-4">
          <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">🔍 חיפוש</div>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-10 rounded-lg border border-input pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              style={{ direction: "rtl" }}
              placeholder="חיפוש לפי שם, מיקום, פרטים..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">חיפוש חופשי ברשימת הפרויקטים</p>
        </div>

        {/* Panel 2: Add new record */}
        <div className="rounded-xl bg-card shadow-sm border border-border/50 p-4 lg:col-span-2">
          <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">➕ הוספת רשומה חדשה</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 font-medium">① קטגוריה</label>
              <select
                title="קטגוריה"
                className="h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white"
                style={{ direction: "rtl" }}
                value={newCat}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  setNewSub(BINUI_CATEGORIES[e.target.value].subs[0]);
                }}
              >
                {Object.keys(BINUI_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 font-medium">② תת-קטגוריה</label>
              <select
                title="תת-קטגוריה"
                className="h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white"
                style={{ direction: "rtl" }}
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
              >
                {BINUI_CATEGORIES[newCat]?.subs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
              <label className="text-[10px] text-gray-400 font-medium">③ שם ייחודי</label>
              <div className="h-9 flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden" dir="rtl">
                <span className="px-2 text-xs font-medium text-gray-400 whitespace-nowrap select-none bg-gray-50 h-full flex items-center border-l border-gray-200">
                  {namePrefix}
                </span>
                <input
                  title="שם פרויקט חדש"
                  className="h-full flex-1 px-2 text-sm focus:outline-none"
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
              className="h-9 px-6 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: "#2C6E6A" }}
            >
              + הוספה
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">בחר קטגוריה ותת-קטגוריה, הקלד שם ולחץ הוספה</p>
        </div>
      </div>

      {/* Panel 3: Filters + Summary */}
      <div className="no-print mx-4 mt-3 rounded-xl bg-card shadow-sm border border-border/50 p-4">
        <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">🔽 סינון היררכי</div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Right side: Hierarchy filters */}
          <div className="flex flex-col gap-2 flex-1">
            {/* Level 0: Domains */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">דומיין:</span>
              {[
                { name: "מבנים", icon: "🏛", color: "#2C6E6A", route: "/binui" },
                { name: "פיתוח", icon: "🌿", color: "#3A7D6F", route: "/pitua" },
                { name: "מיידעים", icon: "📋", color: "#4A6741", route: "/meyadim" },
                { name: "פעולות", icon: "⚡", color: "#5A5A7A", route: "/peulot" },
              ].map((d) => (
                <FilterPill
                  key={d.name}
                  active={d.name === "מבנים"}
                  color={d.color}
                  onClick={() => d.name !== "מבנים" && navigate(d.route)}
                >
                  {d.icon} {d.name}
                </FilterPill>
              ))}
            </div>
            {/* Level 1: Categories */}
            <div className="flex items-center gap-1.5 pr-14">
              <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">קטגוריה:</span>
              <FilterPill active={!filterCat} onClick={() => { setFilterCat(null); setFilterSub(null); }}>
                הכל
              </FilterPill>
              {Object.entries(BINUI_CATEGORIES).map(([cat, def]) => (
                <FilterPill
                  key={cat}
                  active={filterCat === cat}
                  color={def.color}
                  onClick={() => { setFilterCat(cat === filterCat ? null : cat); setFilterSub(null); }}
                >
                  {cat}
                </FilterPill>
              ))}
            </div>
            {/* Level 2: Sub-categories */}
            {activeSubs.length > 0 && (
              <div className="flex items-center gap-1.5 pr-28">
                <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">נושא:</span>
                <FilterPill active={!filterSub} onClick={() => setFilterSub(null)}
                  color={BINUI_CATEGORIES[filterCat!]?.color}>
                  הכל
                </FilterPill>
                {activeSubs.map((s) => (
                  <FilterPill
                    key={s}
                    active={filterSub === s}
                    color={BINUI_CATEGORIES[filterCat!]?.color}
                    onClick={() => setFilterSub(s === filterSub ? null : s)}
                  >
                    {s}
                  </FilterPill>
                ))}
              </div>
            )}
          </div>

          {/* Left side: Status + counter */}
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 shrink-0">סטטוס:</span>
              <FilterPill active={!filterStatus} onClick={() => setFilterStatus(null)} variant="status">
                הכל
              </FilterPill>
              {STATUS_OPTIONS.map((s) => (
                <FilterPill
                  key={s.value}
                  active={filterStatus === s.value}
                  color={s.color}
                  variant="status"
                  onClick={() => setFilterStatus(s.value === filterStatus ? null : s.value)}
                >
                  {s.label} ({statusCounts[s.value] ?? 0})
                </FilterPill>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "#E6F2F0", color: "#2C6E6A" }}
              >
                מציג {filtered.length} מתוך {projects.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project cards */}
      <div className="px-4 pb-12 space-y-3">
        {filtered.length === 0 && (
          <EmptyState domainName="מבנים" />
        )}
        {filtered.map((p, idx) => (
          <div
            key={p.id}
            className="project-card bg-card rounded-xl shadow-sm overflow-hidden flex border border-border/50"
            style={{ minHeight: 140 }}
          >
            {/* Left — images */}
            <div className="flex-shrink-0 flex" style={{ width: 260 }}>
              {(["tashrit", "tza", "hadmaya"] as const).map((slot) => (
                <FileDropZone
                  key={slot}
                  onFile={(f) => handleImage(p.id, slot, f)}
                  onDelete={async () => {
                    await saveOne({ ...p, images: { ...p.images, [slot]: null } });
                  }}
                  currentSrc={p.images[slot]}
                  label={IMAGE_LABELS[slot]}
                  className="flex-1 border-l border-gray-100 hover:bg-gray-50"
                />
              ))}
            </div>

            {/* Right — info */}
            <div className="flex-1 p-4 flex flex-col gap-2">
              {/* Row 1 */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                <span
                  className="font-extrabold text-base cursor-pointer hover:underline"
                  style={{ color: "#222" }}
                  title="פתח פרויקט"
                  onClick={() => navigate(`/binui/${p.id}`)}
                >
                  {p.name}
                </span>
                <select
                  title="שנה קטגוריה"
                  className="text-xs text-gray-500 mr-1 bg-transparent border border-transparent hover:border-gray-200 rounded px-1 cursor-pointer focus:outline-none focus:ring-1"
                  style={{ direction: "rtl" }}
                  value={p.category}
                  onChange={(e) => changeCategory(p.id, e.target.value)}
                >
                  {Object.keys(BINUI_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  title="שנה תת-קטגוריה"
                  className="text-xs text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded px-1 cursor-pointer focus:outline-none focus:ring-1"
                  style={{ direction: "rtl" }}
                  value={p.sub}
                  onChange={(e) => changeSub(p.id, e.target.value)}
                >
                  {BINUI_CATEGORIES[p.category]?.subs.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  title="העבר לדומיין"
                  className="text-xs text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded px-1 cursor-pointer focus:outline-none focus:ring-1"
                  style={{ direction: "rtl" }}
                  value="מבנים"
                  onChange={(e) => moveToDomain(p, e.target.value)}
                >
                  {ALL_DOMAINS.map((d) => (
                    <option key={d.name} value={d.name}>{d.icon} {d.name}</option>
                  ))}
                </select>
                <select
                  title="שנה סטטוס"
                  className="status-badge mr-auto h-7 rounded-md border text-xs px-2"
                  style={{
                    direction: "rtl",
                    color: STATUS_OPTIONS.find((s) => s.value === p.status)?.color,
                    background: STATUS_OPTIONS.find((s) => s.value === p.status)?.bg,
                    borderColor: STATUS_OPTIONS.find((s) => s.value === p.status)?.color + "44",
                  }}
                  value={p.status}
                  onChange={(e) => changeStatus(p.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Row 2 — detail pills */}
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-gray-400 ml-1">פרטים:</span>
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

              {/* Row 3 */}
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-gray-400 ml-1">מיקום:</span>
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
              <div className="flex items-center gap-2 mt-auto">
                <button
                  title="סרטוט / פתח"
                  className="h-7 px-4 rounded-md text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm"
                  style={{ background: "linear-gradient(135deg, #2C6E6A, #2C6E6ADD)" }}
                  onClick={() => navigate(`/binui/${p.id}`)}
                >
                  סרטוט / פתח ←
                </button>
                <button
                  title="חוות דעת"
                  className="h-7 px-3 rounded-md border text-xs font-medium hover:brightness-110 transition-all"
                  style={{ borderColor: "#2C6E6A44", color: "#2C6E6A", background: "#2C6E6A0A" }}
                  onClick={() => {
                    setNoteOpen(noteOpen === p.id ? null : p.id);
                    setNoteText(p.note);
                  }}
                >
                  חוות דעת
                </button>
                <button
                  title="שלח חוות דעת במייל"
                  className="h-7 px-3 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
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
                  className="h-7 px-3 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  onClick={() => setAttachOpen(attachOpen === p.id ? null : p.id)}
                >
                  <Paperclip size={12} /> קבצים
                  {p.attachments.length > 0 && (
                    <span className="rounded-full text-[10px] text-white px-1.5 leading-4" style={{ background: "#2C6E6A" }}>{p.attachments.length}</span>
                  )}
                </button>
                <span className="text-[10px] text-gray-400 mr-2">{p.created}</span>
                <button
                  title="מחק פרויקט"
                  className="no-print mr-auto h-7 px-3 rounded-md bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                  onClick={() => deleteProject(p.id)}
                >
                  🗑️ מחק
                </button>
              </div>

              {/* Inline note */}
              {noteOpen === p.id && (
                <div className="mt-2 border-t pt-2 flex gap-2">
                  <textarea
                    title="חוות דעת"
                    className="flex-1 rounded-lg border border-gray-200 p-2 text-sm resize-none"
                    style={{ direction: "rtl", minHeight: 60 }}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="כתוב חוות דעת..."
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      title="שמור חוות דעת"
                      className="h-7 px-3 rounded text-white text-xs"
                      style={{ background: "#2C6E6A" }}
                      onClick={() => saveNote(p.id)}
                    >
                      שמור
                    </button>
                    <button
                      title="ביטול"
                      className="h-7 px-3 rounded border border-gray-200 text-xs text-gray-500"
                      onClick={() => setNoteOpen(null)}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments panel */}
              {attachOpen === p.id && (
                <div className="mt-2 border-t pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileDropZone
                      onFile={(f) => addAttachment(p.id, f)}
                      accept="image/*,video/*,application/pdf,.pptx,.docx,.xlsx,.msg,.eml"
                      label="הוסף קובץ"
                      className="h-16 w-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex-shrink-0"
                      style={{ background: "#FAFAF8" }}
                    />
                    <div className="flex-1 flex flex-wrap gap-2 overflow-x-auto">
                      {p.attachments.map((att, ai) => {
                        const ft = getAttachType(att.data);
                        return (
                          <div key={att.id} className="relative group flex flex-col items-center w-20 cursor-pointer" onClick={() => setViewerData({ attachments: p.attachments, index: ai })}>
                            <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
                              {ft === "image" && <img src={att.data} alt={att.name} className="w-full h-full object-cover" />}
                              {ft === "video" && <Film size={24} className="text-purple-400" />}
                              {ft === "pdf" && <FileText size={24} className="text-red-400" />}
                              {ft === "other" && <FileSpreadsheet size={24} className="text-blue-400" />}
                            </div>
                            <span className="text-[9px] text-gray-500 truncate w-full text-center mt-0.5">{att.name}</span>
                            <button
                              title="הסר קובץ"
                              className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
        ))}
      </div>

      {/* Fullscreen attachment viewer */}
      {viewerData && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setViewerData(null)} style={{ direction: "rtl" }}>
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden" style={{ maxWidth: "90vw", maxHeight: "90vh", width: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <span className="text-sm font-semibold text-gray-700">{viewerData.attachments[viewerData.index]?.name}</span>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-400">{viewerData.index + 1} / {viewerData.attachments.length}</span>
                {viewerData.attachments.length > 1 && (
                  <>
                    <button title="הקודם" className="h-7 w-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index - 1 + viewerData.attachments.length) % viewerData.attachments.length })}><ChevronRight size={16} /></button>
                    <button title="הבא" className="h-7 w-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index + 1) % viewerData.attachments.length })}><ChevronLeft size={16} /></button>
                  </>
                )}
                <button title="הורד" className="h-7 px-2 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center gap-1" onClick={() => {
                  const att = viewerData.attachments[viewerData.index];
                  const a = document.createElement("a");
                  a.href = att.data;
                  a.download = att.name;
                  a.click();
                }}><Download size={12} /> הורד</button>
                <button title="סגור" className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-700" onClick={() => setViewerData(null)}><X size={16} /></button>
              </div>
            </div>
            <div className="flex items-center justify-center" style={{ maxHeight: "calc(90vh - 48px)", overflow: "auto" }}>
              {(() => {
                const att = viewerData.attachments[viewerData.index];
                if (!att) return null;
                const ft = getAttachType(att.data);
                if (ft === "image") return <img src={att.data} alt={att.name} className="max-w-full max-h-[80vh] object-contain" />;
                if (ft === "video") return <video src={att.data} controls autoPlay className="max-w-full max-h-[80vh]" />;
                if (ft === "pdf") return <iframe src={att.data} title={att.name} className="w-full" style={{ height: "80vh" }} />;
                return (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <FileSpreadsheet size={40} className="text-blue-400" />
                    <span className="text-sm text-gray-500 mt-3">סוג קובץ זה אינו נתמך לצפייה ישירה</span>
                    <button className="mt-4 h-8 px-4 rounded-lg text-white text-xs font-bold" style={{ background: "#3B82F6" }} onClick={() => {
                      const a = document.createElement("a"); a.href = att.data; a.download = att.name; a.click();
                    }}>הורד קובץ</button>
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

function FilterPill({
  children,
  active,
  color,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  variant?: "category" | "status";
  onClick: () => void;
}) {
  const isStatus = variant === "status";
  const baseColor = color || "#2C6E6A";
  return (
    <button
      title={typeof children === "string" ? children : ""}
      onClick={onClick}
      className="h-7 px-3 rounded-full text-xs font-medium transition-all border"
      style={
        active
          ? { background: baseColor, color: "#fff", borderColor: baseColor }
          : isStatus
            ? { background: "#fff", color: baseColor, borderColor: baseColor + "66" }
            : { background: "#fff", color: "#666", borderColor: "#E0E0D8" }
      }
    >
      {children}
    </button>
  );
}

function DetailPill({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value?: string;
  color: string;
  onClick: () => void;
}) {
  const filled = !!value;
  return (
    <button
      title={label}
      onClick={onClick}
      className="h-6 px-2 rounded text-[11px] border transition-colors cursor-pointer"
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
