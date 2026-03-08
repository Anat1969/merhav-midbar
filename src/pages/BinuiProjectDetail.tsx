import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import {
  STATUS_OPTIONS,
  DETAIL_FIELDS,
  BinuiProject,
  BinuiAttachment,
  ConsultantNote,
  getHebrewDateNow,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/binuiConstants";
import { toast } from "sonner";
import { Camera, Paperclip, X, ChevronLeft, ChevronRight, Download, FileText, Film, FileSpreadsheet, Trash2, BookOpen, Loader2 } from "lucide-react";
import { useBinuiProjects, useSaveBinuiProject, useDeleteBinuiProject } from "@/hooks/use-binui-projects";
import { uploadProjectFile } from "@/lib/fileStorage";
import { resolveAccessibleFileUrl, openFileInNewTab, downloadFile as dlFile } from "@/lib/fileAccess";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { generateDraftDocx, downloadDraftDocx, downloadConsultantRequirementsDocx, generateConsultantRequirementsBlob } from "@/lib/generateDraftDocx";
import { supabase } from "@/integrations/supabase/client";

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

const PresentationDevPlanTabs: React.FC<{ project: BinuiProject; onUpload: (file: File) => void; onMinutesUpload: (file: File) => void }> = ({ project, onUpload, onMinutesUpload }) => {
  const [tab, setTab] = useState<"presentation" | "devplan" | "minutes">("presentation");
  const presRef = useRef<HTMLInputElement>(null);
  const devRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);

  const presFiles = project.attachments.filter((a) => /\.(pptx?|pdf|key)$/i.test(a.name));
  const devFiles = project.attachments.filter((a) => /תוכנית.פיתוח|dev.?plan/i.test(a.name));
  const minFiles = project.attachments.filter((a) => /פרוטוקול.ועדה|committee.?minutes/i.test(a.name));
  const hasMinutes = minFiles.length > 0;

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-xs font-bold" style={{ color: "#2C6E6A" }}>חומרים</div>
      <div className="flex border-b">
        <TabBtn active={tab === "presentation"} onClick={() => setTab("presentation")}>מצגת</TabBtn>
        <TabBtn active={tab === "devplan"} onClick={() => setTab("devplan")}>תוכנית פיתוח</TabBtn>
        <TabBtn active={tab === "minutes"} onClick={() => setTab("minutes")}>
          <span className={hasMinutes ? "text-green-600 font-bold" : ""}>
            {hasMinutes ? "✅ " : ""}פרוטוקול ועדה
          </span>
        </TabBtn>
      </div>
      <div className="flex flex-col items-center justify-center p-4 gap-2" style={{ minHeight: 100 }}>
        {tab === "presentation" ? (
          <>
            <input ref={presRef} type="file" className="hidden" accept=".pptx,.ppt,.pdf,.key" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            <button
              title="העלה קובץ מצגת בפורמט PPTX, PDF או KEY"
              className="h-9 px-4 rounded-lg text-white text-xs font-bold hover:brightness-110 transition-all"
              style={{ background: "#2C6E6A" }}
              onClick={() => presRef.current?.click()}
            >
              📎 העלה מצגת
            </button>
            <span className="text-[10px] text-muted-foreground">העלאת קובץ מצגת (PPTX, PDF, KEY)</span>
            {presFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {presFiles.map((f) => (
                  <a key={f.id} href={f.data} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{f.name}</a>
                ))}
              </div>
            )}
            {presFiles.length === 0 && <span className="text-xs text-muted-foreground">אין מצגות — העלה קובץ</span>}
          </>
        ) : tab === "devplan" ? (
          <>
            <input ref={devRef} type="file" className="hidden" accept="image/*,application/pdf,.pptx,.docx,.xlsx,.dwg,.dxf" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            <button
              title="העלה קובץ תוכנית פיתוח — תמונה, PDF, DOCX, DWG ועוד"
              className="h-9 px-4 rounded-lg text-white text-xs font-bold hover:brightness-110 transition-all"
              style={{ background: "#2C6E6A" }}
              onClick={() => devRef.current?.click()}
            >
              📎 העלה תוכנית פיתוח
            </button>
            <span className="text-[10px] text-muted-foreground">העלאת תוכנית פיתוח (PDF, DOCX, DWG, תמונות)</span>
            {devFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {devFiles.map((f) => (
                  <a key={f.id} href={f.data} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{f.name}</a>
                ))}
              </div>
            )}
            {devFiles.length === 0 && <span className="text-xs text-muted-foreground">אין תוכניות פיתוח — העלה קובץ</span>}
          </>
        ) : (
          <>
            <input ref={minRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.xlsx,.pptx" onChange={(e) => { const f = e.target.files?.[0]; if (f) onMinutesUpload(f); }} />
            <button
              title="העלה פרוטוקול ועדה — PDF, DOCX"
              className="h-9 px-4 rounded-lg text-white text-xs font-bold hover:brightness-110 transition-all"
              style={{ background: hasMinutes ? "#10B981" : "#2C6E6A" }}
              onClick={() => minRef.current?.click()}
            >
              {hasMinutes ? "✅" : "📎"} העלה פרוטוקול ועדה
            </button>
            <span className="text-[10px] text-muted-foreground">העלאת פרוטוקול ועדה (PDF, DOCX)</span>
            {minFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {minFiles.map((f) => (
                  <a key={f.id} href={f.data} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{f.name}</a>
                ))}
              </div>
            )}
            {minFiles.length === 0 && <span className="text-xs text-muted-foreground">אין פרוטוקולים — העלה קובץ</span>}
          </>
        )}
      </div>
    </div>
  );
};

const BinuiProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useBinuiProjects();
  const saveMutation = useSaveBinuiProject();
  const deleteMutation = useDeleteBinuiProject();

  const projectIdx = projects.findIndex((p) => String(p.id) === id);
  const project = projects[projectIdx];

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "opinion" | "protocol">("history");
  const [historyInput, setHistoryInput] = useState("");
  const [opinionInput, setOpinionInput] = useState("");
  const [recommendation, setRecommendation] = useState(
    (project ? (project as any).recommendation : "") || ""
  );
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});
  const [emailOpen, setEmailOpen] = useState(false);
  const [draftEmailBody, setDraftEmailBody] = useState<string | null>(null);
  const [draftAttachment, setDraftAttachment] = useState<{ name: string; base64: string } | null>(null);
  const [viewerData, setViewerData] = useState<{ attachments: BinuiAttachment[]; index: number } | null>(null);
  const [localNote, setLocalNote] = useState(project?.note || "");
  const [forumInputs, setForumInputs] = useState<Record<string, { date: string; text: string }>>({
    architect: { date: "", text: "" },
    committee: { date: "", text: "" },
  });

  const CONSULTANT_PARTIES = [
    "תנועה", "תברואה", "ניהול ניקוז", "חשמל", "נטיעות",
    "איכות סביבה", "נכסים", "חינוך", "רישוי", "תכנון",
  ] as const;

  const [consultantInputs, setConsultantInputs] = useState<Record<string, { date: string; text: string }>>(
    Object.fromEntries(CONSULTANT_PARTIES.map((p) => [p, { date: "", text: "" }]))
  );
  const [consultantDate, setConsultantDate] = useState("");
  const [consultantFilter, setConsultantFilter] = useState<"all" | "pending" | "not_done" | "done">("all");

  const [committeeChecks, setCommitteeChecks] = useState({
    printedPlan: false,
    digitalPlan: false,
    finalDraft: false,
  });
  const [parsingPlan, setParsingPlan] = useState(false);
  const planFileRef = useRef<HTMLInputElement>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (project) setLocalNote(project.note || "");
  }, [project?.id]);

  const update = async (patch: Partial<BinuiProject>) => {
    if (!project) return;
    try {
      await saveMutation.mutateAsync({ ...project, ...patch });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ direction: "rtl" }}>
        <TopNav />
        <div className="text-muted-foreground animate-pulse">טוען...</div>
      </div>
    );
  }

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


  const addHistoryEntry = () => {
    const t = historyInput.trim();
    if (!t) return;
    update({ history: [{ date: getHebrewDateNow(), note: t }, ...project.history] });
    setHistoryInput("");
  };

  const handleImage = async (slot: "tashrit" | "tza" | "hadmaya", file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    try {
      const url = await uploadProjectFile(file, "binui", project.id);
      await update({ images: { ...project.images, [slot]: url } });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת תמונה");
    }
  };

  const addAttachment = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    try {
      const url = await uploadProjectFile(file, "binui", project.id);
      await saveAttachmentAsync("binui", project.id, file.name, url);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת קובץ");
    }
  };

  const removeAttachment = async (attachId: number) => {
    try {
      await deleteAttachmentAsync(attachId);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });
    } catch (err: any) {
      toast.error(err.message || "שגיאה במחיקת קובץ");
    }
  };

  const handlePlanInstructions = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB.");
      return;
    }
    setParsingPlan(true);
    try {
      // 1. Upload the file as attachment
      const url = await uploadProjectFile(file, "binui", project.id);
      await saveAttachmentAsync("binui", project.id, `הוראות_תוכנית_${file.name}`, url);
      qc.invalidateQueries({ queryKey: ["binui-projects"] });

      // 2. Send to AI for parsing
      toast.info("מנתח את הוראות התוכנית...");
      const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-plan-instructions", {
        body: { fileUrl: url, fileName: file.name },
      });

      if (fnError) throw fnError;
      if (!fnData?.success) throw new Error(fnData?.error || "Failed to parse");

      const parsed = fnData.data;

      // 3. Apply extracted data to project fields
      const newDetails = { ...(project.details || {}) };
      if (parsed.details) {
        for (const [section, fields] of Object.entries(parsed.details)) {
          const existing = newDetails[section] || {};
          const newFields = fields as Record<string, string>;
          for (const [key, val] of Object.entries(newFields)) {
            if (val && !existing[key]) {
              existing[key] = val;
            }
          }
          newDetails[section] = existing;
        }
      }

      // Build consultant_notes from parsed data
      const newConsultantNotes: Record<string, ConsultantNote> = { ...(project.consultant_notes || {}) };
      if (parsed.consultantNotes) {
        for (const [party, data] of Object.entries(parsed.consultantNotes)) {
          const noteData = data as { quote?: string; comment?: string } | string;
          if (typeof noteData === "string") {
            if (noteData) newConsultantNotes[party] = { quote: noteData, comment: newConsultantNotes[party]?.comment || "" };
          } else if (noteData?.quote) {
            newConsultantNotes[party] = { quote: noteData.quote, comment: newConsultantNotes[party]?.comment || "" };
          }
        }
      }

      // Also add history entries for consultant notes
      const newHistory = [...project.history];
      if (parsed.consultantNotes) {
        const dateStr = getHebrewDateNow();
        for (const [party, data] of Object.entries(parsed.consultantNotes)) {
          const noteData = data as { quote?: string } | string;
          const quote = typeof noteData === "string" ? noteData : noteData?.quote;
          if (quote) {
            newHistory.unshift({
              date: dateStr,
              note: `חוות דעת: [פורום יועצים - ${party}] ${quote.substring(0, 200)}... (מתוך הוראות תוכנית)`,
            });
          }
        }
      }

      const patchObj: Partial<BinuiProject> = { details: newDetails, history: newHistory, consultant_notes: newConsultantNotes };
      if (parsed.projectDescription && !project.note) {
        patchObj.note = parsed.projectDescription;
      }

      await update(patchObj);
      toast.success("הוראות התוכנית נותחו בהצלחה ושדות הפרויקט עודכנו!");
    } catch (err: any) {
      console.error("Plan parsing error:", err);
      toast.error(err.message || "שגיאה בניתוח הוראות התוכנית");
    } finally {
      setParsingPlan(false);
    }
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
              title="שליחת סיכום חוות דעת בדוא״ל"
              className="h-8 px-3 rounded-lg bg-white/15 text-xs text-white hover:bg-white/25 transition-colors backdrop-blur-sm flex flex-col items-center"
              onClick={() => setEmailOpen(true)}
            >
              <span>✉️ שלח חוות דעת</span>
              <span className="text-[9px] opacity-70">שליחת סיכום במייל</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="no-print mx-4 mt-3 flex items-center gap-3">
        <button
          title="חזור לדף הראשי של הדשבורד"
          className="h-14 px-10 rounded-xl text-white text-lg font-black hover:brightness-110 transition-all shadow-lg flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, #2C6E6A, #1E5E5A)" }}
          onClick={() => navigate("/")}
        >
          <span>🏠 דשבורד</span>
          <span className="text-[9px] font-normal opacity-70">חזרה לדף הראשי</span>
        </button>
        <button
          title="חזרה לדף הקודם שביקרת בו"
          className="h-12 px-6 rounded-xl border-2 border-gray-300 text-base font-bold text-gray-600 hover:bg-muted transition-colors flex flex-col items-center justify-center"
          onClick={() => navigate(-1 as any)}
        >
          <span>← חזור</span>
          <span className="text-[9px] font-normal text-gray-400">דף קודם</span>
        </button>
        <button
          title="מעבר לפרויקט הבא ברשימה"
          disabled={!nextProject}
          className="h-12 px-5 rounded-xl border border-border bg-card text-base font-medium disabled:opacity-30 hover:bg-muted transition-colors flex flex-col items-center justify-center"
          onClick={() => nextProject && navigate(`/binui/${nextProject.id}`)}
        >
          <span>קדימה &gt;</span>
          <span className="text-[9px] font-normal text-gray-400">פרויקט הבא</span>
        </button>
        <button
          title="מעבר לפרויקט הקודם ברשימה"
          disabled={!prevProject}
          className="h-12 px-5 rounded-xl border border-border bg-card text-base font-medium disabled:opacity-30 hover:bg-muted transition-colors flex flex-col items-center justify-center"
          onClick={() => prevProject && navigate(`/binui/${prevProject.id}`)}
        >
          <span>&lt; אחורה</span>
          <span className="text-[9px] font-normal text-gray-400">פרויקט קודם</span>
        </button>

        <div className="flex-1" />

        <button
          title="מחיקת הפרויקט לצמיתות — פעולה בלתי הפיכה"
          className="h-10 w-10 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center"
          onClick={async () => {
            if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${project.name}"? פעולה זו אינה הפיכה.`)) {
              try {
                await deleteMutation.mutateAsync(project.id);
                toast.success("הפרויקט נמחק");
                navigate("/binui");
              } catch {}
            }
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* All detail sections in one compact row */}
      <div className="mx-4 mt-4 mb-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
        {/* פרטים — 3 people columns */}
        {(() => {
          const section = "פרטים";
          const editing = editingSections[section];
          const vals = editing ? editValues[section] ?? {} : project.details?.[section] ?? {};
          const PEOPLE = [
            { title: "אדריכל", fields: [
              { key: "architect", label: "שם" },
              { key: "architect_phone", label: "נייד" },
              { key: "architect_email", label: 'דוא"ל' },
              { key: "architect_address", label: "כתובת" },
            ]},
            { title: "מנהל פרויקט", fields: [
              { key: "manager", label: "שם" },
              { key: "manager_phone", label: "נייד" },
              { key: "manager_email", label: 'דוא"ל' },
              { key: "manager_address", label: "כתובת" },
            ]},
            { title: "יזם", fields: [
              { key: "developer", label: "שם" },
              { key: "developer_phone", label: "נייד" },
              { key: "developer_email", label: 'דוא"ל' },
              { key: "developer_address", label: "כתובת" },
            ]},
          ];
          return (
            <div className="detail-card bg-card rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ background: "#FAFAF8" }}>
                <span className="text-xs font-semibold" style={{ color: "#2C6E6A" }}>פרטים</span>
                {editing ? (
                  <div className="flex gap-2">
                    <button title="שמור" className="text-[10px] text-white px-2 py-0.5 rounded" style={{ background: "#2C6E6A" }} onClick={() => saveSection(section)}>שמור</button>
                    <button title="ביטול" className="text-[10px] text-gray-500 hover:underline" onClick={() => cancelEdit(section)}>ביטול</button>
                  </div>
                ) : (
                  <button title="עריכה" className="text-[10px] hover:underline" style={{ color: "#2C6E6A" }} onClick={() => startEdit(section)}>עריכה</button>
                )}
              </div>
              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-100">
                {PEOPLE.map((person) => (
                  <div key={person.title} className="px-2.5 py-2 space-y-1">
                    <div className="text-[10px] font-bold" style={{ color: "#2C6E6A" }}>{person.title}</div>
                    {person.fields.map((f) => (
                      <div key={f.key} className="flex items-center gap-1 text-[11px]">
                        <span className="text-gray-400 whitespace-nowrap" style={{ minWidth: 32 }}>{f.label}</span>
                        {editing ? (
                          <input title={f.label} className="flex-1 h-5 rounded border border-gray-200 px-1 text-[11px]" style={{ direction: "rtl" }}
                            value={vals[f.key] ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, [section]: { ...(v[section] ?? {}), [f.key]: e.target.value } }))}
                          />
                        ) : (
                          <span className="truncate" style={{ color: vals[f.key] ? "#222" : "#ccc" }}>{vals[f.key] || "—"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="px-3 pb-2 flex items-center gap-1.5 text-[11px] border-t border-gray-100 pt-1.5">
                <span className="text-gray-400">יום</span>
                {editing ? (
                  <input title="יום" className="h-5 rounded border border-gray-200 px-1 text-[11px]" style={{ direction: "rtl" }}
                    value={vals["date"] ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, [section]: { ...(v[section] ?? {}), date: e.target.value } }))}
                  />
                ) : (
                  <span style={{ color: vals["date"] ? "#222" : "#ccc" }}>{vals["date"] || "—"}</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* מיקום + נתוני תב"ע compact */}
        {Object.entries(DETAIL_FIELDS).filter(([s]) => s !== "פרטים").map(([section, fields]) => {
          const editing = editingSections[section];
          const vals = editing ? editValues[section] ?? {} : project.details?.[section] ?? {};
          const isTaba = section === 'נתוני תב"ע';
          const planDetailVal = isTaba ? (vals["plan_detail"] || "") : "";
          return (
            <div key={section} className="detail-card bg-card rounded-xl shadow-sm overflow-hidden min-w-[180px]">
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ background: "#FAFAF8" }}>
                <span className="text-xs font-semibold" style={{ color: "#2C6E6A" }}>{section}</span>
                {editing ? (
                  <div className="flex gap-2">
                    <button title="שמור" className="text-[10px] text-white px-2 py-0.5 rounded" style={{ background: "#2C6E6A" }} onClick={() => saveSection(section)}>שמור</button>
                    <button title="ביטול" className="text-[10px] text-gray-500 hover:underline" onClick={() => cancelEdit(section)}>ביטול</button>
                  </div>
                ) : (
                  <button title="עריכה" className="text-[10px] hover:underline" style={{ color: "#2C6E6A" }} onClick={() => startEdit(section)}>עריכה</button>
                )}
              </div>
              {/* Show plan_detail (תוכנית בינוי) very large */}
              {isTaba && planDetailVal && !editing && (
                <div className="px-3 pt-3 pb-1 text-center">
                  <div className="text-3xl font-black" style={{ color: "#2C6E6A", letterSpacing: "0.05em" }}>
                    {planDetailVal}
                  </div>
                  <div className="text-[10px] text-muted-foreground">מספר תוכנית בינוי</div>
                </div>
              )}
              <div className="px-3 py-2 space-y-1.5">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-gray-400 whitespace-nowrap" style={{ minWidth: 80 }}>{f.label}</span>
                    {editing ? (
                      <input title={f.label} className="flex-1 h-5 rounded border border-gray-200 px-1 text-[11px]" style={{ direction: "rtl" }}
                        value={vals[f.key] ?? ""}
                        onChange={(e) => setEditValues((v) => ({ ...v, [section]: { ...(v[section] ?? {}), [f.key]: e.target.value } }))}
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

      {/* Main two-column grid */}
      <div className="detail-grid mx-4 mt-4 mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — תהליך ביקורת */}
        <div className="detail-column bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 text-xs font-bold" style={{ color: "#2C6E6A" }}>תהליך ביקורת</div>
          <div className="flex border-b">
            <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")}>היסטוריה</TabBtn>
            <TabBtn active={activeTab === "opinion"} onClick={() => setActiveTab("opinion")}>חוות דעת</TabBtn>
            <TabBtn active={activeTab === "protocol"} onClick={() => setActiveTab("protocol")}>טיוטת המלצה</TabBtn>
          </div>
          <div className="flex border-t-0 px-1 pb-1" style={{ background: "#F0F9F8" }}>
            <span className="flex-1 text-center text-[9px] text-muted-foreground">תיעוד כל פעולה שבוצעה</span>
            <span className="flex-1 text-center text-[9px] text-muted-foreground">ריכוז הערות עם תאריך</span>
            <span className="flex-1 text-center text-[9px] text-muted-foreground">סיכום מסודר של כל הנתונים</span>
          </div>
          <div className="p-4">
            {activeTab === "history" && (
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
                    title="הוסף רשומת היסטוריה חדשה לתיעוד פעולה שבוצעה"
                    className="h-8 w-8 rounded-lg text-white text-sm flex items-center justify-center"
                    style={{ background: "#2C6E6A" }}
                    onClick={addHistoryEntry}
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">תיעוד אוטומטי וידני של כל פעולה שנעשתה ברשומה זו</p>
                <div className="history-list space-y-2 max-h-[300px] overflow-y-auto">
                  {project.history.map((h, i) => (
                    <div key={i} className="flex gap-2 text-sm border-r-2 pr-3 py-1" style={{ borderColor: "#2C6E6A33" }}>
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{h.date}</span>
                      <span>{h.note}</span>
                    </div>
                  ))}
                  {project.history.length === 0 && <span className="text-xs text-muted-foreground">אין רשומות היסטוריה</span>}
                </div>
              </>
            )}

            {activeTab === "opinion" && (
              <>
                <div className="mb-3 space-y-2">
                  <div>
                    <label className="text-xs font-bold mb-1 block" style={{ color: "#2C6E6A" }}>תיאור הפרויקט</label>
                    <textarea
                      title="תיאור הפרויקט"
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-vertical mb-1"
                      style={{ direction: "rtl", minHeight: 180, background: "#F7F7F5" }}
                      placeholder="כתוב תיאור לפרויקט..."
                      value={localNote}
                      onChange={(e) => setLocalNote(e.target.value)}
                      onBlur={() => update({ note: localNote })}
                    />
                    <span className="text-[10px] text-muted-foreground block mb-2">תיאור זה יופיע גם במסמך המלצת הוועדה</span>
                  </div>

                  {/* Architect Forum */}
                  <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "#2C6E6A33", background: "#F7FBFA" }}>
                    <div className="text-xs font-bold" style={{ color: "#2C6E6A" }}>פורום אדריכלים</div>
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] text-muted-foreground whitespace-nowrap">תאריך:</label>
                      <input type="date" title="תאריך פורום אדריכלים" className="h-7 rounded border border-gray-200 px-2 text-xs"
                        value={forumInputs.architect?.date || ""}
                        onChange={(e) => setForumInputs((prev) => ({ ...prev, architect: { ...prev.architect, date: e.target.value } }))}
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <textarea title="הערה לפורום אדריכלים" className="flex-1 rounded-lg border border-gray-200 p-2 text-sm resize-none"
                        style={{ direction: "rtl", minHeight: 60, background: "#FAFAF8" }} placeholder="כתוב הערה לפורום אדריכלים..."
                        value={forumInputs.architect?.text || ""}
                        onChange={(e) => setForumInputs((prev) => ({ ...prev, architect: { ...prev.architect, text: e.target.value } }))}
                      />
                      <button title="הוסף הערה לפורום אדריכלים" className="h-7 px-3 rounded-lg text-white text-[10px] font-bold" style={{ background: "#2C6E6A" }}
                        onClick={() => {
                          const t = forumInputs.architect?.text?.trim();
                          if (!t) return;
                          const dateStr = forumInputs.architect?.date
                            ? new Date(forumInputs.architect.date).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })
                            : getHebrewDateNow();
                          update({ history: [{ date: dateStr, note: `חוות דעת: [פורום אדריכלים] ${t}` }, ...project.history] });
                          setForumInputs((prev) => ({ ...prev, architect: { date: "", text: "" } }));
                        }}
                      >+ הוסף</button>
                    </div>
                  </div>

                  {/* Consultant Forum - per party + extracted requirements */}
                  <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2C6E6A33", background: "#F7FBFA" }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs font-bold" style={{ color: "#2C6E6A" }}>פורום יועצים</div>
                      {Object.keys(project.consultant_notes || {}).length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border hover:opacity-80"
                            style={{ borderColor: "#B4530966", color: "#B45309", background: "#FEF3C7" }}
                            onClick={() => {
                              downloadConsultantRequirementsDocx({
                                projectName: project.name,
                                consultantNotes: project.consultant_notes || {},
                                parties: CONSULTANT_PARTIES,
                              });
                              toast.success("קובץ דרישות יועצים הורד בהצלחה");
                            }}
                          >
                            <Download className="w-3 h-3" /> ייצוא Word
                          </button>
                          <button
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border hover:opacity-80"
                            style={{ borderColor: "#2C6E6A66", color: "#2C6E6A", background: "#E0F2F1" }}
                            onClick={async () => {
                              try {
                                const blob = await generateConsultantRequirementsBlob({
                                  projectName: project.name,
                                  consultantNotes: project.consultant_notes || {},
                                  parties: CONSULTANT_PARTIES,
                                });
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const base64 = (reader.result as string).split(",")[1];
                                  setDraftAttachment({
                                    name: `דרישות_יועצים_${project.name.replace(/\s+/g, "_")}.docx`,
                                    base64,
                                  });
                                  setDraftEmailBody(`ריכוז דרישות יועצים — ${project.name}\n\nמצורף קובץ ריכוז דרישות היועצים מהוראות התוכנית.`);
                                  setEmailOpen(true);
                                };
                                reader.readAsDataURL(blob);
                              } catch {
                                toast.error("שגיאה ביצירת הקובץ");
                              }
                            }}
                          >
                            ✉️ שלח באימייל
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Summary badges */}
                    {(() => {
                      const notes = project.consultant_notes || {};
                      const total = CONSULTANT_PARTIES.filter(p => notes[p]?.quote).length;
                      const done = CONSULTANT_PARTIES.filter(p => notes[p]?.status === "done").length;
                      const notDone = CONSULTANT_PARTIES.filter(p => notes[p]?.status === "not_done").length;
                      const pending = total - done - notDone;
                      return total > 0 ? (
                        <div className="flex gap-2 text-[10px]">
                          {done > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "#DCFCE7", color: "#166534" }}>✓ {done} בוצע</span>}
                          {notDone > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#991B1B" }}>✗ {notDone} לא בוצע</span>}
                          {pending > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "#FEF3C7", color: "#92400E" }}>⏳ {pending} ממתין</span>}
                        </div>
                      ) : null;
                    })()}
                    {/* Filter buttons */}
                    {Object.keys(project.consultant_notes || {}).length > 0 && (
                      <>
                        <div className="flex gap-1 text-[10px]">
                          {([["all", "הכל", "#6B7280", "#F3F4F6"], ["not_done", "לא בוצע", "#991B1B", "#FEE2E2"], ["pending", "ממתין", "#92400E", "#FEF3C7"], ["done", "בוצע", "#166534", "#DCFCE7"]] as const).map(([val, label, color, bg]) => (
                            <button
                              key={val}
                              className="px-2 py-0.5 rounded border font-bold transition-all"
                              style={{
                                borderColor: consultantFilter === val ? color : "#D1D5DB",
                                color: consultantFilter === val ? "#FFF" : color,
                                background: consultantFilter === val ? color : bg,
                              }}
                              onClick={() => setConsultantFilter(val)}
                            >{label}</button>
                          ))}
                        </div>
                        {consultantFilter !== "all" && (() => {
                          const notes = project.consultant_notes || {};
                          const total = CONSULTANT_PARTIES.filter(p => notes[p]?.quote).length;
                          const shown = CONSULTANT_PARTIES.filter(p => {
                            const cn = notes[p];
                            if (!cn?.quote) return false;
                            return (cn.status || "pending") === consultantFilter;
                          }).length;
                          return total > 0 ? (
                            <div className="text-[10px] text-muted-foreground">מציג {shown} מתוך {total} דרישות</div>
                          ) : null;
                        })()}
                      </>
                    )}
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] text-muted-foreground whitespace-nowrap">תאריך:</label>
                      <input type="date" title="תאריך פורום יועצים" className="h-7 rounded border border-gray-200 px-2 text-xs"
                        value={consultantDate}
                        onChange={(e) => setConsultantDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {CONSULTANT_PARTIES.map((party) => {
                        const cn = (project.consultant_notes || {})[party];
                        const hasExtracted = !!cn?.quote;
                        const status = cn?.status || "pending";
                        if (consultantFilter !== "all" && hasExtracted && status !== consultantFilter) return null;
                        const statusBg = hasExtracted ? (status === "done" ? "#F0FDF4" : status === "not_done" ? "#FEF2F2" : "#FEFDF8") : "#FEFEFE";
                        const statusBorder = hasExtracted ? (status === "done" ? "#BBF7D0" : status === "not_done" ? "#FECACA" : "#FDE68A") : undefined;
                        return (
                          <div key={party} className="rounded border border-gray-100 p-2 space-y-1.5" style={{ background: statusBg, borderColor: statusBorder }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold whitespace-nowrap min-w-[60px]" style={{ color: "#2C6E6A" }}>{party}</span>
                                {hasExtracted && status === "done" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#DCFCE7", color: "#166534" }}>✓ בוצע</span>}
                                {hasExtracted && status === "not_done" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#991B1B" }}>✗ לא בוצע</span>}
                                {hasExtracted && status === "pending" && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#FEF3C7", color: "#92400E" }}>ממתין</span>}
                              </div>
                              {hasExtracted && (
                                <div className="flex gap-1">
                                  {status !== "done" && (
                                    <button title="סמן כבוצע" className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-green-50 transition-colors" style={{ borderColor: "#10B98166", color: "#10B981" }}
                                      onClick={() => { const newNotes = { ...(project.consultant_notes || {}) }; newNotes[party] = { ...newNotes[party], status: "done" }; update({ consultant_notes: newNotes }); }}
                                    >✓ בוצע</button>
                                  )}
                                  {status !== "not_done" && (
                                    <button title="סמן כלא בוצע" className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-red-50 transition-colors" style={{ borderColor: "#EF444466", color: "#EF4444" }}
                                      onClick={() => { const newNotes = { ...(project.consultant_notes || {}) }; newNotes[party] = { ...newNotes[party], status: "not_done" }; update({ consultant_notes: newNotes }); }}
                                    >✗ לא בוצע</button>
                                  )}
                                  {status !== "pending" && (
                                    <button title="אפס סטטוס" className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-gray-100 transition-colors" style={{ borderColor: "#9CA3AF66", color: "#6B7280" }}
                                      onClick={() => { const newNotes = { ...(project.consultant_notes || {}) }; newNotes[party] = { ...newNotes[party], status: "pending" }; update({ consultant_notes: newNotes }); }}
                                    >↩ ביטול</button>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Extracted requirements with checkboxes */}
                            {hasExtracted && (
                              <div className="text-xs text-gray-700 leading-relaxed max-h-[200px] overflow-y-auto space-y-0.5" style={{ background: "#FFF", borderRadius: 6, padding: 8, border: "1px solid #F3E8D0", opacity: status === "done" ? 0.7 : 1 }}>
                                {cn.quote.split("\n").filter(l => l.trim()).map((line, idx) => {
                                  const checked = (cn.checkedLines || []).includes(idx);
                                  return (
                                    <label key={idx} className="flex items-start gap-2 cursor-pointer py-0.5 rounded hover:bg-gray-50 px-1" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>
                                      <input type="checkbox" className="mt-0.5 accent-emerald-600 shrink-0" checked={checked}
                                        onChange={() => {
                                          const newNotes = { ...(project.consultant_notes || {}) };
                                          const prev = newNotes[party]?.checkedLines || [];
                                          const next = checked ? prev.filter(i => i !== idx) : [...prev, idx];
                                          newNotes[party] = { ...newNotes[party], checkedLines: next };
                                          update({ consultant_notes: newNotes });
                                        }}
                                      />
                                      <span>{line}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {/* Comment / new input */}
                            <div className="flex gap-2 items-end">
                              <textarea
                                title={`הערה - ${party}`}
                                className="flex-1 rounded border border-gray-200 p-1.5 text-xs resize-none"
                                style={{ direction: "rtl", minHeight: 36, background: "#FAFAF8" }}
                                placeholder={hasExtracted ? `הוסף הערה ל${party}...` : `הערה עבור ${party}...`}
                                value={hasExtracted ? (cn?.comment || "") : (consultantInputs[party]?.text || "")}
                                onChange={(e) => {
                                  if (hasExtracted) {
                                    const newNotes = { ...(project.consultant_notes || {}) };
                                    newNotes[party] = { ...newNotes[party], comment: e.target.value };
                                    update({ consultant_notes: newNotes });
                                  } else {
                                    setConsultantInputs((prev) => ({ ...prev, [party]: { ...prev[party], text: e.target.value } }));
                                  }
                                }}
                              />
                              {!hasExtracted && (
                                <button title={`הוסף הערה - ${party}`} className="h-6 px-2 rounded text-white text-[10px] font-bold" style={{ background: "#2C6E6A" }}
                                  onClick={() => {
                                    const t = consultantInputs[party]?.text?.trim();
                                    if (!t) return;
                                    const dateStr = consultantDate
                                      ? new Date(consultantDate).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })
                                      : getHebrewDateNow();
                                    update({ history: [{ date: dateStr, note: `חוות דעת: [פורום יועצים - ${party}] ${t}` }, ...project.history] });
                                    setConsultantInputs((prev) => ({ ...prev, [party]: { date: "", text: "" } }));
                                  }}
                                >+</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>


                  {/* Committee Preparation Forum - checkboxes + date */}
                  <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2C6E6A33", background: "#F7FBFA" }}>
                    <div className="text-xs font-bold" style={{ color: "#2C6E6A" }}>פורום הכנה לוועדה</div>
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] text-muted-foreground whitespace-nowrap">תאריך הכנה:</label>
                      <input type="date" title="תאריך הכנה לוועדה" className="h-7 rounded border border-gray-200 px-2 text-xs"
                        value={forumInputs.committee?.date || ""}
                        onChange={(e) => setForumInputs((prev) => ({ ...prev, committee: { ...prev.committee, date: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-[#2C6E6A]"
                          checked={committeeChecks.printedPlan}
                          onChange={(e) => setCommitteeChecks((prev) => ({ ...prev, printedPlan: e.target.checked }))}
                        />
                        <span>התקבלה תוכנית מודפסת</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-[#2C6E6A]"
                          checked={committeeChecks.digitalPlan}
                          onChange={(e) => setCommitteeChecks((prev) => ({ ...prev, digitalPlan: e.target.checked }))}
                        />
                        <span>התקבלה תוכנית דיגיטלית</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-[#2C6E6A]"
                          checked={committeeChecks.finalDraft}
                          onChange={(e) => setCommitteeChecks((prev) => ({ ...prev, finalDraft: e.target.checked }))}
                        />
                        <span>טיוטת המלצה סופית לוועדה</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <textarea
                      title="הערה חדשה"
                      className="flex-1 rounded-lg border border-gray-200 p-3 text-sm resize-none"
                      style={{ direction: "rtl", minHeight: 80, background: "#FAFAF8" }}
                      placeholder="כתוב הערה..."
                      value={opinionInput}
                      onChange={(e) => setOpinionInput(e.target.value)}
                    />
                  </div>
                   <button
                    title="הוסף הערה חדשה עם תאריך — תתווסף לריכוז ההערות"
                    className="h-8 px-4 rounded-lg text-white text-xs font-bold"
                    style={{ background: "#2C6E6A" }}
                    onClick={() => {
                      const t = opinionInput.trim();
                      if (!t) return;
                      update({
                        history: [{ date: getHebrewDateNow(), note: `חוות דעת: ${t}` }, ...project.history],
                      });
                      setOpinionInput("");
                    }}
                  >
                    הוסף הערה
                  </button>
                  <span className="text-[10px] text-muted-foreground">כתוב הערה — תישמר עם תאריך ותוצג בריכוז ההערות</span>
                </div>
                <div className="text-xs font-semibold mb-2" style={{ color: "#2C6E6A" }}>הערות קודמות</div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {project.history.filter((h) => h.note.startsWith("חוות דעת:")).map((h, i) => {
                    const isDone = h.note.endsWith("[בוצע]");
                    const isNotDone = h.note.endsWith("[לא בוצע]");
                    const hasStatus = isDone || isNotDone;
                    const text = h.note.replace(/^חוות דעת:\s*/, "").replace(/\s*\[(בוצע|לא בוצע|מאושר)\]$/, "");
                    return (
                      <div key={i} className="rounded-lg border border-gray-100 p-3 text-sm flex items-start gap-3" style={{ background: isDone ? "#F0FDF4" : isNotDone ? "#FEF2F2" : "#FAFAF8" }}>
                        <div className="flex-1">
                          <div className="text-xs text-gray-400 font-mono mb-1">{h.date}</div>
                          <div style={{ textDecoration: isDone ? "line-through" : "none", color: hasStatus ? "#999" : "inherit" }}>
                            {text}
                            {isDone && <span className="mr-2 text-xs text-green-600 font-bold">[בוצע]</span>}
                            {isNotDone && <span className="mr-2 text-xs text-red-500 font-bold">[לא בוצע]</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!hasStatus && (
                            <>
                              <button
                                title="סמן כבוצע"
                                className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-green-50 transition-colors"
                                style={{ borderColor: "#10B98166", color: "#10B981" }}
                                onClick={() => {
                                  const newHistory = project.history.map((entry) =>
                                    entry === h ? { ...entry, note: `${entry.note} [בוצע]` } : entry
                                  );
                                  update({ history: newHistory });
                                }}
                              >
                                ✓ בוצע
                              </button>
                              <button
                                title="סמן כלא בוצע"
                                className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-red-50 transition-colors"
                                style={{ borderColor: "#EF444466", color: "#EF4444" }}
                                onClick={() => {
                                  const newHistory = project.history.map((entry) =>
                                    entry === h ? { ...entry, note: `${entry.note} [לא בוצע]` } : entry
                                  );
                                  update({ history: newHistory });
                                }}
                              >
                                ✗ לא בוצע
                              </button>
                            </>
                          )}
                          {hasStatus && (
                            <button
                              title="בטל סימון"
                              className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-gray-100 transition-colors"
                              style={{ borderColor: "#9CA3AF66", color: "#6B7280" }}
                              onClick={() => {
                                const newHistory = project.history.map((entry) =>
                                  entry === h ? { ...entry, note: entry.note.replace(/\s*\[(בוצע|לא בוצע)\]$/, "") } : entry
                                );
                                update({ history: newHistory });
                              }}
                            >
                              ↩ ביטול
                            </button>
                          )}
                          <button
                            title="מחק הערה"
                            className="h-6 px-2 rounded border text-[10px] font-bold hover:bg-red-50 transition-colors"
                            style={{ borderColor: "#EF444433", color: "#EF4444" }}
                            onClick={() => {
                              if (!confirm("למחוק את ההערה?")) return;
                              const newHistory = project.history.filter((entry) => entry !== h);
                              update({ history: newHistory });
                            }}
                          >
                            🗑 מחק
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {project.history.filter((h) => h.note.startsWith("חוות דעת:")).length === 0 && (
                    <span className="text-xs text-muted-foreground">אין חוות דעת קודמות</span>
                  )}
                </div>
              </>
            )}

            {activeTab === "protocol" && (
              <>
                <div className="rounded-lg border border-gray-200 p-4 text-sm space-y-3" style={{ background: "#FAFAF8", direction: "rtl" }}>
                  <div className="text-center font-bold text-base mb-2" style={{ color: "#2C6E6A" }}>טיוטת המלצה — {project.name}</div>
                  <div className="border-b pb-2">
                    <span className="font-semibold">קטגוריה:</span> {project.category} › {project.sub}
                  </div>
                  <div className="border-b pb-2">
                    <span className="font-semibold">סטטוס:</span> {STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status}
                  </div>
                  <div className="border-b pb-2">
                    <span className="font-semibold">תאריך יצירה:</span> {project.created}
                  </div>
                  {Object.entries(DETAIL_FIELDS).map(([section, fields]) => {
                    const vals = project.details?.[section] ?? {};
                    const hasValues = fields.some((f) => vals[f.key]);
                    if (!hasValues) return null;
                    return (
                      <div key={section} className="border-b pb-2">
                        <div className="font-semibold mb-1">{section}:</div>
                        {fields.map((f) => vals[f.key] ? (
                          <div key={f.key} className="mr-4 text-gray-700">{f.label}: {vals[f.key]}</div>
                        ) : null)}
                      </div>
                    );
                  })}
                  {project.note && (
                    <div className="border-b pb-2">
                      <span className="font-semibold">תיאור הפרויקט:</span>
                      <div className="mr-4 text-gray-700 whitespace-pre-wrap mt-1">{project.note}</div>
                    </div>
                  )}
                  {project.history.filter((h) => h.note.startsWith("חוות דעת:") && h.note.endsWith("[לא בוצע]")).length > 0 && (
                    <div className="border-b pb-2">
                      <div className="font-semibold mb-1">ריכוז הערות:</div>
                      {project.history.filter((h) => h.note.startsWith("חוות דעת:") && h.note.endsWith("[לא בוצע]")).map((h, i) => (
                        <div key={i} className="mr-4 text-gray-700 mb-1">
                          <span className="text-xs text-gray-400">{h.date}</span> — {h.note.replace(/^חוות דעת:\s*/, "").replace(/\s*\[לא בוצע\]$/, "")}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2">
                    <div className="font-semibold mb-1">המלצה סופית:</div>
                    <textarea
                      title="המלצה סופית"
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none"
                      style={{ minHeight: 80 }}
                      placeholder="כתוב המלצה סופית..."
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        title="שמירת ההמלצה הסופית — תצורף לתחתית הערות הפרויקט"
                        className="h-8 px-4 rounded-lg text-white text-xs font-bold"
                        style={{ background: "#2C6E6A" }}
                        onClick={() => {
                          update({ history: [{ date: getHebrewDateNow(), note: `המלצה סופית: ${recommendation}` }, ...project.history] });
                          toast.success("ההמלצה נשמרה");
                        }}
                      >
                        שמור המלצה
                      </button>
                      <button
                        title="הורד והפק קובץ Word של טיוטת ההמלצה ושלח במייל"
                        className="h-8 px-4 rounded-lg text-white text-xs font-bold"
                        style={{ background: "#3A7D6F" }}
                        onClick={async () => {
                          const sl = STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status;
                          const notDone = project.history
                            .filter((h) => h.note.startsWith("חוות דעת:") && h.note.endsWith("[לא בוצע]"))
                            .map((h) => ({
                              date: h.date,
                              text: h.note.replace(/^חוות דעת:\s*/, "").replace(/\s*\[לא בוצע\]$/, ""),
                            }));

                          const docxParams = {
                              projectName: project.name,
                              category: project.category,
                              sub: project.sub,
                              statusLabel: sl,
                              created: project.created,
                              details: project.details ?? {},
                              detailFields: DETAIL_FIELDS,
                              note: project.note || "",
                              notDoneComments: notDone,
                              recommendation: recommendation || "",
                            };

                          try {
                            // Generate blob, download, and convert to base64
                            const blob = await downloadDraftDocx(docxParams);
                            
                            // Convert blob to base64 for email attachment
                            const reader = new FileReader();
                            const base64Promise = new Promise<string>((resolve) => {
                              reader.onload = () => {
                                const result = reader.result as string;
                                resolve(result.split(",")[1]); // strip data:... prefix
                              };
                              reader.readAsDataURL(blob);
                            });
                            const base64 = await base64Promise;
                            
                            setDraftAttachment({
                              name: `טיוטת_המלצה_${project.name.replace(/\s+/g, "_")}.docx`,
                              base64,
                            });
                            
                            toast.success("קובץ Word הורד בהצלחה");
                          } catch (err) {
                            toast.error("שגיאה ביצירת קובץ Word");
                            setDraftAttachment(null);
                          }

                          // Also open email with text body
                          const lines: string[] = [];
                          lines.push(`טיוטת המלצה — ${project.name}`);
                          lines.push(`קטגוריה: ${project.category} › ${project.sub}`);
                          lines.push(`סטטוס: ${sl}`);
                          lines.push(`תאריך יצירה: ${project.created}`);
                          if (project.note) lines.push(`\nתיאור הפרויקט:\n${project.note}`);
                          if (notDone.length) {
                            lines.push(`\nריכוז הערות:`);
                            notDone.forEach((c) => lines.push(`  ${c.date} — ${c.text}`));
                          }
                          if (recommendation) lines.push(`\nהמלצה סופית:\n${recommendation}`);
                          setDraftEmailBody(lines.join("\n"));
                          setEmailOpen(true);
                        }}
                      >
                        📧 שלח טיוטת המלצה
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 block">ההמלצה תצורף לתחתית מסמך ההערות של הפרויקט</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — video/pres + images */}
        <div className="detail-column space-y-4">
          {/* Presentation / Development Plan */}
          <PresentationDevPlanTabs project={project} onUpload={addAttachment} onMinutesUpload={async (file: File) => {
            if (file.size > MAX_FILE_SIZE_BYTES) { toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB."); return; }
            try {
              const url = await uploadProjectFile(file, "binui", project.id);
              await saveAttachmentAsync("binui", project.id, `פרוטוקול ועדה - ${file.name}`, url);
              qc.invalidateQueries({ queryKey: ["binui-projects"] });
              const label = STATUS_OPTIONS.find((s) => s.value === "done")?.label ?? "בוצע";
              await update({
                status: "done",
                history: [{ date: getHebrewDateNow(), note: `פרוטוקול ועדה הועלה. סטטוס שונה ל: ${label}` }, ...project.history],
              });
              toast.success("פרוטוקול ועדה הועלה והסטטוס עודכן לבוצע");
            } catch (err: any) { toast.error(err.message || "שגיאה בהעלאת קובץ"); }
          }} />

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

            {/* Plan Instructions special upload */}
            <div className="mb-3 rounded-lg border-2 border-dashed p-3 flex items-center gap-3" style={{ borderColor: "#F59E0B66", background: "#FFFBEB" }}>
              <BookOpen size={20} style={{ color: "#F59E0B" }} />
              <div className="flex-1">
                <div className="text-xs font-bold" style={{ color: "#B45309" }}>הוראות תוכנית</div>
                <div className="text-[10px] text-amber-700">העלה מסמך הוראות תוכנית — המערכת תנתח ותמלא שדות רלוונטיים אוטומטית</div>
              </div>
              <input
                ref={planFileRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*,.docx,.doc"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePlanInstructions(f);
                  e.target.value = "";
                }}
              />
              <button
                title="העלה הוראות תוכנית לניתוח אוטומטי"
                disabled={parsingPlan}
                className="h-9 px-4 rounded-lg text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: "#F59E0B" }}
                onClick={() => planFileRef.current?.click()}
              >
                {parsingPlan ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    מנתח...
                  </>
                ) : (
                  <>📄 העלה הוראות תוכנית</>
                )}
              </button>
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
                if (ft === "pdf") return <PdfPreview url={att.data} />;
                return <DocPreview url={att.data} name={att.name} />;
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
            onClose={() => { setEmailOpen(false); setDraftEmailBody(null); setDraftAttachment(null); }}
            subject={draftEmailBody ? `טיוטת המלצה: ${project.name}` : `חוות דעת: ${project.name}`}
            body={draftEmailBody || `שם פרויקט: ${project.name}\nקטגוריה: ${project.category} › ${project.sub}\nסטטוס: ${statusLabel}\nתאריך: ${project.created}\n\nהערות:\n${project.note || ""}\n\nפרטים:\nאדריכל: ${details.architect || "—"}\nמנהל פרויקט: ${details.manager || "—"}\nמיקום: ${location.city || ""} ${location.quarter || ""} ${location.street || ""}`}
            domainColor="#2C6E6A"
            attachment={draftAttachment || undefined}
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

/** Inline PDF preview – downloads blob and embeds in iframe */
function PdfPreview({ url }: { url: string }) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    // Extract bucket/path and download as blob to avoid Chrome blocking
    const STORAGE_RE = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;
    const match = url.match(STORAGE_RE);

    if (match) {
      const bucket = decodeURIComponent(match[1]);
      const path = decodeURIComponent(match[2]);
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.storage.from(bucket).download(path).then(({ data, error: dlErr }) => {
          if (cancelled) return;
          if (dlErr || !data) { setError(true); setLoading(false); return; }
          const bu = URL.createObjectURL(data);
          setBlobUrl(bu);
          setLoading(false);
        });
      });
    } else {
      // Non-storage URL, use directly
      setBlobUrl(url);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      // Cleanup blob URL on unmount
    };
  }, [url]);

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 size={32} className="animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground mt-2">טוען תצוגה מקדימה…</span>
    </div>
  );

  if (error || !blobUrl) return (
    <div className="flex flex-col items-center justify-center p-12">
      <FileText size={48} className="text-red-400 mb-4" />
      <button
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
        onClick={() => void openFileInNewTab(url)}
      >
        פתח PDF בלשונית חדשה
      </button>
    </div>
  );

  return (
    <iframe
      src={blobUrl}
      title="PDF preview"
      className="w-full border-0"
      style={{ height: "calc(90vh - 48px)", minHeight: 400 }}
    />
  );
}

/** Preview for non-image/video/pdf documents – offer download */
function DocPreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileSpreadsheet size={40} className="text-blue-400" />
      <span className="text-sm text-muted-foreground mt-3">{name}</span>
      <button
        className="mt-4 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
        onClick={() => dlFile(url, name)}
      >
        הורד קובץ
      </button>
    </div>
  );
}

export default BinuiProjectDetail;
