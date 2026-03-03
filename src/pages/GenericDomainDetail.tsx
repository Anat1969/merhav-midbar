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
} from "@/lib/domainConstants";

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
  const [activeTab, setActiveTab] = useState<"note" | "history">("note");
  const [historyInput, setHistoryInput] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const persist = (updated: GenericProject[]) => {
    setProjects(updated);
    saveGenericProjects(config.storageKey, updated);
  };

  const update = (patch: Partial<GenericProject>) => {
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
            style={{ background: config.color }}
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
    const reader = new FileReader();
    reader.onload = () => update({ image: reader.result as string });
    reader.readAsDataURL(file);
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
        <span className="cursor-pointer hover:underline" onClick={() => navigate(`/${config.routeBase}`)}>{config.domainName}</span>
        <span>←</span>
        <span style={{ color: config.color, fontWeight: 600 }}>{project.name}</span>
      </div>

      {/* Header bar */}
      <div className="no-print mx-6 mb-4 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
        <button
          title="קדימה"
          disabled={!nextProject}
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs disabled:opacity-30 hover:bg-gray-50 transition-colors"
          onClick={() => nextProject && navigate(`/${config.routeBase}/${nextProject.id}`)}
        >
          קדימה &gt;
        </button>
        <button
          title="אחורה"
          disabled={!prevProject}
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs disabled:opacity-30 hover:bg-gray-50 transition-colors"
          onClick={() => prevProject && navigate(`/${config.routeBase}/${prevProject.id}`)}
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
              <button title="שמור" className="text-xs text-white px-2 h-7 rounded" style={{ background: config.color }} onClick={saveName}>שמור</button>
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
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 transition-colors"
          onClick={() => setEmailOpen(true)}
        >
          ✉️ שלח חוות דעת
        </button>
      </div>

      {/* Two-column grid */}
      <div className="detail-grid mx-6 mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — note / history */}
        <div className="detail-column bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            <TabBtn active={activeTab === "note"} onClick={() => setActiveTab("note")} color={config.color}>מסמך (חוות דעת)</TabBtn>
            <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")} color={config.color}>היסטוריה</TabBtn>
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
                  style={{ background: config.color }}
                  onClick={() => update({ note: project.note })}
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
                    style={{ background: config.color }}
                    onClick={addHistoryEntry}
                  >
                    +
                  </button>
                </div>
                <div className="history-list space-y-2 max-h-[300px] overflow-y-auto">
                  {project.history.map((h, i) => (
                    <div key={i} className="flex gap-2 text-sm border-r-2 pr-3 py-1" style={{ borderColor: config.color + "33" }}>
                      <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{h.date}</span>
                      <span>{h.note}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — poetic name, image, status block */}
        <div className="detail-column space-y-4">
          {/* Poetic name */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm font-semibold mb-2" style={{ color: config.color }}>שם פואטי</div>
            <input
              title="שם פואטי"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm italic"
              style={{ direction: "rtl" }}
              placeholder="שם פואטי / הייקו..."
              value={project.poeticName}
              onChange={(e) => update({ poeticName: e.target.value })}
            />
          </div>

          {/* Single image */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm font-semibold mb-2" style={{ color: config.color }}>תמונה</div>
            <FileDropZone
              onFile={(f) => handleImage(f)}
              currentSrc={project.image}
              label="תמונה"
              className="aspect-[4/3] border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 overflow-hidden"
            />
          </div>

          {/* Status block */}
          <div className="detail-card bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold" style={{ color: config.color }}>מעקב</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400" style={{ minWidth: 60 }}>סטטוס</span>
                <select
                  title="סטטוס"
                  className="h-7 rounded border text-xs px-2 flex-1"
                  style={{ direction: "rtl" }}
                  value={project.status}
                  onChange={(e) => changeStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400" style={{ minWidth: 60 }}>תאריך</span>
                <input
                  title="תאריך מעקב"
                  type="date"
                  className="h-7 rounded border border-gray-200 px-2 text-xs flex-1"
                  value={project.tracking.date}
                  onChange={(e) => update({ tracking: { ...project.tracking, date: e.target.value } })}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400" style={{ minWidth: 60 }}>הערה</span>
                <input
                  title="הערת מעקב"
                  className="h-7 rounded border border-gray-200 px-2 text-xs flex-1"
                  style={{ direction: "rtl" }}
                  value={project.tracking.note}
                  onChange={(e) => update({ tracking: { ...project.tracking, note: e.target.value } })}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400" style={{ minWidth: 60 }}>גורם</span>
                <input
                  title="גורם אחראי"
                  className="h-7 rounded border border-gray-200 px-2 text-xs flex-1"
                  style={{ direction: "rtl" }}
                  value={project.tracking.agent}
                  onChange={(e) => update({ tracking: { ...project.tracking, agent: e.target.value } })}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400" style={{ minWidth: 60 }}>יוזם</span>
                <input
                  title="יוזם"
                  className="h-7 rounded border border-gray-200 px-2 text-xs flex-1"
                  style={{ direction: "rtl" }}
                  placeholder="ראש העיר / מנכ״ל / מאן דהוא"
                  value={project.initiator}
                  onChange={(e) => update({ initiator: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description — full width */}
      <div className="mx-6 mb-12 bg-white rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold mb-2" style={{ color: config.color }}>תיאור</div>
        <textarea
          title="תיאור הפרויקט"
          className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none"
          style={{ direction: "rtl", minHeight: 150, background: "#FAFAF8" }}
          placeholder="תיאור מפורט של הפרויקט..."
          value={project.description}
          onChange={(e) => update({ description: e.target.value })}
        />
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

function TabBtn({ children, active, onClick, color }: { children: React.ReactNode; active: boolean; onClick?: () => void; color: string }) {
  return (
    <button
      title={typeof children === "string" ? children : ""}
      className="flex-1 py-2.5 text-sm font-medium transition-colors border-b-2"
      style={{
        borderColor: active ? color : "transparent",
        color: active ? color : "#999",
        background: active ? color + "0D" : "transparent",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default GenericDomainDetail;
