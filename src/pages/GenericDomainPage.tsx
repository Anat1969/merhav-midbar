import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import { HierarchyFilter } from "@/components/HierarchyFilter";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import { Search, Pencil, Paperclip, X, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet, ArrowRightLeft, Trash2 } from "lucide-react";
import {
  DomainConfig,
  GenericProject,
  Attachment,
  STATUS_OPTIONS,
  getHebrewDateNow,
  getSubsForCategory,
  getAllCategoryNames,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/domainConstants";
import { toast } from "sonner";
import { ALL_DOMAINS } from "@/lib/moveProject";
import { useGenericProjects, useSaveGenericProject, useDeleteGenericProject } from "@/hooks/use-generic-projects";
import { uploadProjectFile } from "@/lib/fileStorage";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { openFileInNewTab, downloadFile } from "@/lib/fileAccess";
import { EmptyState } from "@/components/EmptyState";

const DOMAIN_ICONS: Record<string, string> = {
  "מבנים": "🏛",
  "פיתוח": "🌿",
  "מיידעים": "📋",
  "פעולות": "⚡",
  "אפליקציות": "💻",
};

function getAttachType(src: string): "image" | "video" | "pdf" | "other" {
  if (/^(data:image|https?:.*\.(jpg|jpeg|png|gif|webp|svg))/i.test(src)) return "image";
  if (/^(data:video|https?:.*\.(mp4|webm|ogg|mov))/i.test(src)) return "video";
  if (/^(data:application\/pdf|https?:.*\.pdf)/i.test(src)) return "pdf";
  return "other";
}

interface Props {
  config: DomainConfig;
}

const GenericDomainPage: React.FC<Props> = ({ config }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const catNames = getAllCategoryNames(config);
  const firstCat = catNames[0];
  const firstSubs = getSubsForCategory(config, firstCat);

  const urlFilter = searchParams.get("filter");

  const { data: projects = [], isLoading } = useGenericProjects(config.storageKey);
  const saveMutation = useSaveGenericProject(config.storageKey);
  const deleteMutation = useDeleteGenericProject(config.storageKey);

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newCat, setNewCat] = useState(firstCat);
  const [newSub, setNewSub] = useState(firstSubs[0]);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [filterSub, setFilterSub] = useState<string | null>(urlFilter);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editingField, setEditingField] = useState<{ id: number; field: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [attachOpen, setAttachOpen] = useState<number | null>(null);
  const [viewerData, setViewerData] = useState<{ attachments: Attachment[]; index: number } | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; subject: string; body: string }>({ open: false, subject: "", body: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const saveOne = useCallback(async (project: GenericProject) => {
    try {
      await saveMutation.mutateAsync(project);
    } catch {}
  }, [saveMutation]);

  const namePrefix = `${newCat}:${newSub} - `;

  const addProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (config.hasLink && !newLink.trim()) {
      toast.error("יש להזין קישור לאפליקציה");
      return;
    }
    const fullName = `${namePrefix}${trimmed}`;
    const now = getHebrewDateNow();
    const p: GenericProject = {
      id: 0,
      name: fullName,
      poeticName: "",
      poem: "",
      category: newCat,
      sub: newSub,
      status: "planning",
      created: now,
      note: "",
      description: "",
      document: "",
      task: "",
      decision: "",
      history: [{ date: now, note: "נוצר" }],
      tracking: { date: "", note: "", agent: "" },
      initiator: "",
      image: null,
      attachments: [],
      link: newLink.trim(),
    };
    try {
      await saveMutation.mutateAsync(p);
      setNewName("");
      setNewLink("");
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
      status: status as any,
      history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...project.history],
    });
  };

  const changeCategory = async (id: number, newCatValue: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const subs = getSubsForCategory(config, newCatValue);
    const newSubValue = subs.length > 0 ? subs[0] : newCatValue;
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

  const moveToDomain = async (project: GenericProject, targetDomain: string) => {
    if (targetDomain === config.domainName) return;
    if (!window.confirm(`להעביר את "${project.name}" לדומיין ${targetDomain}?`)) return;
    const { moveGenericToBinui, moveGenericToGeneric } = await import("@/lib/moveProject");
    let result;
    if (targetDomain === "מבנים") {
      result = moveGenericToBinui(project, config.domainName);
    } else {
      result = moveGenericToGeneric(project, config.domainName, targetDomain);
    }
    if (result.success) {
      qc.invalidateQueries({ queryKey: ["generic-projects"] });
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
      toast.success(`הפרויקט הועבר ל${targetDomain}`);
    }
  };

  const handleImage = async (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    try {
      const url = await uploadProjectFile(file, "generic", id);
      await saveOne({ ...project, image: url });
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

  const startInlineEdit = (id: number, field: string, current: string) => {
    setEditingField({ id, field });
    setEditText(current);
  };

  const saveInlineEdit = async () => {
    if (!editingField) return;
    const project = projects.find((p) => p.id === editingField.id);
    if (!project) return;
    await saveOne({ ...project, [editingField.field]: editText });
    setEditingField(null);
  };

  const addAttachment = async (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    try {
      const url = await uploadProjectFile(file, "generic", id);
      await saveAttachmentAsync("generic", id, file.name, url);
      qc.invalidateQueries({ queryKey: ["generic-projects", config.storageKey] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת קובץ");
    }
  };

  const removeAttachment = async (projectId: number, attachId: number) => {
    try {
      await deleteAttachmentAsync(attachId);
      qc.invalidateQueries({ queryKey: ["generic-projects", config.storageKey] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה במחיקת קובץ");
    }
  };

  const filtered = useMemo(() => {
    let list = projects;
    if (filterCat) list = list.filter((p) => p.category === filterCat);
    if (filterSub) list = list.filter((p) => p.sub === filterSub || p.category === filterSub);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
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

  const currentSubs = getSubsForCategory(config, newCat);
  const hasSubs = config.categories[newCat]?.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ direction: "rtl" }}>
        <TopNav />
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">{DOMAIN_ICONS[config.domainName] || "📁"}</div>
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
        style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{DOMAIN_ICONS[config.domainName] || "📁"}</span>
            <div>
              <div className="text-xs font-light opacity-80 flex items-center gap-1">
                <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
                <span>←</span>
                <span>{config.domainName}</span>
              </div>
              <h1 className="text-2xl font-black">{config.domainName}</h1>
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
          style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}DD)` }}
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
        <div className="rounded-xl bg-card shadow-sm border border-border/50 p-5">
          <div className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">🔍 חיפוש</div>
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-12 rounded-lg border border-input pr-10 pl-3 text-base focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              style={{ direction: "rtl" }}
              placeholder="חיפוש לפי שם, תיאור..."
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
              <label className="text-sm text-gray-400 font-medium">① קטגוריה</label>
              <select
                title="קטגוריה"
                className="h-11 rounded-lg border border-gray-200 px-3 text-base bg-white"
                style={{ direction: "rtl" }}
                value={newCat}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  const subs = getSubsForCategory(config, e.target.value);
                  setNewSub(subs[0]);
                }}
              >
                {catNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {hasSubs && (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400 font-medium">② תת-קטגוריה</label>
                <select
                  title="תת-קטגוריה"
                  className="h-11 rounded-lg border border-gray-200 px-3 text-base bg-white"
                  style={{ direction: "rtl" }}
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                >
                  {currentSubs.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-sm text-gray-400 font-medium">{hasSubs ? "③" : "②"} שם ייחודי</label>
              <div className="h-11 flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden" dir="rtl">
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
            {config.hasLink && (
              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-sm text-gray-400 font-medium">🔗 קישור</label>
                <input
                  title="קישור לאפליקציה"
                  className="h-11 rounded-lg border border-gray-200 px-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ direction: "ltr" }}
                  placeholder="https://..."
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProject()}
                />
              </div>
            )}
            <button
              title="הוסף פרויקט"
              onClick={addProject}
              className="h-11 px-8 rounded-lg text-white text-base font-bold hover:opacity-90 transition-opacity"
              style={{ background: config.color }}
            >
              + הוספה
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">בחר קטגוריה{hasSubs ? " ותת-קטגוריה" : ""}, הקלד שם{config.hasLink ? " וקישור" : ""} ולחץ הוספה</p>
        </div>
      </div>

      <HierarchyFilter
        activeDomain={config.domainName}
        domainColor={config.color}
        categories={catNames.map((cat) => ({
          name: cat, count: projects.filter((p) => p.category === cat).length,
        }))}
        filterCat={filterCat}
        onFilterCat={(cat) => { setFilterCat(cat); setFilterSub(null); setSearchParams({}); }}
        subs={filterCat && config.categories[filterCat]?.length > 0
          ? getSubsForCategory(config, filterCat).map((s) => ({
              name: s, count: projects.filter((p) => p.category === filterCat && p.sub === s).length,
            }))
          : []
        }
        filterSub={filterSub}
        onFilterSub={(sub) => { setFilterSub(sub); setSearchParams({}); }}
        statusOptions={STATUS_OPTIONS}
        statusCounts={statusCounts}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        totalCount={projects.length}
        filteredCount={filtered.length}
      />

      {/* Project cards */}
      <div className="px-4 pb-12 space-y-3">
      {filtered.length === 0 && (
          <EmptyState domainName={config.domainName} storageKey={config.storageKey} />
        )}
        {filtered.map((p, idx) => (
          <div key={p.id} className="project-card bg-card rounded-xl shadow-sm overflow-hidden flex border border-border/50" style={{ minHeight: 140 }}>
            {/* Right — image */}
            <FileDropZone
              onFile={(f) => handleImage(p.id, f)}
              onDelete={async () => {
                await saveOne({ ...p, image: null });
              }}
              currentSrc={p.image}
              label="תמונה"
              className="flex-shrink-0 border-l border-gray-100 hover:bg-gray-50"
              style={{ width: 140 }}
            />

            {/* Center — info */}
            <div className="flex-1 p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                <span
                  className="font-extrabold text-base cursor-pointer hover:underline"
                  style={{ color: "#222" }}
                  title="פתח פרויקט"
                  onClick={() => navigate(`/${config.routeBase}/${p.id}`)}
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
                  {catNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {config.categories[p.category]?.length > 0 && (
                  <select
                    title="שנה תת-קטגוריה"
                    className="text-xs text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded px-1 cursor-pointer focus:outline-none focus:ring-1"
                    style={{ direction: "rtl" }}
                    value={p.sub}
                    onChange={(e) => changeSub(p.id, e.target.value)}
                  >
                    {getSubsForCategory(config, p.category).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                <select
                  title="העבר לדומיין"
                  className="text-xs text-gray-400 bg-transparent border border-transparent hover:border-gray-200 rounded px-1 cursor-pointer focus:outline-none focus:ring-1"
                  style={{ direction: "rtl" }}
                  value={config.domainName}
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
                    borderColor: (STATUS_OPTIONS.find((s) => s.value === p.status)?.color ?? "") + "44",
                  }}
                  value={p.status}
                  onChange={(e) => changeStatus(p.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: description */}
              <InlineField
                label="תיאור:"
                value={p.description}
                editing={editingField?.id === p.id && editingField.field === "description"}
                editText={editText}
                onStart={() => startInlineEdit(p.id, "description", p.description)}
                onChange={setEditText}
                onSave={saveInlineEdit}
                onCancel={() => setEditingField(null)}
              />

              {config.extraFields !== "poetic" && (
                <>
                  <InlineField
                    label="משימה:"
                    value={p.task}
                    editing={editingField?.id === p.id && editingField.field === "task"}
                    editText={editText}
                    onStart={() => startInlineEdit(p.id, "task", p.task)}
                    onChange={setEditText}
                    onSave={saveInlineEdit}
                    onCancel={() => setEditingField(null)}
                  />
                  <InlineField
                    label="החלטה:"
                    value={p.decision}
                    editing={editingField?.id === p.id && editingField.field === "decision"}
                    editText={editText}
                    onStart={() => startInlineEdit(p.id, "decision", p.decision)}
                    onChange={setEditText}
                    onSave={saveInlineEdit}
                    onCancel={() => setEditingField(null)}
                  />
                </>
              )}

              {/* Link field for apps */}
              {config.hasLink && p.link && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 font-medium">🔗</span>
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                    style={{ direction: "ltr" }}
                  >
                    {p.link}
                  </a>
                </div>
              )}

              {/* Row 4: actions */}
              <div className="flex items-center gap-2 mt-auto">
                <button
                  title="פתח"
                  className="h-7 px-4 rounded-md text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}DD)` }}
                  onClick={() => navigate(`/${config.routeBase}/${p.id}`)}
                >
                  פתח ←
                </button>
                <button
                  title="חוות דעת"
                  className="h-7 px-3 rounded-md border text-xs font-medium hover:brightness-110 transition-all"
                  style={{ borderColor: config.color + "44", color: config.color, background: config.color + "0A" }}
                  onClick={() => { setNoteOpen(noteOpen === p.id ? null : p.id); setNoteText(p.note); }}
                >
                  חוות דעת
                </button>
                <button
                  title="שלח חוות דעת במייל"
                  className="h-7 px-3 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    const statusLabel = STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status;
                    setEmailModal({
                      open: true,
                      subject: `חוות דעת: ${p.name}`,
                      body: `שם פרויקט: ${p.name}\nקטגוריה: ${p.category}${p.sub !== p.category ? ` › ${p.sub}` : ""}\nסטטוס: ${statusLabel}\nתאריך: ${p.created}\n\nהערות:\n${p.note || ""}`,
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
                  <Paperclip size={12} />
                  קבצים
                  {p.attachments.length > 0 && (
                    <span className="rounded-full text-[10px] text-white px-1.5 leading-4" style={{ background: config.color }}>{p.attachments.length}</span>
                  )}
                </button>
                <span className="text-[10px] text-gray-400 mr-2">{p.created}</span>
                <button
                  title="מחק פרויקט"
                  className="no-print mr-auto h-7 w-7 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
                  onClick={() => deleteProject(p.id)}
                >
                  <Trash2 size={15} />
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
                    <button title="שמור חוות דעת" className="h-7 px-3 rounded text-white text-xs" style={{ background: config.color }} onClick={() => saveNote(p.id)}>שמור</button>
                    <button title="ביטול" className="h-7 px-3 rounded border border-gray-200 text-xs text-gray-500" onClick={() => setNoteOpen(null)}>ביטול</button>
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

            {/* Left — Haiku square box (poetic domains only) */}
            {config.extraFields === "poetic" && (
              <div
                className="flex-shrink-0 border-r border-gray-100 flex flex-col items-center justify-center cursor-pointer group"
                style={{ width: 140, minHeight: 140, background: "#FAFAF8" }}
                onClick={() => startInlineEdit(p.id, "poeticName", p.poeticName)}
                title="לחץ לעריכת הייקו"
              >
                {editingField?.id === p.id && editingField.field === "poeticName" ? (
                  <div className="w-full h-full p-2 flex flex-col gap-1">
                    <textarea
                      title="הייקו"
                      className="flex-1 w-full rounded border border-gray-300 p-1.5 text-sm font-bold text-center resize-none focus:outline-none focus:ring-1"
                      style={{ direction: "rtl" }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      placeholder="הייקו..."
                    />
                    <div className="flex gap-1 justify-center">
                      <button title="שמור" className="text-[10px] px-2 py-0.5 rounded text-white" style={{ background: config.color }} onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }}>✓</button>
                      <button title="ביטול" className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500" onClick={(e) => { e.stopPropagation(); setEditingField(null); }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-[10px] text-gray-400 mb-1">🎋 הייקו</span>
                    {p.poeticName ? (
                      <span className="text-sm font-bold text-gray-700 whitespace-pre-line leading-relaxed">{p.poeticName}</span>
                    ) : (
                      <span className="text-xs text-gray-300 group-hover:text-gray-400 transition-colors">לחץ להוספה</span>
                    )}
                  </div>
                )}
              </div>
            )}
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
                  void downloadFile(att.data, att.name);
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
                if (ft === "pdf") return (
                  <div className="flex flex-col items-center justify-center p-12">
                    <FileText size={48} className="text-red-400 mb-4" />
                    <button
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                      onClick={() => void openFileInNewTab(att.data)}
                    >
                      פתח PDF
                    </button>
                  </div>
                );
                return (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <FileSpreadsheet size={40} className="text-blue-400" />
                    <span className="text-sm text-gray-500 mt-3">סוג קובץ זה אינו נתמך לצפייה ישירה</span>
                    <button className="mt-4 h-8 px-4 rounded-lg text-white text-xs font-bold" style={{ background: "#3B82F6" }} onClick={() => {
                      void downloadFile(att.data, att.name);
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
        domainColor={config.color}
      />
    </div>
  );
};

/* ─── Inline editable field ─── */
function InlineField({
  label, value, editing, editText, onStart, onChange, onSave, onCancel, italic,
}: {
  label: string; value: string; editing: boolean; editText: string;
  onStart: () => void; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
  italic?: boolean;
}) {
  return (
    <div className="flex items-start gap-1.5 text-sm">
      <span className="text-[11px] text-gray-400 mt-0.5 flex-shrink-0">{label}</span>
      {editing ? (
        <div className="flex-1 flex gap-1">
          <input
            title={label}
            className="flex-1 h-6 rounded border border-gray-200 px-2 text-xs"
            style={{ direction: "rtl" }}
            value={editText}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
            onBlur={onSave}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1">
          <span className={`text-xs ${italic ? "italic" : ""}`} style={{ color: value ? "#444" : "#ccc" }}>
            {value || "—"}
          </span>
          <button title="ערוך" className="text-gray-300 hover:text-gray-500 transition-colors" onClick={onStart}>
            <Pencil size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Filter pill ─── */
function FilterPill({ children, active, color, variant, onClick }: { children: React.ReactNode; active: boolean; color?: string; variant?: "status"; onClick: () => void }) {
  const isStatus = variant === "status";
  return (
    <button
      title={typeof children === "string" ? children : ""}
      onClick={onClick}
      className="h-9 px-4 rounded-full text-sm font-semibold transition-all border"
      style={
        active
          ? { background: color || "#666", color: "#fff", borderColor: color || "#666" }
          : isStatus && color
            ? { background: "#fff", color: color, borderColor: color + "66" }
            : { background: "#F5F5F2", color: "#666", borderColor: "#E0E0D8" }
      }
    >
      {children}
    </button>
  );
}

export default GenericDomainPage;
