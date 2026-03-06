import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import { Trash2 } from "lucide-react";
import {
  DomainConfig,
  GenericProject,
  STATUS_OPTIONS,
  getHebrewDateNow,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/domainConstants";
import { toast } from "sonner";
import { useGenericProjects, useSaveGenericProject, useDeleteGenericProject } from "@/hooks/use-generic-projects";
import { uploadProjectFile } from "@/lib/fileStorage";

interface Props {
  config: DomainConfig;
}

const GenericDomainDetail: React.FC<Props> = ({ config }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useGenericProjects(config.storageKey);
  const saveMutation = useSaveGenericProject(config.storageKey);
  const deleteMutation = useDeleteGenericProject(config.storageKey);

  const projectIdx = projects.findIndex((p) => String(p.id) === id);
  const project = projects[projectIdx];

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [historyInput, setHistoryInput] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);

  const update = async (patch: Partial<GenericProject>) => {
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
      <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
        <TopNav />
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🚫</div>
          <div>פרויקט לא נמצא</div>
          <button title="חזור לרשימה" className="mt-4 px-4 py-2 rounded-lg text-white text-sm" style={{ background: config.color }} onClick={() => navigate(`/${config.routeBase}`)}>חזור לרשימה</button>
        </div>
      </div>
    );
  }

  const changeStatus = (status: string) => {
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    update({ status: status as any, history: [{ date: getHebrewDateNow(), note: `סטטוס שונה ל: ${label}` }, ...project.history] });
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

  const handleImage = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) { toast.error("הקובץ גדול מדי. גודל מרבי מותר: 20MB."); return; }
    try {
      const url = await uploadProjectFile(file, "generic", project.id);
      await update({ image: url });
    } catch (err: any) { toast.error(err.message || "שגיאה בהעלאת תמונה"); }
  };

  const prevProject = projectIdx > 0 ? projects[projectIdx - 1] : null;
  const nextProject = projectIdx < projects.length - 1 ? projects[projectIdx + 1] : null;

  return (
    <div className="min-h-screen" style={{ background: "#F2F1EE", direction: "rtl" }}>
      <TopNav />
      <PrintHeader />
      <div className="breadcrumb px-6 py-3 text-sm flex gap-1 items-center" style={{ color: "#888" }}>
        <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
        <span>←</span>
        <span className="cursor-pointer hover:underline" onClick={() => navigate(`/${config.routeBase}`)}>{config.domainName}</span>
        <span>←</span>
        <span style={{ color: config.color, fontWeight: 600 }}>{project.name}</span>
      </div>
      <div className="no-print mx-6 mb-4 flex items-center gap-3">
        <button title="חזור לדשבורד" className="h-14 px-10 rounded-xl text-white text-lg font-black hover:brightness-110 transition-all shadow-lg flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}DD)` }} onClick={() => navigate("/")}>🏠 דשבורד</button>
        <button title="חזור אחורה" className="h-12 px-6 rounded-xl border-2 border-gray-300 text-base font-bold text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => navigate(-1 as any)}>← חזור</button>
        <button title="קדימה" disabled={!nextProject} className="h-12 px-5 rounded-xl border border-gray-200 text-base font-medium disabled:opacity-30 hover:bg-gray-50 transition-colors" onClick={() => nextProject && navigate(`/${config.routeBase}/${nextProject.id}`)}>קדימה &gt;</button>
        <button title="אחורה" disabled={!prevProject} className="h-12 px-5 rounded-xl border border-gray-200 text-base font-medium disabled:opacity-30 hover:bg-gray-50 transition-colors" onClick={() => prevProject && navigate(`/${config.routeBase}/${prevProject.id}`)}>&lt; אחורה</button>
        <div className="flex-1" />
        <select title="שנה סטטוס" className="h-8 rounded-lg border text-xs px-2" style={{ direction: "rtl", color: STATUS_OPTIONS.find((s) => s.value === project.status)?.color, background: STATUS_OPTIONS.find((s) => s.value === project.status)?.bg, borderColor: (STATUS_OPTIONS.find((s) => s.value === project.status)?.color ?? "") + "44" }} value={project.status} onChange={(e) => changeStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
        <button title="שלח חוות דעת במייל" className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs hover:bg-gray-50 transition-colors" onClick={() => setEmailOpen(true)}>✉️ שלח חוות דעת</button>
        <button title="מחק פרויקט" className="h-10 w-10 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center" onClick={async () => {
          if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${project.name}"? פעולה זו אינה הפיכה.`)) {
            try { await deleteMutation.mutateAsync(project.id); toast.success("הפרויקט נמחק"); navigate(`/${config.routeBase}`); } catch {}
          }
        }}><Trash2 size={18} /></button>
      </div>
      <div className="mx-6 mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 500 }}>
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="text-lg font-extrabold mb-2" style={{ color: config.color }}>פוסט</div>
          <textarea title="פוסט" className="flex-1 w-full rounded-xl border-2 border-gray-200 p-5 text-xl font-semibold resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 420, background: "#FAFAF8" }} placeholder="כתוב פוסט, תיאור, הערות..." value={project.description} onChange={(e) => update({ description: e.target.value })} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: config.color }}>שם הפרויקט</div>
            {editingName ? (
              <div className="flex flex-col gap-2">
                <input title="שם פרויקט" className="h-12 rounded-lg border border-gray-300 px-4 text-xl font-extrabold w-full" style={{ direction: "rtl" }} value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} autoFocus />
                <div className="flex gap-2">
                  <button title="שמור" className="text-sm text-white px-4 h-9 rounded-lg flex-1" style={{ background: config.color }} onClick={saveName}>שמור</button>
                  <button title="ביטול" className="text-sm text-gray-500 hover:underline" onClick={() => setEditingName(false)}>ביטול</button>
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-extrabold cursor-pointer hover:underline leading-tight" style={{ color: config.color }} title="לחץ לעריכת שם" onClick={() => { setEditingName(true); setTempName(project.name); }}>{project.name}</h1>
            )}
          </div>
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: config.color }}>שם פואטי</div>
            <input title="שם פואטי" className="h-11 w-full rounded-lg border-2 border-gray-200 px-4 text-lg font-bold italic text-center" style={{ direction: "rtl", background: config.color + "0A" }} placeholder="שם פואטי לפרויקט..." value={project.poeticName} onChange={(e) => update({ poeticName: e.target.value })} />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="text-sm font-bold mb-1" style={{ color: config.color }}>שיר / רעיון</div>
            <textarea title="שיר / רעיון" className="flex-1 w-full rounded-xl border-2 border-gray-200 p-4 text-3xl font-black italic text-center resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 180, background: config.color + "08" }} placeholder="הייקו / רעיון / שיר..." value={project.poem} onChange={(e) => update({ poem: e.target.value })} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <div className="text-sm font-bold mb-2" style={{ color: config.color }}>תמונה</div>
          <FileDropZone onFile={(f) => handleImage(f)} onDelete={() => update({ image: null })} currentSrc={project.image} label="תמונה" className="flex-1 min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 overflow-hidden" />
        </div>
      </div>
      <div className="mx-6 mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ minHeight: 360 }}>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <div className="text-lg font-bold mb-2" style={{ color: config.color }}>תיאור קצר</div>
          <textarea title="תיאור הפרויקט" className="flex-1 w-full rounded-xl border border-gray-200 p-4 text-lg font-semibold resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 160, background: "#FAFAF8" }} placeholder="תיאור קצר..." value={project.note} onChange={(e) => update({ note: e.target.value })} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col lg:col-span-1">
          <div className="text-lg font-bold mb-2" style={{ color: config.color }}>מסמך (חוות דעת)</div>
          <textarea title="מסמך" className="flex-1 w-full rounded-xl border border-gray-200 p-4 text-base resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 320, background: "#FAFAF8" }} placeholder="כתוב מסמך מפורט, חוות דעת..." value={project.document} onChange={(e) => update({ document: e.target.value })} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <div className="text-base font-bold mb-2" style={{ color: config.color }}>היסטוריה</div>
          <div className="flex gap-2 mb-3">
            <input title="הוסף רשומה" className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-base" style={{ direction: "rtl" }} placeholder="הוסף רשומה..." value={historyInput} onChange={(e) => setHistoryInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHistoryEntry()} />
            <button title="הוסף" className="h-9 w-9 rounded-lg text-white text-base flex items-center justify-center" style={{ background: config.color }} onClick={addHistoryEntry}>+</button>
          </div>
          <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto">
            {project.history.map((h, i) => (
              <div key={i} className="flex gap-2 text-sm border-r-2 pr-3 py-1.5" style={{ borderColor: config.color + "33" }}>
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{h.date}</span>
                <span className="text-base">{h.note}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="text-base font-bold mb-3" style={{ color: config.color }}>מעקב</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base"><span className="text-gray-400 font-medium" style={{ minWidth: 55 }}>סטטוס</span>
              <select title="סטטוס" className="h-9 rounded-lg border text-sm px-2 flex-1" style={{ direction: "rtl" }} value={project.status} onChange={(e) => changeStatus(e.target.value)}>{STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}</select>
            </div>
            <div className="flex items-center gap-2 text-base"><span className="text-gray-400 font-medium" style={{ minWidth: 55 }}>תאריך</span>
              <input title="תאריך מעקב" type="date" className="h-9 rounded-lg border border-gray-200 px-3 text-sm flex-1" value={project.tracking.date} onChange={(e) => update({ tracking: { ...project.tracking, date: e.target.value } })} />
            </div>
            <div className="flex items-center gap-2 text-base"><span className="text-gray-400 font-medium" style={{ minWidth: 55 }}>הערה</span>
              <input title="הערת מעקב" className="h-9 rounded-lg border border-gray-200 px-3 text-sm flex-1" style={{ direction: "rtl" }} value={project.tracking.note} onChange={(e) => update({ tracking: { ...project.tracking, note: e.target.value } })} />
            </div>
            <div className="flex items-center gap-2 text-base"><span className="text-gray-400 font-medium" style={{ minWidth: 55 }}>גורם</span>
              <input title="גורם אחראי" className="h-9 rounded-lg border border-gray-200 px-3 text-sm flex-1" style={{ direction: "rtl" }} value={project.tracking.agent} onChange={(e) => update({ tracking: { ...project.tracking, agent: e.target.value } })} />
            </div>
            <div className="flex items-center gap-2 text-base"><span className="text-gray-400 font-medium" style={{ minWidth: 55 }}>ביצוע!</span>
              <input title="יוזם" className="h-9 rounded-lg border border-gray-200 px-3 text-sm flex-1" style={{ direction: "rtl" }} placeholder="ראש העיר / מנכ״ל / מאן דהוא" value={project.initiator} onChange={(e) => update({ initiator: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
      {project && (() => {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status;
        return (<EmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} subject={`חוות דעת: ${project.name}`} body={`שם פרויקט: ${project.name}\nקטגוריה: ${project.category}${project.sub !== project.category ? ` › ${project.sub}` : ""}\nסטטוס: ${statusLabel}\nתאריך: ${project.created}\n\nהערות:\n${project.note || ""}`} domainColor={config.color} />);
      })()}
    </div>
  );
};

export default GenericDomainDetail;
