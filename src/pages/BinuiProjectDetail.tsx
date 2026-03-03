import React, { useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import {
  STATUS_OPTIONS,
  DETAIL_FIELDS,
  BinuiProject,
  BinuiAttachment,
  loadBinuiProjects,
  saveBinuiProjects,
  getHebrewDateNow,
} from "@/lib/binuiConstants";
import { Camera, Paperclip, X, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet } from "lucide-react";

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

const BinuiProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<BinuiProject[]>(loadBinuiProjects);
  const projectIdx = projects.findIndex((p) => String(p.id) === id);
  const project = projects[projectIdx];

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [activeTab, setActiveTab] = useState<"note" | "history">("note");
  const [historyInput, setHistoryInput] = useState("");
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});
  const [emailOpen, setEmailOpen] = useState(false);
  const [viewerData, setViewerData] = useState<{ attachments: BinuiAttachment[]; index: number } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const persist = (updated: BinuiProject[]) => {
    setProjects(updated);
    saveBinuiProjects(updated);
  };

  const update = (patch: Partial<BinuiProject>) => {
    persist(projects.map((p, i) => (i === projectIdx ? { ...p, ...patch } : p)));
  };

  if (!project) {
    return (
      <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
        <TopNav />
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🚫</div>
          <div>פרויקט לא נמצא</div>
          <button
            title="חזור לרשימה"
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm"
            style={{ background: "#2C6E6A" }}
            onClick={() => navigate("/binui")}
          >
            חזור לרשימה
          </button>
        </div>
      </div>
    );
  }

  const changeStatus = (status: string) => {
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    update({
      status,
      history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...project.history],
    });
  };

  const saveName = () => {
    if (tempName.trim()) update({ name: tempName.trim() });
    setEditingName(false);
  };

  const saveNote = () => {
    update({ note: project.note });
  };

  const addHistoryEntry = () => {
    const t = historyInput.trim();
    if (!t) return;
    update({ history: [{ date: getHebrewDateNow(), note: t }, ...project.history] });
    setHistoryInput("");
  };

  const handleImage = (slot: "tashrit" | "tza" | "hadmaya", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      update({ images: { ...project.images, [slot]: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (section: string) => {
    setEditingSections((s) => ({ ...s, [section]: true }));
    setEditValues((v) => ({ ...v, [section]: { ...(project.details?.[section] ?? {}) } }));
  };

  const cancelEdit = (section: string) => {
    setEditingSections((s) => ({ ...s, [section]: false }));
  };

  const saveSection = (section: string) => {
    update({
      details: { ...project.details, [section]: editValues[section] ?? {} },
    });
    setEditingSections((s) => ({ ...s, [section]: false }));
  };

  const prevProject = projectIdx > 0 ? projects[projectIdx - 1] : null;
  const nextProject = projectIdx < projects.length - 1 ? projects[projectIdx + 1] : null;

  return (
    <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* Breadcrumb */}
      <div className="breadcrumb px-6 py-3 text-sm flex gap-1 items-center" style={{ color: "#888" }}>
        <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
        <span>←</span>
        <span className="cursor-pointer hover:underline" onClick={() => navigate("/binui")}>בינוי</span>
        <span>←</span>
        <span style={{ color: "#2C6E6A", fontWeight: 600 }}>{project.name}</span>
      </div>

      {/* Header bar */}
      <div className="no-print mx-6 mb-4 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
        <button
          title="קדימה"
          disabled={!nextProject}
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs disabled:opacity-30 hover:bg-gray-50 transition-colors"
          onClick={() => nextProject && navigate(`/binui/${nextProject.id}`)}
        >
          קדימה &gt;
        </button>
        <button
          title="אחורה"
          disabled={!prevProject}
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs disabled:opacity-30 hover:bg-gray-50 transition-colors"
          onClick={() => prevProject && navigate(`/binui/${prevProject.id}`)}
        >
          &lt; אחורה
        </button>

        <div className="flex-1 text-center">
          {editingName ? (
            <div className="inline-flex gap-2 items-center">
              <input
                title="שם פרויקט"
                className="h-8 rounded-lg border border-gray-300 px-3 text-sm font-extrabold"
                style={{ direction: "rtl" }}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
              <button title="שמור" className="text-xs text-white px-2 h-7 rounded" style={{ background: "#2C6E6A" }} onClick={saveName}>שמור</button>
              <button title="ביטול" className="text-xs text-gray-500 hover:underline" onClick={() => setEditingName(false)}>ביטול</button>
            </div>
          ) : (
            <span
              className="font-extrabold text-lg cursor-pointer hover:underline"
              title="לחץ לעריכת שם"
              onClick={() => { setEditingName(true); setTempName(project.name); }}
            >
              {project.name}
            </span>
          )}
        </div>

        <select
          title="שנה סטטוס"
          className="h-8 rounded-lg border text-xs px-2"
          style={{
            direction: "rtl",
            color: STATUS_OPTIONS.find((s) => s.value === project.status)?.color,
            background: STATUS_OPTIONS.find((s) => s.value === project.status)?.bg,
            borderColor: STATUS_OPTIONS.find((s) => s.value === project.status)?.color + "44",
          }}
          value={project.status}
          onChange={(e) => changeStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          title="שלח חוות דעת במייל"
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 transition-colors"
          onClick={() => setEmailOpen(true)}
        >
          ✉️ שלח חוות דעת
        </button>
      </div>

      {/* Main two-column grid */}
      <div className="detail-grid mx-6 mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — note / history */}
        <div className="detail-column bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            <TabBtn active={activeTab === "note"} onClick={() => setActiveTab("note")}>מסמך (חוות דעת)</TabBtn>
            <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")}>היסטוריה</TabBtn>
          </div>
          <div className="p-4">
            {activeTab === "note" ? (
              <>
                <textarea
                  title="חוות דעת"
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none"
                  style={{ direction: "rtl", minHeight: 200, background: "#FAFAF8" }}
                  placeholder="כתוב חוות דעת, הערות, עדכונים..."
                  value={project.note}
                  onChange={(e) => update({ note: e.target.value })}
                />
                <button
                  title="שמור הערה"
                  className="mt-2 h-8 px-4 rounded-lg text-white text-xs font-bold"
                  style={{ background: "#2C6E6A" }}
                  onClick={saveNote}
                >
                  שמור הערה
                </button>
              </>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <input
                    title="הוסף רשומה"
                    className="flex-1 h-8 rounded-lg border border-gray-200 px-3 text-sm"
                    style={{ direction: "rtl" }}
                    placeholder="הוסף רשומת היסטוריה..."
                    value={historyInput}
                    onChange={(e) => setHistoryInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addHistoryEntry()}
                  />
                  <button
                    title="הוסף"
                    className="h-8 w-8 rounded-lg text-white text-sm flex items-center justify-center"
                    style={{ background: "#2C6E6A" }}
                    onClick={addHistoryEntry}
                  >
                    +
                  </button>
                </div>
                <div className="history-list space-y-2 max-h-[300px] overflow-y-auto">
                  {project.history.map((h, i) => (
                    <div key={i} className="flex gap-2 text-sm border-r-2 pr-3 py-1" style={{ borderColor: "#2C6E6A33" }}>
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{h.date}</span>
                      <span>{h.note}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — video/pres + images */}
        <div className="detail-column space-y-4">
          {/* Video / presentation */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b">
              <TabBtn active>סרטון</TabBtn>
              <TabBtn active={false} onClick={() => alert("העלאת קבצים תתווסף בגרסה הבאה")}>מצגת</TabBtn>
            </div>
            <div
              className="flex items-center justify-center text-gray-400 text-sm cursor-pointer"
              style={{ minHeight: 100 }}
              title="העלאת קבצים בקרוב"
              onClick={() => alert("העלאת קבצים תתווסף בגרסה הבאה")}
            >
              🎬 העלאת סרטון — בקרוב
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm font-semibold mb-2" style={{ color: "#2C6E6A" }}>תמונות הפרויקט</div>
            <div className="grid grid-cols-3 gap-2">
              {(["tashrit", "tza", "hadmaya"] as const).map((slot) => (
                <FileDropZone
                  key={slot}
                  onFile={(f) => handleImage(slot, f)}
                  onDelete={() => update({ images: { ...project.images, [slot]: null } })}
                  currentSrc={project.images[slot]}
                  label={IMAGE_LABELS[slot]}
                  className="aspect-[4/3] border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 overflow-hidden"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="mx-6 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(DETAIL_FIELDS).map(([section, fields]) => {
          const editing = editingSections[section];
          const vals = editing ? editValues[section] ?? {} : project.details?.[section] ?? {};
          return (
            <div key={section} className="detail-card bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "#FAFAF8" }}>
                <span className="text-sm font-semibold" style={{ color: "#2C6E6A" }}>{section}</span>
                {editing ? (
                  <div className="flex gap-2">
                    <button title="שמור" className="text-xs text-white px-2 py-1 rounded" style={{ background: "#2C6E6A" }} onClick={() => saveSection(section)}>שמור</button>
                    <button title="ביטול" className="text-xs text-gray-500 hover:underline" onClick={() => cancelEdit(section)}>ביטול</button>
                  </div>
                ) : (
                  <button title="עריכה" className="text-xs hover:underline" style={{ color: "#2C6E6A" }} onClick={() => startEdit(section)}>עריכה</button>
                )}
              </div>
              <div className="p-4 space-y-2">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400" style={{ minWidth: 80 }}>{f.label}</span>
                    {editing ? (
                      <input
                        title={f.label}
                        className="flex-1 h-7 rounded border border-gray-200 px-2 text-sm"
                        style={{ direction: "rtl" }}
                        value={vals[f.key] ?? ""}
                        onChange={(e) =>
                          setEditValues((v) => ({
                            ...v,
                            [section]: { ...(v[section] ?? {}), [f.key]: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      <span style={{ color: vals[f.key] ? "#222" : "#ccc" }}>{vals[f.key] || "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary pills */}
      <div className="mx-6 mb-12 bg-white rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold mb-2" style={{ color: "#2C6E6A" }}>סיכום פרטים</div>
        <div className="pills-row flex flex-wrap gap-1.5">
          {DETAIL_FIELDS["פרטים"].map((f) => {
            const val = project.details?.["פרטים"]?.[f.key];
            const filled = !!val;
            return (
              <button
                key={f.key}
                title={f.label}
                className="h-7 px-3 rounded text-xs border transition-colors cursor-pointer"
                style={{
                  background: filled ? "#2C6E6A1F" : "#F5F5F2",
                  borderColor: filled ? "#2C6E6A59" : "#E0E0D8",
                  color: filled ? "#2C6E6A" : "#999",
                }}
                onClick={() => startEdit("פרטים")}
              >
                {filled ? val : f.label}
              </button>
            );
          })}
        </div>
      </div>
      {(() => {
        const details = project.details?.["פרטים"] ?? {};
        const location = project.details?.["מיקום"] ?? {};
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status;
        return (
          <EmailModal
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            subject={`חוות דעת: ${project.name}`}
            body={`שם פרויקט: ${project.name}\nקטגוריה: ${project.category} › ${project.sub}\nסטטוס: ${statusLabel}\nתאריך: ${project.created}\n\nהערות:\n${project.note || ""}\n\nפרטים:\nאדריכל: ${details.architect || "—"}\nמנהל פרויקט: ${details.manager || "—"}\nמיקום: ${location.city || ""} ${location.quarter || ""} ${location.street || ""}`}
            domainColor="#2C6E6A"
          />
        );
      })()}
    </div>
  );
};

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick?: () => void }) {
  return (
    <button
      title={typeof children === "string" ? children : ""}
      className="flex-1 py-2.5 text-sm font-medium transition-colors border-b-2"
      style={{
        borderColor: active ? "#2C6E6A" : "transparent",
        color: active ? "#2C6E6A" : "#999",
        background: active ? "#F0F9F8" : "transparent",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default BinuiProjectDetail;
