import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import { Search, Pencil, Paperclip, X, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet } from "lucide-react";
import {
  DomainConfig,
  GenericProject,
  Attachment,
  STATUS_OPTIONS,
  loadGenericProjects,
  saveGenericProjects,
  getHebrewDateNow,
  getSubsForCategory,
  getAllCategoryNames,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/domainConstants";
import { toast } from "sonner";

function getAttachType(src: string): "image" | "video" | "pdf" | "other" {
  if (src.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src)) return "image";
  if (src.startsWith("data:video") || /\.(mp4|webm|ogg|mov)$/i.test(src)) return "video";
  if (src.startsWith("data:application/pdf") || /\.pdf$/i.test(src)) return "pdf";
  return "other";
}

interface Props {
  config: DomainConfig;
}

const GenericDomainPage: React.FC<Props> = ({ config }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catNames = getAllCategoryNames(config);
  const firstCat = catNames[0];
  const firstSubs = getSubsForCategory(config, firstCat);

  // Read initial sub-filter from URL param (e.g. ?filter=מדריכים)
  const urlFilter = searchParams.get("filter");

  const [projects, setProjects] = useState<GenericProject[]>(() => loadGenericProjects(config.storageKey));
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
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

  const persist = useCallback((updated: GenericProject[]) => {
    const prev = projects;
    setProjects(updated);
    const ok = saveGenericProjects(config.storageKey, updated);
    if (!ok) {
      setProjects(prev);
    }
  }, [config.storageKey, projects]);

  const namePrefix = `${newCat}:${newSub} - `;

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const fullName = `${namePrefix}${trimmed}`;
    const now = getHebrewDateNow();
    const p: GenericProject = {
      id: Date.now(),
      name: fullName,
      poeticName: "",
      category: newCat,
      sub: newSub,
      status: "planning",
      created: now,
      note: "",
      description: "",
      task: "",
      decision: "",
      history: [{ date: now, note: "נוצר" }],
      tracking: { date: "", note: "", agent: "" },
      initiator: "",
      image: null,
      attachments: [],
    };
    persist([p, ...projects]);
    setNewName("");
  };

  const deleteProject = (id: number) => {
    if (!window.confirm("האם למחוק את הפרויקט?")) return;
    persist(projects.filter((p) => p.id !== id));
  };

  const changeStatus = (id: number, status: string) => {
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    persist(
      projects.map((p) =>
        p.id === id
          ? { ...p, status: status as any, history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...p.history] }
          : p
      )
    );
  };

  const changeCategory = (id: number, newCatValue: string) => {
    const subs = getSubsForCategory(config, newCatValue);
    const newSubValue = subs.length > 0 ? subs[0] : newCatValue;
    persist(
      projects.map((p) =>
        p.id === id
          ? { ...p, category: newCatValue, sub: newSubValue, history: [{ date: getHebrewDateNow(), note: `קטגוריה שונתה ל: ${newCatValue}` }, ...p.history] }
          : p
      )
    );
  };

  const changeSub = (id: number, newSubValue: string) => {
    persist(
      projects.map((p) =>
        p.id === id
          ? { ...p, sub: newSubValue, history: [{ date: getHebrewDateNow(), note: `תת-קטגוריה שונתה ל: ${newSubValue}` }, ...p.history] }
          : p
      )
    );
  };

  const handleImage = (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      persist(projects.map((p) => p.id === id ? { ...p, image: reader.result as string } : p));
    };
    reader.readAsDataURL(file);
  };

  const saveNote = (id: number) => {
    persist(projects.map((p) => (p.id === id ? { ...p, note: noteText } : p)));
    setNoteOpen(null);
  };

  const startInlineEdit = (id: number, field: string, current: string) => {
    setEditingField({ id, field });
    setEditText(current);
  };

  const saveInlineEdit = () => {
    if (!editingField) return;
    persist(projects.map((p) => p.id === editingField.id ? { ...p, [editingField.field]: editText } : p));
    setEditingField(null);
  };

  const addAttachment = (id: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      persist(projects.map((p) => p.id === id
        ? { ...p, attachments: [...p.attachments, { id: Date.now(), name: file.name, data: reader.result as string }] }
        : p
      ));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (projectId: number, attachId: number) => {
    persist(projects.map((p) => p.id === projectId
      ? { ...p, attachments: p.attachments.filter((a) => a.id !== attachId) }
      : p
    ));
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

  return (
    <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* Breadcrumb */}
      <div className="breadcrumb px-6 py-3 text-sm flex gap-1 items-center" style={{ color: "#888" }}>
        <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
        <span>←</span>
        <span style={{ color: config.color, fontWeight: 600 }}>{config.domainName}</span>
      </div>

      {/* Action bar */}
      <div className="no-print mx-6 mb-4 rounded-xl bg-white shadow-sm p-5 space-y-4">

        {/* === Section 1: Search === */}
        <div>
          <div className="relative" style={{ maxWidth: 360 }}>
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-10 rounded-lg border border-gray-200 pr-9 pl-3 text-sm focus:outline-none focus:ring-2"
              style={{ direction: "rtl" }}
              placeholder="חיפוש לפי שם פרויקט..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">חיפוש חופשי ברשימת הפרויקטים</p>
        </div>

        <div className="border-t border-gray-100" />

        {/* === Section 2: Add new record === */}
        <div>
          <div className="text-xs font-bold text-gray-500 mb-2">➕ הוספת רשומה חדשה</div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Step 1: Category */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 font-medium">① קטגוריה</label>
              <select
                title="קטגוריה"
                className="h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white"
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
            {/* Step 2: Sub-category (if exists) */}
            {hasSubs && (
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 font-medium">② תת-קטגוריה</label>
                <select
                  title="תת-קטגוריה"
                  className="h-9 rounded-lg border border-gray-200 px-2 text-sm bg-white"
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
            {/* Step 3: Name */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-[180px]">
              <label className="text-[10px] text-gray-400 font-medium">{hasSubs ? "③" : "②"} שם ייחודי</label>
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
            {/* Step 4: Add button */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-transparent font-medium select-none">{hasSubs ? "④" : "③"}</label>
              <button
                title="הוסף פרויקט"
                onClick={addProject}
                className="h-9 px-6 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: config.color }}
              >
                + הוספה
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">בחר קטגוריה{hasSubs ? " ותת-קטגוריה" : ""}, הקלד שם ייחודי ולחץ הוספה</p>
        </div>

        <div className="border-t border-gray-100" />

        {/* === Section 3: Filters === */}
        <div>
          <div className="text-xs font-bold text-gray-500 mb-3">🔽 סינון היררכי — דומיין ← קטגוריה ← נושא ← סטטוס</div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Right side: Hierarchy */}
            <div className="flex flex-col gap-2">
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
                    active={d.name === config.domainName}
                    color={d.color}
                    onClick={() => d.name !== config.domainName && navigate(`/${d.route.replace("/", "")}`)}
                  >
                    {d.icon} {d.name}
                  </FilterPill>
                ))}
              </div>
              {/* Level 1: Categories */}
              <div className="flex items-center gap-1.5 pr-14">
                <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">קטגוריה:</span>
                <FilterPill active={!filterCat && !filterSub} onClick={() => { setFilterCat(null); setFilterSub(null); setSearchParams({}); }} color={config.color}>
                  הכל
                </FilterPill>
                {catNames.map((cat) => {
                  const catCount = projects.filter((p) => p.category === cat).length;
                  return (
                    <FilterPill
                      key={cat}
                      active={filterCat === cat}
                      color={config.color}
                      onClick={() => { setFilterCat(cat === filterCat ? null : cat); setFilterSub(null); setSearchParams({}); }}
                    >
                      {cat} {catCount > 0 ? `(${catCount})` : ""}
                    </FilterPill>
                  );
                })}
              </div>
              {/* Level 2: Sub-categories (shown when category selected and has subs) */}
              {filterCat && config.categories[filterCat]?.length > 0 && (
                <div className="flex items-center gap-1.5 pr-28">
                  <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">נושא:</span>
                  <FilterPill active={!filterSub} onClick={() => { setFilterSub(null); setSearchParams({}); }} color={config.color}>
                    הכל
                  </FilterPill>
                  {getSubsForCategory(config, filterCat).map((s) => {
                    const subCount = projects.filter((p) => p.category === filterCat && p.sub === s).length;
                    return (
                      <FilterPill
                        key={s}
                        active={filterSub === s}
                        color={config.color}
                        onClick={() => { setFilterSub(s === filterSub ? null : s); setSearchParams({}); }}
                      >
                        {s} {subCount > 0 ? `(${subCount})` : ""}
                      </FilterPill>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Left side: Status filters */}
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
          </div>
          <p className="text-[11px] text-gray-400 mt-2">עץ היררכי: דומיין ← קטגוריה{hasSubs ? " ← נושא" : ""} ← סטטוס. ניתן לשלב סינונים יחד</p>
        </div>

        <div className="border-t border-gray-100" />

        {/* === Section 4: Summary & utility === */}
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: config.color + "1A", color: config.color }}
          >
            סה״כ: {projects.length} פרויקטים
          </span>
          <button
            title="שמירה ידנית של הנתונים"
            onClick={() => { saveGenericProjects(config.storageKey, projects); toast.success("הנתונים נשמרו"); }}
            className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            💾 שמירה
          </button>
          <p className="text-[11px] text-gray-400">הנתונים נשמרים אוטומטית. לחץ שמירה לשמירה ידנית נוספת</p>
        </div>
      </div>

      {/* Project cards */}
      <div className="px-6 pb-12 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📂</div>
            <div className="text-lg">אין פרויקטים להצגה</div>
            <div className="text-sm mt-1">הוסף פרויקט חדש מהשורה למעלה</div>
          </div>
        )}
        {filtered.map((p, idx) => (
          <div key={p.id} className="project-card bg-white rounded-xl shadow-sm overflow-hidden flex" style={{ minHeight: 140 }}>
            {/* Left — image */}
            <FileDropZone
              onFile={(f) => handleImage(p.id, f)}
              onDelete={() => { const updated = projects.map((pr) => pr.id === p.id ? { ...pr, image: null } : pr); setProjects(updated); saveGenericProjects(config.storageKey, updated); }}
              currentSrc={p.image}
              label="תמונה"
              className="flex-shrink-0 border-l border-gray-100 hover:bg-gray-50"
              style={{ width: 140 }}
            />

            {/* Right — info */}
            <div className="flex-1 p-4 flex flex-col gap-1.5">
              {/* Row 1: index + name + category + status */}
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

              {/* Row 3: extra fields */}
              {config.extraFields === "poetic" ? (
                <InlineField
                  label="שיר הייקו:"
                  value={p.poeticName}
                  editing={editingField?.id === p.id && editingField.field === "poeticName"}
                  editText={editText}
                  onStart={() => startInlineEdit(p.id, "poeticName", p.poeticName)}
                  onChange={setEditText}
                  onSave={saveInlineEdit}
                  onCancel={() => setEditingField(null)}
                  italic
                />
              ) : (
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

              {/* Row 4: actions */}
              <div className="flex items-center gap-2 mt-auto">
                <button
                  title="פתח"
                  className="h-7 px-3 rounded-md text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  style={{ background: config.color }}
                  onClick={() => navigate(`/${config.routeBase}/${p.id}`)}
                >
                  פתח
                </button>
                <button
                  title="חוות דעת"
                  className="h-7 px-3 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
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
                  className="no-print mr-auto text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                  onClick={() => deleteProject(p.id)}
                >
                  ×
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
      className="h-7 px-3 rounded-full text-xs font-medium transition-all border"
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
