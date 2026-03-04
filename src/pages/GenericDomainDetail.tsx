import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import PrintHeader from "@/components/PrintHeader";
import { EmailModal } from "@/components/EmailModal";
import { FileDropZone } from "@/components/FileDropZone";
import {
  DomainConfig,
  GenericProject,
  STATUS_OPTIONS,
  loadGenericProjects,
  saveGenericProjects,
  getHebrewDateNow,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/domainConstants";
import { toast } from "sonner";

interface Props {
  config: DomainConfig;
}

const GenericDomainDetail: React.FC<Props> = ({ config }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<GenericProject[]>(() => loadGenericProjects(config.storageKey));
  const projectIdx = projects.findIndex((p) => String(p.id) === id);
  const project = projects[projectIdx];

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [activeTab, setActiveTab] = useState<"note" | "history" | "tracking">("note");
  const [historyInput, setHistoryInput] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);

  const persist = (updated: GenericProject[]) => {
    const prev = projects;
    setProjects(updated);
    const ok = saveGenericProjects(config.storageKey, updated);
    if (!ok) setProjects(prev);
  };

  const update = (patch: Partial<GenericProject>) => {
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
            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}DD)` }}
            onClick={() => navigate(`/${config.routeBase}`)}
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
      status: status as any,
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

  const handleImage = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("הקובץ גדול מדי. גודל מרבי מותר: 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ image: reader.result as string });
    reader.readAsDataURL(file);
  };

  const prevProject = projectIdx > 0 ? projects[projectIdx - 1] : null;
  const nextProject = projectIdx < projects.length - 1 ? projects[projectIdx + 1] : null;

  const isPoetic = config.extraFields === "poetic";

  return (
    <div className="min-h-screen bg-background" style={{ direction: "rtl" }}>
      <TopNav />
      <PrintHeader />

      {/* Domain header banner */}
      <div
        className="mx-4 mt-4 rounded-2xl px-6 py-4 text-white print:hidden"
        style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-light opacity-80 flex items-center gap-1">
              <span className="cursor-pointer hover:underline" onClick={() => navigate("/")}>דשבורד</span>
              <span>←</span>
              <span className="cursor-pointer hover:underline" onClick={() => navigate(`/${config.routeBase}`)}>{config.domainName}</span>
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
                borderColor: (STATUS_OPTIONS.find((s) => s.value === project.status)?.color ?? "") + "44",
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
      <div className="no-print mx-4 mt-3 flex items-center gap-2">
        <button
          title="קדימה"
          disabled={!nextProject}
          className="h-8 px-3 rounded-lg border border-border bg-card text-xs disabled:opacity-30 hover:bg-muted transition-colors"
          onClick={() => nextProject && navigate(`/${config.routeBase}/${nextProject.id}`)}
        >
          קדימה &gt;
        </button>
        <button
          title="אחורה"
          disabled={!prevProject}
          className="h-8 px-3 rounded-lg border border-border bg-card text-xs disabled:opacity-30 hover:bg-muted transition-colors"
          onClick={() => prevProject && navigate(`/${config.routeBase}/${prevProject.id}`)}
        >
          &lt; אחורה
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          UPPER FRAME — POETIC / CONCEPTUAL
          ═══════════════════════════════════════════════════════════ */}
      {isPoetic && (
        <div className="mx-4 mt-4">
          <div
            className="rounded-2xl border-2 overflow-hidden"
            style={{ borderColor: config.color + "40" }}
          >
            {/* Section label */}
            <div
              className="px-5 py-2 text-sm font-bold text-white"
              style={{ background: config.color }}
            >
              שם פואטי:
            </div>

            {/* Content: text fields + image */}
            <div className="flex flex-col lg:flex-row">
              {/* Text side */}
              <div className="flex-1 p-5 space-y-4">
                {/* Haiku + Post row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {/* Post — smaller font */}
                  <div className="flex flex-col">
                    <div className="text-xs font-semibold mb-1 text-muted-foreground">פוסט:</div>
                    <textarea
                      title="פוסט"
                      className="w-full flex-1 rounded-lg border border-border p-3 text-sm resize-none bg-card"
                      style={{ direction: "rtl", minHeight: 280 }}
                      placeholder="כתוב פוסט..."
                      value={project.description}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </div>
                  {/* Poetic Name + Haiku column */}
                  <div className="flex flex-col gap-3">
                    {/* Poetic Name — shortened, above haiku */}
                    <div>
                      <div className="text-xs font-semibold mb-1 text-muted-foreground">שם פואטי:</div>
                      <input
                        title="שם פואטי"
                        className="w-full rounded-lg border border-border px-3 py-2 text-lg font-black italic bg-card"
                        style={{ direction: "rtl", color: config.color }}
                        placeholder="שם פואטי..."
                        value={project.poeticName}
                        onChange={(e) => update({ poeticName: e.target.value })}
                      />
                    </div>
                    {/* Haiku — medium, fills remaining space */}
                    <div className="flex flex-col flex-1">
                      <div className="text-xs font-semibold mb-1 text-muted-foreground">שיר היצירה:</div>
                      <textarea
                        title="הייקו"
                        className="w-full flex-1 rounded-lg border border-border p-3 text-base font-semibold italic resize-none bg-card"
                        style={{ direction: "rtl", minHeight: 180, color: config.color }}
                        placeholder="הייקו — שלושה שורות..."
                        value={project.task}
                        onChange={(e) => update({ task: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image side */}
              <div className="lg:w-[280px] shrink-0 p-5 lg:border-r border-t lg:border-t-0" style={{ borderColor: config.color + "25" }}>
                <div className="text-xs font-semibold mb-2 text-muted-foreground">תמונה</div>
                <FileDropZone
                  onFile={(f) => handleImage(f)}
                  onDelete={() => update({ image: null })}
                  currentSrc={project.image}
                  label="תמונה"
                  className="aspect-[3/4] border-2 border-dashed border-border rounded-lg hover:bg-muted/50 overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          NON-POETIC: image + simple fields  
          ═══════════════════════════════════════════════════════════ */}
      {!isPoetic && (
        <div className="mx-4 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl shadow-sm p-4">
            <div className="text-sm font-semibold mb-2" style={{ color: config.color }}>תמונה</div>
            <FileDropZone
              onFile={(f) => handleImage(f)}
              onDelete={() => update({ image: null })}
              currentSrc={project.image}
              label="תמונה"
              className="aspect-[4/3] border-2 border-dashed border-border rounded-lg hover:bg-muted/50 overflow-hidden"
            />
          </div>
          <div className="bg-card rounded-xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold" style={{ color: config.color }}>תיאור</div>
            <textarea
              title="תיאור"
              className="w-full rounded-lg border border-border p-3 text-sm resize-none bg-background"
              style={{ direction: "rtl", minHeight: 180 }}
              placeholder="תיאור מפורט..."
              value={project.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LOWER FRAME — PRACTICAL / MANAGEMENT
          ═══════════════════════════════════════════════════════════ */}
      <div className="mx-4 mt-4 mb-12">
        <div
          className="rounded-2xl border-2 overflow-hidden"
          style={{ borderColor: config.color + "30" }}
        >
          {/* Section label */}
          <div
            className="px-5 py-2 text-sm font-bold text-white flex items-center justify-between"
            style={{ background: config.color + "DD" }}
          >
            <span>שם פרקטי:</span>
            <span className="text-xs opacity-80 font-normal">{project.name}</span>
          </div>

          {/* 4-column practical grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse" style={{ borderColor: config.color + "15" }}>
            {/* Description / Document */}
            <div className="p-4">
              <div className="text-xs font-bold mb-2" style={{ color: config.color }}>תאור:</div>
              <textarea
                title="תיאור פרקטי"
                className="w-full rounded-lg border border-border p-2 text-xs resize-none bg-background"
                style={{ direction: "rtl", minHeight: 140 }}
                placeholder={isPoetic ? "תיאור פרקטי, מטרות ויעדים..." : "תיאור..."}
                value={isPoetic ? project.decision : project.description}
                onChange={(e) => update(isPoetic ? { decision: e.target.value } : { description: e.target.value })}
              />
            </div>

            {/* Document / Opinion */}
            <div className="p-4">
              <div className="text-xs font-bold mb-2" style={{ color: config.color }}>מסמך:</div>
              <textarea
                title="חוות דעת"
                className="w-full rounded-lg border border-border p-2 text-xs resize-none bg-background"
                style={{ direction: "rtl", minHeight: 140 }}
                placeholder="כתוב חוות דעת, הערות, עדכונים..."
                value={project.note}
                onChange={(e) => update({ note: e.target.value })}
              />
            </div>

            {/* History */}
            <div className="p-4">
              <div className="text-xs font-bold mb-2" style={{ color: config.color }}>היסטוריה:</div>
              <div className="flex gap-1 mb-2">
                <input
                  title="הוסף רשומה"
                  className="flex-1 h-7 rounded border border-border px-2 text-xs bg-background"
                  style={{ direction: "rtl" }}
                  placeholder="הוסף..."
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHistoryEntry()}
                />
                <button
                  title="הוסף"
                  className="h-7 w-7 rounded text-white text-xs flex items-center justify-center shrink-0"
                  style={{ background: config.color }}
                  onClick={addHistoryEntry}
                >
                  +
                </button>
              </div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {project.history.map((h, i) => (
                  <div key={i} className="text-[11px] border-r-2 pr-2 py-0.5" style={{ borderColor: config.color + "33" }}>
                    <span className="text-muted-foreground font-mono">{h.date}</span>
                    <div>{h.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking */}
            <div className="p-4">
              <div className="text-xs font-bold mb-2" style={{ color: config.color }}>מעקב:</div>
              <div className="space-y-2">
                {[
                  { label: "סטטוס", type: "status" },
                  { label: "תאריך", type: "date" },
                  { label: "הערה", type: "note" },
                  { label: "גורם", type: "agent" },
                  { label: "יוזם", type: "initiator" },
                ].map(({ label, type }) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground shrink-0" style={{ minWidth: 36 }}>{label}</span>
                    {type === "status" ? (
                      <select
                        title="סטטוס"
                        className="h-6 rounded border border-border text-[11px] px-1 flex-1 bg-background"
                        style={{ direction: "rtl" }}
                        value={project.status}
                        onChange={(e) => changeStatus(e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    ) : type === "date" ? (
                      <input
                        title={label}
                        type="date"
                        className="h-6 rounded border border-border px-1 text-[11px] flex-1 bg-background"
                        value={project.tracking.date}
                        onChange={(e) => update({ tracking: { ...project.tracking, date: e.target.value } })}
                      />
                    ) : type === "initiator" ? (
                      <input
                        title={label}
                        className="h-6 rounded border border-border px-1 text-[11px] flex-1 bg-background"
                        style={{ direction: "rtl" }}
                        placeholder="ראש העיר / מנכ״ל..."
                        value={project.initiator}
                        onChange={(e) => update({ initiator: e.target.value })}
                      />
                    ) : (
                      <input
                        title={label}
                        className="h-6 rounded border border-border px-1 text-[11px] flex-1 bg-background"
                        style={{ direction: "rtl" }}
                        value={project.tracking[type as "note" | "agent"]}
                        onChange={(e) => update({ tracking: { ...project.tracking, [type]: e.target.value } })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {project && (() => {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status;
        return (
          <EmailModal
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            subject={`חוות דעת: ${project.name}`}
            body={`שם פרויקט: ${project.name}\nקטגוריה: ${project.category}${project.sub !== project.category ? ` › ${project.sub}` : ""}\nסטטוס: ${statusLabel}\nתאריך: ${project.created}\n\nהערות:\n${project.note || ""}`}
            domainColor={config.color}
          />
        );
      })()}
    </div>
  );
};

export default GenericDomainDetail;
