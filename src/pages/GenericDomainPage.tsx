import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import { HierarchyFilter } from "@/components/HierarchyFilter";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
// [UPGRADE: view-mode] Import new UI components
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SortBar, SortKey, SortDir } from "@/components/SortBar";
import { RecordLinks, LinkEntry } from "@/components/RecordLinks";
import { KnowledgeLibrary, KnowledgeItem } from "@/components/KnowledgeLibrary";
import { AIGalleryManager, AIGallery } from "@/components/AIGalleryManager";
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
import { openFileInNewTab, downloadFile, openExternalLink } from "@/lib/fileAccess";
import { EmptyState } from "@/components/EmptyState";
import { BreadcrumbNav } from "@/components/Breadcrumb";
import { ActivityLog } from "@/components/ActivityLog";

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

  // Pre-select category/sub based on URL filter
  const getInitialCatSub = () => {
    if (!urlFilter) return { cat: firstCat, sub: firstSubs[0] };
    if (catNames.includes(urlFilter)) {
      const subs = getSubsForCategory(config, urlFilter);
      return { cat: urlFilter, sub: subs[0] };
    }
    for (const cat of catNames) {
      const subs = getSubsForCategory(config, cat);
      if (subs.includes(urlFilter)) return { cat, sub: urlFilter };
    }
    return { cat: firstCat, sub: firstSubs[0] };
  };
  const initialCatSub = getInitialCatSub();

  const { data: projects = [], isLoading } = useGenericProjects(config.storageKey);
  const saveMutation = useSaveGenericProject(config.storageKey);
  const deleteMutation = useDeleteGenericProject(config.storageKey);

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newViewLink, setNewViewLink] = useState("");
  const [newCat, setNewCat] = useState(initialCatSub.cat);
  const [newSub, setNewSub] = useState(initialCatSub.sub);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [filterSub, setFilterSub] = useState<string | null>(urlFilter);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [activityOpen, setActivityOpen] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<{ id: number; field: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [attachOpen, setAttachOpen] = useState<number | null>(null);
  const [viewerData, setViewerData] = useState<{ attachments: Attachment[]; index: number } | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; subject: string; body: string }>({ open: false, subject: "", body: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // [UPGRADE: view-mode] View/Work mode state
  const [isWorkMode, setIsWorkMode] = useState(false);

  // [UPGRADE: sort] Sort state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // [UPGRADE: knowledge-library] Per-domain knowledge library and gallery data
  const klKey = `${config.storageKey}_knowledge`;
  const galKey = `${config.storageKey}_galleries`;
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(klKey) || "null") ?? []; } catch { return []; }
  });
  const [galleries, setGalleries] = useState<AIGallery[]>(() => {
    try { return JSON.parse(localStorage.getItem(galKey) || "null") ?? []; } catch { return []; }
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const saveKnowledge = (items: KnowledgeItem[]) => {
    setKnowledgeItems(items);
    localStorage.setItem(klKey, JSON.stringify(items));
  };
  const saveGalleries = (g: AIGallery[]) => {
    setGalleries(g);
    localStorage.setItem(galKey, JSON.stringify(g));
  };

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
      viewLink: newViewLink.trim(),
    };
    try {
      await saveMutation.mutateAsync(p);
      setNewName("");
      setNewLink("");
      setNewViewLink("");
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

  const addActivityEntry = async (id: number, text: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const entry = { date: getHebrewDateNow(), note: text };
    await saveOne({ ...project, history: [entry, ...project.history] });
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
    // [UPGRADE: sort] Apply sort
    const STATUS_ORDER: Record<string, number> = { planning: 0, inprogress: 1, review: 2, done: 3 };
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")     cmp = a.name.localeCompare(b.name, "he");
      else if (sortKey === "date") cmp = a.created.localeCompare(b.created, "he");
      else if (sortKey === "status") cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [projects, filterCat, filterSub, filterStatus, search, sortKey, sortDir]);

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

        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "דשבורד", href: "/" },
    { label: config.domainName, href: `/${config.routeBase}` },
    ...(filterCat ? [{ label: filterCat }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0A1628]" style={{ direction: "rtl" }}>
      <TopNav />
      <PrintHeader />
      <BreadcrumbNav items={breadcrumbItems} />

      {/* [UPGRADE: navigation] Domain header banner with breadcrumb */}
      <div

        style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl drop-shadow">{DOMAIN_ICONS[config.domainName] || "📁"}</span>
            <div>

            </div>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 0 && (

              </span>
            )}
            {/* Stage summary counters */}
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((s) => {
                const cnt = projects.filter((p) => p.status === s.value).length;
                if (cnt === 0) return null;
                return (
                  <span key={s.value} className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: s.bg, color: s.color }}>
                    {s.label}: {cnt}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* === Navigation buttons bar === */}
      <div className="no-print mx-4 mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate("/")}

        >
          🏠 חזור לדשבורד
        </button>
        <button
          onClick={() => navigate(-1)}

        >
          → חזור אחורה
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}

        >
          ↑ ראש העמוד
        </button>

        {/* [UPGRADE: view-mode] Prominent View/Work mode toggle */}
        <div className="mr-auto">
          <ViewModeToggle isWorkMode={isWorkMode} onToggle={setIsWorkMode} />
        </div>
      </div>

      {/* === Action panels === */}
      <div className="no-print mx-4 mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Panel 1: Search */}
        <div className="rounded-xl bg-[#162B55] shadow-sm border border-[#1E3A6E] p-5">
          <div className="text-base font-bold text-[#C9A84C] mb-3 flex items-center gap-2">🔍 חיפוש</div>
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8C5D6]" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-12 rounded-lg border border-[#1E3A6E] bg-[#0F2044] text-white pr-10 pl-3 text-base focus:outline-none focus:border-[#C9A84C] placeholder:text-[#4A5568]"
              style={{ direction: "rtl" }}
              placeholder="חיפוש לפי שם, תיאור..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-[#B8C5D6] mt-2">חיפוש חופשי ברשימת הפרויקטים</p>
        </div>

        {/* Panel 2: Add new record */}
        <div className="rounded-xl bg-[#162B55] shadow-sm border border-[#1E3A6E] p-5 lg:col-span-2">
          <div className="text-base font-bold text-[#C9A84C] mb-3 flex items-center gap-2">➕ הוספת רשומה חדשה</div>
          
          {/* Row 1: Name construction — category + sub + unique name */}
          <div className="mb-3">
            <label className="text-xs text-[#B8C5D6] font-medium mb-1.5 block">שם הרשומה (קטגוריה{hasSubs ? " › תת-קטגוריה" : ""} › שם ייחודי)</label>
            <div className="flex items-center h-11 rounded-lg border border-[#1E3A6E] bg-[#0F2044] overflow-hidden" dir="rtl">
              <select
                title="קטגוריה"
                className="h-full px-3 text-sm font-bold border-none bg-[#162B55] text-[#C9A84C] focus:outline-none cursor-pointer"
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
              <span className="text-[#4A5568] text-sm select-none px-0.5">:</span>
              {hasSubs ? (
                <select
                  title="תת-קטגוריה"
                  className="h-full px-2 text-sm font-medium border-none bg-[#162B55] text-[#B8C5D6] focus:outline-none cursor-pointer"
                  style={{ direction: "rtl" }}
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                >
                  {currentSubs.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <span className="px-2 text-sm font-medium text-[#B8C5D6] bg-[#162B55]">{newCat}</span>
              )}
              <span className="text-[#4A5568] text-sm select-none px-1">–</span>
              <input
                title="שם פרויקט חדש"
                className="h-full flex-1 px-3 text-base font-medium focus:outline-none bg-transparent text-white placeholder:text-[#4A5568]"
                style={{ direction: "rtl" }}
                placeholder="הקלד שם ייחודי..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
              />
            </div>
            <div className="mt-1 text-xs text-[#4A5568] font-mono" dir="rtl">
              תצוגה מקדימה: <span className="text-[#B8C5D6]">{namePrefix}{newName || "..."}</span>
            </div>
          </div>

          {/* Row 2: Links (if applicable) + Add button */}
          <div className="flex flex-wrap gap-3 items-end">
            {config.hasLink && (
              <>
                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                  <label className="text-sm text-[#B8C5D6] font-medium">🔗 קישור עבודה</label>
                  <input
                    title="קישור עבודה"
                    className="h-11 rounded-lg border border-[#1E3A6E] bg-[#0F2044] text-white px-3 text-base focus:outline-none focus:border-[#C9A84C] placeholder:text-[#4A5568]"
                    style={{ direction: "ltr" }}
                    placeholder="https://..."
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                  <label className="text-sm text-[#B8C5D6] font-medium">👁 קישור תצוגה</label>
                  <input
                    title="קישור תצוגה"
                    className="h-11 rounded-lg border border-[#1E3A6E] bg-[#0F2044] text-white px-3 text-base focus:outline-none focus:border-[#C9A84C] placeholder:text-[#4A5568]"
                    style={{ direction: "ltr" }}
                    placeholder="https://..."
                    value={newViewLink}
                    onChange={(e) => setNewViewLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                  />
                </div>
              </>
            )}
            <button
              title="הוסף פרויקט"
              onClick={addProject}
              className="h-11 px-8 rounded-lg bg-[#C9A84C] text-[#0A1628] text-base font-bold hover:bg-[#E8C96A] transition-colors"
            >
              + הוספה
            </button>
          </div>
          <p className="text-sm text-[#B8C5D6] mt-2">בחר קטגוריה{hasSubs ? " ותת-קטגוריה" : ""}, הקלד שם{config.hasLink ? ", קישורים" : ""} ולחץ הוספה</p>
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
        {filtered.length === 0 && (
          <EmptyState domainName={config.domainName} storageKey={config.storageKey} />
        )}

            {/* Right — image */}
            <FileDropZone
              onFile={(f) => handleImage(p.id, f)}
              onDelete={async () => {
                await saveOne({ ...p, image: null });
              }}
              currentSrc={p.image}
              label="תמונה"
              className="flex-shrink-0 border-l border-[#1E3A6E] hover:bg-[#1E3A6E] image-drop-target"
              style={{ width: 140 }}
            />

            {/* Center — info */}
            <div className="flex-1 p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-[#4A5568] font-mono w-6">{idx + 1}.</span>
                <span
                  className="font-extrabold text-base cursor-pointer hover:underline text-white"
                  title="פתח פרויקט"
                  onClick={() => navigate(`/${config.routeBase}/${p.id}`)}
                >
                  {p.name}
                </span>
                <select
                  title="שנה קטגוריה"
                  className="text-xs text-[#B8C5D6] mr-1 bg-[#0F2044] border border-[#1E3A6E] hover:border-[#C9A84C] rounded px-1 cursor-pointer focus:outline-none"
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
                    className="text-xs text-[#B8C5D6] bg-[#0F2044] border border-[#1E3A6E] hover:border-[#C9A84C] rounded px-1 cursor-pointer focus:outline-none"
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
                  className="text-xs text-[#B8C5D6] bg-[#0F2044] border border-[#1E3A6E] hover:border-[#C9A84C] rounded px-1 cursor-pointer focus:outline-none"
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

              {/* Link fields for apps */}
              {config.hasLink && (p.link || p.viewLink) && (
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {p.link && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#B8C5D6] font-medium">🔗 עבודה:</span>
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:underline truncate max-w-[200px]" style={{ direction: "ltr" }}>{p.link}</a>
                    </div>
                  )}
                  {p.viewLink && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#B8C5D6] font-medium">👁 תצוגה:</span>
                      <a href={p.viewLink} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:underline truncate max-w-[200px]" style={{ direction: "ltr" }}>{p.viewLink}</a>
                    </div>
                  )}
                </div>
              )}

              {/* Row 4: actions */}
              <div className="flex items-center gap-2 mt-auto flex-wrap">
                <button
                  title="פתח"

                  onClick={() => navigate(`/${config.routeBase}/${p.id}`)}
                >
                  פתח ←
                </button>
                {config.hasLink && p.link && (
                  <button
                    title="קישור עבודה"

                    onClick={() => openExternalLink(p.link)}
                  >
                    🔗 עבודה
                  </button>
                )}
                {config.hasLink && p.viewLink && (
                  <button
                    title="קישור תצוגה"

                    onClick={() => openExternalLink(p.viewLink)}
                  >
                    👁 תצוגה
                  </button>
                )}
                <button

                  onClick={() => { setNoteOpen(noteOpen === p.id ? null : p.id); setNoteText(p.note); }}
                >
                  הערות
                </button>
                <button

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

                  onClick={() => setAttachOpen(attachOpen === p.id ? null : p.id)}
                >
                  <Paperclip size={13} />
                  קבצים
                  {p.attachments.length > 0 && (

                  onClick={() => deleteProject(p.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* [UPGRADE: interactions] Inline note with auto-save on blur */}
              {noteOpen === p.id && (

                  </div>
                </div>
              )}



              {/* Attachments panel */}
              {attachOpen === p.id && (
                <div className="mt-2 border-t border-[#1E3A6E] pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileDropZone
                      onFile={(f) => addAttachment(p.id, f)}
                      accept="image/*,video/*,application/pdf,.pptx,.docx,.xlsx,.msg,.eml"
                      label="הוסף קובץ"
                      className="h-16 w-24 rounded-lg border-2 border-dashed border-[#1E3A6E] hover:border-[#C9A84C] flex-shrink-0 image-drop-target"
                      style={{ background: "#0F2044" }}
                    />
                    <div className="flex-1 flex flex-wrap gap-2 overflow-x-auto">
                      {p.attachments.map((att, ai) => {
                        const ft = getAttachType(att.data);
                        return (
                          <div key={att.id} className="relative group flex flex-col items-center w-20 cursor-pointer" onClick={() => setViewerData({ attachments: p.attachments, index: ai })}>
                            <div className="w-16 h-16 rounded-lg border border-[#1E3A6E] overflow-hidden flex items-center justify-center bg-[#0F2044]">
                              {ft === "image" && <img src={att.data} alt={att.name} className="w-full h-full object-cover" />}
                              {ft === "video" && <Film size={24} className="text-purple-400" />}
                              {ft === "pdf" && <FileText size={24} className="text-red-400" />}
                              {ft === "other" && <FileSpreadsheet size={24} className="text-blue-400" />}
                            </div>
                            <span className="text-[9px] text-[#B8C5D6] truncate w-full text-center mt-0.5">{att.name}</span>
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
                className="flex-shrink-0 border-r border-[#1E3A6E] flex flex-col items-center justify-center cursor-pointer group"
                style={{ width: 140, minHeight: 140, background: "#0F2044" }}
                onClick={() => startInlineEdit(p.id, "poeticName", p.poeticName)}
                title="לחץ לעריכת הייקו"
              >
                {editingField?.id === p.id && editingField.field === "poeticName" ? (
                  <div className="w-full h-full p-2 flex flex-col gap-1">
                    <textarea
                      title="הייקו"
                      className="flex-1 w-full rounded border border-[#1E3A6E] bg-[#162B55] text-white p-1.5 text-sm font-bold text-center resize-none focus:outline-none focus:border-[#C9A84C] placeholder:text-[#4A5568]"
                      style={{ direction: "rtl" }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      placeholder="הייקו..."
                    />
                    <div className="flex gap-1 justify-center">
                      <button title="שמור" className="text-[10px] px-2 py-0.5 rounded bg-[#C9A84C] text-[#0A1628] font-bold" onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }}>✓</button>
                      <button title="ביטול" className="text-[10px] px-2 py-0.5 rounded border border-[#1E3A6E] text-[#B8C5D6]" onClick={(e) => { e.stopPropagation(); setEditingField(null); }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-[10px] text-[#4A5568] mb-1">🎋 הייקו</span>
                    {p.poeticName ? (
                      <span className="text-sm font-bold text-[#C9A84C] whitespace-pre-line leading-relaxed">{p.poeticName}</span>
                    ) : (
                      <span className="text-xs text-[#4A5568] group-hover:text-[#B8C5D6] transition-colors">לחץ להוספה</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {/* End work mode loop */}
      </div>

      {/* [UPGRADE: knowledge-library] Knowledge Library and AI Galleries for this domain */}
      <div className="px-4 pb-6 no-print">
        <div className="section-divider">
          <span className="section-divider-label">כלים לניהול ידע</span>
        </div>
        <KnowledgeLibrary
          domainName={config.domainName}
          items={knowledgeItems}
          onUpdate={saveKnowledge}
          color={config.color}
        />
        <AIGalleryManager
          domainName={config.domainName}
          galleries={galleries}
          onUpdate={saveGalleries}
          color={config.color}
        />
      </div>

      {/* Fullscreen attachment viewer */}
      {viewerData && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setViewerData(null)} style={{ direction: "rtl" }}>
          <div className="relative bg-[#162B55] border border-[#1E3A6E] rounded-xl shadow-2xl overflow-hidden" style={{ maxWidth: "90vw", maxHeight: "90vh", width: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-[#0F2044] border-b border-[#1E3A6E]">
              <span className="text-sm font-semibold text-white">{viewerData.attachments[viewerData.index]?.name}</span>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-[#B8C5D6]">{viewerData.index + 1} / {viewerData.attachments.length}</span>
                {viewerData.attachments.length > 1 && (
                  <>
                    <button title="הקודם" className="h-7 w-7 rounded flex items-center justify-center text-[#B8C5D6] hover:bg-[#1E3A6E]" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index - 1 + viewerData.attachments.length) % viewerData.attachments.length })}><ChevronRight size={16} /></button>
                    <button title="הבא" className="h-7 w-7 rounded flex items-center justify-center text-[#B8C5D6] hover:bg-[#1E3A6E]" onClick={() => setViewerData({ ...viewerData, index: (viewerData.index + 1) % viewerData.attachments.length })}><ChevronLeft size={16} /></button>
                  </>
                )}
                <button title="הורד" className="h-7 px-2 rounded text-xs border border-[#1E3A6E] text-[#B8C5D6] hover:bg-[#1E3A6E] flex items-center gap-1" onClick={() => {
                  const att = viewerData.attachments[viewerData.index];
                  void downloadFile(att.data, att.name);
                }}><Download size={12} /> הורד</button>
                <button title="סגור" className="h-7 w-7 rounded flex items-center justify-center text-[#B8C5D6] hover:text-white" onClick={() => setViewerData(null)}><X size={16} /></button>
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
// [UPGRADE: interactions] InlineField — larger text, auto-save on blur
function InlineField({
  label, value, editing, editText, onStart, onChange, onSave, onCancel, italic,
}: {
  label: string; value: string; editing: boolean; editText: string;
  onStart: () => void; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
  italic?: boolean;
}) {
  return (

      {editing ? (
        <div className="flex-1 flex gap-1">
          <input
            title={label}

            style={{ direction: "rtl" }}
            value={editText}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
            onBlur={onSave}
            autoFocus
          />
        </div>
      ) : (

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
          ? { background: "#C9A84C", color: "#0A1628", borderColor: "#C9A84C" }
          : isStatus && color
            ? { background: "#162B55", color: color, borderColor: color + "66" }
            : { background: "#162B55", color: "#B8C5D6", borderColor: "#1E3A6E" }
      }
    >
      {children}
    </button>
  );
}

export default GenericDomainPage;
