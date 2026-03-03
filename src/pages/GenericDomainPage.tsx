import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import { Search, Pencil } from "lucide-react";
import {
  DomainConfig,
  GenericProject,
  STATUS_OPTIONS,
  loadGenericProjects,
  saveGenericProjects,
  getHebrewDateNow,
  getSubsForCategory,
  getAllCategoryNames,
} from "@/lib/domainConstants";

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
  const [emailModal, setEmailModal] = useState<{ open: boolean; subject: string; body: string }>({ open: false, subject: "", body: "" });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const persist = useCallback((updated: GenericProject[]) => {
    setProjects(updated);
    saveGenericProjects(config.storageKey, updated);
  }, [config.storageKey]);

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const now = getHebrewDateNow();
    const p: GenericProject = {
      id: Date.now(),
      name: trimmed,
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
      <div className="no-print mx-6 mb-4 rounded-xl bg-white shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-shrink-0" style={{ width: 200 }}>
            <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              title="חיפוש פרויקט"
              className="w-full h-9 rounded-lg border border-gray-200 pr-8 pl-3 text-sm focus:outline-none focus:ring-1"
              style={{ direction: "rtl" }}
              placeholder="🔍 חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            title="שם פרויקט חדש"
            className="h-9 flex-1 min-w-[140px] rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1"
            style={{ direction: "rtl" }}
            placeholder="שם פרויקט חדש"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
          />
          <select
            title="קטגוריה"
            className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
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
          {hasSubs && (
            <select
              title="תת-קטגוריה"
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              style={{ direction: "rtl" }}
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
            >
              {currentSubs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button
            title="הוסף פרויקט"
            onClick={addProject}
            className="h-9 px-5 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: config.color }}
          >
            הוספה
          </button>
          <button
            title="שמירה"
            onClick={() => saveGenericProjects(config.storageKey, projects)}
            className="h-9 px-4 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            שמירה
          </button>
          <span
            className="mr-auto text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: config.color + "1A", color: config.color }}
          >
            חישוב: {projects.length} פרויקטים
          </span>
        </div>

        {/* Filter pills */}
        <div className="pills-row flex flex-wrap gap-1.5 items-center">
          {filterSub && (
            <>
              <FilterPill active={true} color={config.color} onClick={() => { setFilterSub(null); setSearchParams({}); }}>
                {filterSub} ✕
              </FilterPill>
              <span className="mx-1 text-gray-300">|</span>
            </>
          )}
          <FilterPill active={!filterCat && !filterSub} onClick={() => { setFilterCat(null); setFilterSub(null); setSearchParams({}); }} color={config.color}>הכל</FilterPill>
          {catNames.map((cat) => (
            <FilterPill
              key={cat}
              active={filterCat === cat}
              color={config.color}
              onClick={() => { setFilterCat(cat === filterCat ? null : cat); setFilterSub(null); setSearchParams({}); }}
            >
              {cat}
            </FilterPill>
          ))}
          <span className="mx-1 text-gray-300">|</span>
          <FilterPill active={!filterStatus} onClick={() => setFilterStatus(null)} color={config.color}>הכל</FilterPill>
          {STATUS_OPTIONS.map((s) => (
            <FilterPill
              key={s.value}
              active={filterStatus === s.value}
              color={s.color}
              onClick={() => setFilterStatus(s.value === filterStatus ? null : s.value)}
            >
              {s.label} ({statusCounts[s.value] ?? 0})
            </FilterPill>
          ))}
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
            </div>
          </div>
        ))}
      </div>
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
function FilterPill({ children, active, color, onClick }: { children: React.ReactNode; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      title={typeof children === "string" ? children : ""}
      onClick={onClick}
      className="h-7 px-3 rounded-full text-xs font-medium transition-all border"
      style={
        active
          ? { background: color || "#666", color: "#fff", borderColor: color || "#666" }
          : { background: "#F5F5F2", color: "#666", borderColor: "#E0E0D8" }
      }
    >
      {children}
    </button>
  );
}

export default GenericDomainPage;
