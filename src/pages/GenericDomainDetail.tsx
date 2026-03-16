import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import { TasksManager, TaskItem } from "@/components/TasksManager";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { RecordLinks, LinkEntry } from "@/components/RecordLinks";
import { Trash2 } from "lucide-react";
import { openExternalLink } from "@/lib/fileAccess";
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
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

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
        <span className="text-xs text-gray-400">{project.created}</span>
        <button title="שלח חוות דעת במייל" className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs hover:bg-gray-50 transition-colors" onClick={() => setEmailOpen(true)}>✉️ שלח חוות דעת</button>
        <button title="מחק פרויקט" className="h-10 w-10 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center" onClick={async () => {
          if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${project.name}"? פעולה זו אינה הפיכה.`)) {
            try { await deleteMutation.mutateAsync(project.id); toast.success("הפרויקט נמחק"); navigate(`/${config.routeBase}`); } catch {}
          }
        }}><Trash2 size={18} /></button>
      </div>
      {/* [DESIGN: typography] Phase 1 — Idea Phase */}
      <div className="mx-6 mb-1 mt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-[3px] flex-1 rounded-full" style={{ background: `linear-gradient(to left, ${config.color}, transparent)` }} />
          <span className="text-lg font-black tracking-wide" style={{ color: config.color }}>💡 שלב הרעיון</span>
        </div>
      </div>
      <div className="mx-6 mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 500 }}>
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
          {config.hasLink && (
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: config.color }}>🔗 קישור עבודה</div>
              <div className="flex gap-2 items-center">
                <input title="קישור עבודה" className="h-11 flex-1 rounded-lg border-2 border-gray-200 px-4 text-base" style={{ direction: "ltr", background: config.color + "0A" }} placeholder="https://..." value={project.link || ""} onChange={(e) => update({ link: e.target.value })} />
                {project.link && (
                  <button onClick={() => openExternalLink(project.link)} title="פתח קישור עבודה" className="h-11 px-4 rounded-lg text-white text-sm font-bold flex items-center hover:opacity-90 transition-opacity" style={{ background: config.color }}>
                    עבודה ↗
                  </button>
                )}
              </div>
            </div>
          )}
          {config.hasLink && (
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: "#10B981" }}>👁 קישור תצוגה</div>
              <div className="flex gap-2 items-center">
                <input title="קישור תצוגה" className="h-11 flex-1 rounded-lg border-2 border-gray-200 px-4 text-base" style={{ direction: "ltr", background: "#10B9810A" }} placeholder="https://..." value={project.viewLink || ""} onChange={(e) => update({ viewLink: e.target.value })} />
                {project.viewLink && (
                  <button onClick={() => openExternalLink(project.viewLink)} title="פתח קישור תצוגה" className="h-11 px-4 rounded-lg text-white text-sm font-bold flex items-center hover:opacity-90 transition-opacity" style={{ background: "#10B981" }}>
                    תצוגה ↗
                  </button>
                )}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: config.color }}>שם</div>
            <input title="שם" className="h-11 w-full rounded-lg border-2 border-gray-200 px-4 text-lg font-bold italic text-center" style={{ direction: "rtl", background: config.color + "0A" }} placeholder="שם..." value={project.poeticName} onChange={(e) => update({ poeticName: e.target.value })} />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="text-sm font-bold mb-1" style={{ color: config.color }}>הייקו</div>
            <textarea title="הייקו" className="flex-1 w-full rounded-xl border-2 border-gray-200 p-4 text-3xl font-black italic text-center resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 180, background: config.color + "08" }} placeholder="הייקו..." value={project.poem} onChange={(e) => update({ poem: e.target.value })} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="text-lg font-extrabold mb-2" style={{ color: config.color }}>פוסט</div>
          <textarea title="פוסט" className="flex-1 w-full rounded-xl border-2 border-gray-200 p-5 text-base font-medium resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 420, background: "#FAFAF8" }} placeholder="כתוב פוסט, תיאור, הערות..." value={project.description} onChange={(e) => update({ description: e.target.value })} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <div className="text-sm font-bold mb-2" style={{ color: config.color }}>תמונה</div>
          <FileDropZone onFile={(f) => handleImage(f)} onDelete={() => update({ image: null })} currentSrc={project.image} label="תמונה" className="flex-1 min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 overflow-hidden" />
        </div>
      </div>

      {/* [DESIGN: typography] Phase 2 — Execution Phase */}
      <div className="mx-6 mb-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-[3px] flex-1 rounded-full" style={{ background: `linear-gradient(to left, ${config.color}, transparent)` }} />
          <span className="text-lg font-black tracking-wide" style={{ color: config.color }}>⚡ שלב הביצוע</span>
        </div>
      </div>
      <div className="mx-6 mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ minHeight: 360 }}>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <div className="text-lg font-bold mb-2" style={{ color: config.color }}>מטרה</div>
          <textarea title="מטרה" className="flex-1 w-full rounded-xl border border-gray-200 p-4 text-lg font-semibold resize-none leading-relaxed" style={{ direction: "rtl", minHeight: 160, background: "#FAFAF8" }} placeholder="מטרה..." value={project.note} onChange={(e) => update({ note: e.target.value })} />
          {/* Links section */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <RecordLinks
              links={((project.tracking as any)?.links as LinkEntry[]) || []}
              isWorkMode={true}
              onUpdate={(links) => update({ tracking: { ...project.tracking, links } as any })}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col lg:col-span-1">
          <TasksManager
            value={project.document}
            onChange={(json) => update({ document: json })}
            color={config.color}
            onSendEmail={(task: TaskItem) => {
              const dateStr = task.date ? new Date(task.date).toLocaleDateString("he-IL") : "לא צוין";
              setEmailSubject(`משימה: ${task.text}`);
              setEmailBody(`משימה: ${task.text}\nתאריך יעד: ${dateStr}\nסטטוס: ${task.done ? "בוצע ✅" : "פתוח"}\n\nפרויקט: ${project.name}`);
              setEmailOpen(true);
            }}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div>
            <div className="text-base font-bold mb-2" style={{ color: config.color }}>היסטוריה</div>
            <div className="flex gap-2 mb-3">
              <input title="הוסף רשומה" className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-base" style={{ direction: "rtl" }} placeholder="הוסף רשומה..." value={historyInput} onChange={(e) => setHistoryInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHistoryEntry()} />
              <button title="הוסף" className="h-9 w-9 rounded-lg text-white text-base flex items-center justify-center" style={{ background: config.color }} onClick={addHistoryEntry}>+</button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {project.history.map((h, i) => (
                <div key={i} className="flex gap-2 text-sm border-r-2 pr-3 py-1.5" style={{ borderColor: config.color + "33" }}>
                  <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{h.date}</span>
                  <span className="text-base">{h.note}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Attachments section */}
          <div className="pt-3 border-t border-border/30">
            <ProjectAttachments
              projectId={project.id}
              projectType="generic"
              attachments={project.attachments}
              color={config.color}
              invalidateKey={["generic-projects", config.storageKey]}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["generic-projects", config.storageKey] })}
            />
          </div>
        </div>
      </div>
      {project && (() => {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status;
        const defaultSubject = `חוות דעת: ${project.name}`;
        const defaultBody = `שם פרויקט: ${project.name}\nקטגוריה: ${project.category}${project.sub !== project.category ? ` › ${project.sub}` : ""}\nסטטוס: ${statusLabel}\nתאריך: ${project.created}\n\nהערות:\n${project.note || ""}`;
        return (<EmailModal isOpen={emailOpen} onClose={() => { setEmailOpen(false); setEmailSubject(""); setEmailBody(""); }} subject={emailSubject || defaultSubject} body={emailBody || defaultBody} domainColor={config.color} />);
      })()}
    </div>
  );
};

export default GenericDomainDetail;
