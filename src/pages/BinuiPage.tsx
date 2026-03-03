import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  loadBinuiProjects,
  saveBinuiProjects,
  getHebrewDateNow,
} from "@/lib/binuiConstants";
import { Camera, X, Search, Paperclip, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet } from "lucide-react";

function getAttachType(src: string): "image" | "video" | "pdf" | "other" {
  if (src.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src)) return "image";
  if (src.startsWith("data:video") || /\.(mp4|webm|ogg|mov)$/i.test(src)) return "video";
  if (src.startsWith("data:application/pdf") || /\.pdf$/i.test(src)) return "pdf";
  return "other";
}

const IMAGE_LABELS: Record<string, string> = {
  tashrit: "תשריט",
  tza: 'תצ"א',
  hadmaya: "הדמייה",
};

const BinuiPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<BinuiProject[]>(loadBinuiProjects);
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

  const persist = useCallback((updated: BinuiProject[]) => {
    setProjects(updated);
    saveBinuiProjects(updated);
  }, []);

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const now = getHebrewDateNow();
    const p: BinuiProject = {
      id: Date.now(),
      name: trimmed,
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
          ? {
              ...p,
              status,
              history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...p.history],
            }
          : p
      )
    );
  };

  const handleImage = (id: number, slot: "tashrit" | "tza" | "hadmaya", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      persist(
        projects.map((p) =>
          p.id === id ? { ...p, images: { ...p.images, [slot]: reader.result as string } } : p
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const saveNote = (id: number) => {
    persist(projects.map((p) => (p.id === id ? { ...p, note: noteText } : p)));
    setNoteOpen(null);
  };

  const addAttachment = (id: number, file: File) => {
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

  return (
    <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
      <TopNav />
      <PrintHeader />
      {/* Breadcrumb */}
      <div className="breadcrumb px-6 py-3 text-sm flex gap-1 items-center" style={{ color: "#888" }}>
        <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>
          דשבורד
        </span>
        <span>←</span>
        <span style={{ color: "#2C6E6A", fontWeight: 600 }}>בינוי</span>
      </div>

      {/* Action bar */}
      <div className="no-print mx-6 mb-4 rounded-xl bg-white shadow-sm p-4 space-y-3">
        {/* Row 1 */}
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
              setNewSub(BINUI_CATEGORIES[e.target.value].subs[0]);
            }}
          >
            {Object.keys(BINUI_CATEGORIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            title="תת-קטגוריה"
            className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
            style={{ direction: "rtl" }}
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
          >
            {BINUI_CATEGORIES[newCat]?.subs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            title="הוסף פרויקט"
            onClick={addProject}
            className="h-9 px-5 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: "#2C6E6A" }}
          >
            הוספה
          </button>
          <button
            title="שמירה"
            onClick={() => saveBinuiProjects(projects)}
            className="h-9 px-4 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            שמירה
          </button>
          <span
            className="mr-auto text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "#E6F2F0", color: "#2C6E6A" }}
          >
            חישוב: {projects.length} פרויקטים
          </span>
        </div>

        {/* Row 2 — filter pills */}
        <div className="pills-row flex flex-wrap gap-1.5 items-center">
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
          {activeSubs.length > 0 && (
            <>
              <span className="mx-1 text-gray-300">|</span>
              <FilterPill active={!filterSub} onClick={() => setFilterSub(null)}>
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
            </>
          )}
          <span className="mx-1 text-gray-300">|</span>
          <FilterPill active={!filterStatus} onClick={() => setFilterStatus(null)}>
            הכל
          </FilterPill>
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
            <div className="text-5xl mb-3">🏗</div>
            <div className="text-lg">אין פרויקטים להצגה</div>
            <div className="text-sm mt-1">הוסף פרויקט חדש מהשורה למעלה</div>
          </div>
        )}
        {filtered.map((p, idx) => (
          <div
            key={p.id}
            className="project-card bg-white rounded-xl shadow-sm overflow-hidden flex"
            style={{ minHeight: 140 }}
          >
            {/* Left — images */}
            <div className="flex-shrink-0 flex" style={{ width: 260 }}>
              {(["tashrit", "tza", "hadmaya"] as const).map((slot) => (
                <FileDropZone
                  key={slot}
                  onFile={(f) => handleImage(p.id, slot, f)}
                  onDelete={() => { const updated = projects.map((pr) => pr.id === p.id ? { ...pr, images: { ...pr.images, [slot]: null } } : pr); setProjects(updated); saveBinuiProjects(updated); }}
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
                <span className="text-xs text-gray-400 mr-1">{p.category} / {p.sub}</span>
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
                  className="h-7 px-3 rounded-md text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  style={{ background: "#2C6E6A" }}
                  onClick={() => navigate(`/binui/${p.id}`)}
                >
                  סרטוט / פתח
                </button>
                <button
                  title="חוות דעת"
                  className="h-7 px-3 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
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
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      title={typeof children === "string" ? children : ""}
      onClick={onClick}
      className="h-7 px-3 rounded-full text-xs font-medium transition-all border"
      style={
        active
          ? { background: color || "#2C6E6A", color: "#fff", borderColor: color || "#2C6E6A" }
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
