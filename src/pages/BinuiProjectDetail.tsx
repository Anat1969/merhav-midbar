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
  MAX_FILE_SIZE_BYTES,
} from "@/lib/binuiConstants";
import { toast } from "sonner";
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
    const prev = projects;
    setProjects(updated);
    const ok = saveBinuiProjects(updated);
    if (!ok) {
      setProjects(prev);
    }
  };

  const update = (patch: Partial<BinuiProject>) => {
    persist(projects.map((p, i) => (i === projectIdx ? { ...p, ...patch } : p)));
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
        <TopNav />
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-3">🚫</div>
          <div>פרויקט לא נמצא</div>
          <button
            title="חזור לרשימה"
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg, #2C6E6A, #2C6E6ADD)" }}
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
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ images: { ...project.images, [slot]: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const addAttachment = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ attachments: [...project.attachments, { id: Date.now(), name: file.name, data: reader.result as string }] });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (attachId: number) => {
    update({ attachments: project.attachments.filter((a) => a.id !== attachId) });
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
    <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* Domain header banner */}
      <div
        className="mx-4 mt-4 rounded-2xl px-6 py-4 text-white print:hidden"
        style={{ background: "linear-gradient(135deg, #2C6E6A 0%, #2C6E6ACC 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-light opacity-80 flex items-center gap-1">
              <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
              <span>←</span>
              <span className="cursor-pointer hover:underline" onClick={() => navigate("/binui")}>מבנים</span>
              <span>←</span>
              <span className="font-medium">{project.name}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {editingName ? (
                <div className="inline-flex gap-2 items-center">
                  <input
                    title="שם פרויקט"
                    className="h-8 rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-extrabold text-white placeholder:text-white/50"
                    style={{ direction: "rtl" }}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    autoFocus
                  />
                  <button title="שמור" className="text-xs bg-white/20 text-white px-2 h-7 rounded hover:bg-white/30 transition-colors" onClick={saveName}>שמור</button>
                  <button title="ביטול" className="text-xs text-white/70 hover:underline" onClick={() => setEditingName(false)}>ביטול</button>
                </div>
              ) : (
                <h1
                  className="text-xl font-black cursor-pointer hover:underline"
                  title="לחץ לעריכת שם"
                  onClick={() => { setEditingName(true); setTempName(project.name); }}
                >
                  {project.name}
                </h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              title="שנה סטטוס"
              className="h-8 rounded-lg border text-xs px-2 font-medium"
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
              className="h-8 px-3 rounded-lg bg-white/15 text-xs text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
              onClick={() => setEmailOpen(true)}
            >
              ✉️ שלח חוות דעת
            </button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="no-print mx-4 mt-3 flex items-center gap-3">
        <button
          title="חזור לדשבורד"
          className="h-14 px-10 rounded-xl text-white text-lg font-black hover:brightness-110 transition-all shadow-lg flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #2C6E6A, #1E5E5A)" }}
          onClick={() => navigate("/")}
        >
          🏠 דשבורד
        </button>
        <button
          title="חזור אחורה"
          className="h-12 px-6 rounded-xl border-2 border-gray-300 text-base font-bold text-gray-600 hover:bg-muted transition-colors"
          onClick={() => navigate(-1 as any)}
        >
          ← חזור
        </button>
        <button
          title="קדימה"
          disabled={!nextProject}
          className="h-12 px-5 rounded-xl border border-border bg-card text-base font-medium disabled:opacity-30 hover:bg-muted transition-colors"
          onClick={() => nextProject && navigate(`/binui/${nextProject.id}`)}
        >
          קדימה &gt;
        </button>
        <button
          title="אחורה"
          disabled={!prevProject}
          className="h-12 px-5 rounded-xl border border-border bg-card text-base font-medium disabled:opacity-30 hover:bg-muted transition-colors"
          onClick={() => prevProject && navigate(`/binui/${prevProject.id}`)}
        >
          &lt; אחורה
        </button>

        <div className="flex-1" />

        <button
          title="מחק פרויקט"
          className="h-10 px-5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5"
          onClick={() => {
            if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${project.name}"? פעולה זו אינה הפיכה.`)) {
              persist(projects.filter((_, i) => i !== projectIdx));
              toast.success("הפרויקט נמחק");
              navigate("/binui");
            }
          }}
        >
          🗑️ מחק
        </button>
      </div>

      {/* Main two-column grid */}
      <div className="detail-grid mx-4 mt-4 mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — note / history */}
        <div className="detail-column bg-card rounded-xl shadow-sm overflow-hidden">
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
          <div className="bg-card rounded-xl shadow-sm overflow-hidden">
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
          <div className="bg-card rounded-xl shadow-sm p-4">
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

          {/* Documents / Attachments */}
          <div className="bg-card rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={14} style={{ color: "#2C6E6A" }} />
              <span className="text-sm font-semibold" style={{ color: "#2C6E6A" }}>מסמכים מצורפים</span>
              {project.attachments.length > 0 && (
                <span className="rounded-full text-[10px] text-white px-1.5 leading-4" style={{ background: "#2C6E6A" }}>{project.attachments.length}</span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <FileDropZone
                onFile={(f) => addAttachment(f)}
                accept="image/*,video/*,application/pdf,.pptx,.docx,.xlsx,.msg,.eml"
                label="הוסף קובץ"
                className="h-20 w-28 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-400 flex-shrink-0"
                style={{ background: "#FAFAF8" }}
              />
              <div className="flex-1 flex flex-wrap gap-2">
                {project.attachments.map((att, ai) => {
                  const ft = getAttachType(att.data);
                  return (
                    <div key={att.id} className="relative group flex flex-col items-center w-20 cursor-pointer" onClick={() => setViewerData({ attachments: project.attachments, index: ai })}>
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
                        onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="mx-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(DETAIL_FIELDS).map(([section, fields]) => {
          const editing = editingSections[section];
          const vals = editing ? editValues[section] ?? {} : project.details?.[section] ?? {};
          return (
            <div key={section} className="detail-card bg-card rounded-xl shadow-sm overflow-hidden">
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
      <div className="mx-4 mb-12 bg-card rounded-xl shadow-sm p-4">
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
