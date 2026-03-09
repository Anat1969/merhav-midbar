import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { useBinuiProjects } from "@/hooks/use-binui-projects";
import { ConsultantNote } from "@/lib/binuiConstants";
import { ChevronRight, FileText, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

const CONSULTANT_PARTIES = [
  "תנועה", "תברואה", "ניהול ניקוז", "חשמל", "נטיעות",
  "איכות סביבה", "נכסים", "חינוך", "רישוי", "תכנון",
];

const PARTY_ICONS: Record<string, string> = {
  "תנועה": "🚗",
  "תברואה": "🚰",
  "ניהול ניקוז": "🌊",
  "חשמל": "⚡",
  "נטיעות": "🌳",
  "איכות סביבה": "🌍",
  "נכסים": "🏘️",
  "חינוך": "🎓",
  "רישוי": "📋",
  "תכנון": "📐",
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  done: { label: "בוצע", color: "#10B981", icon: <CheckCircle2 className="h-4 w-4" /> },
  not_done: { label: "לא בוצע", color: "#EF4444", icon: <XCircle className="h-4 w-4" /> },
  pending: { label: "ממתין", color: "#F59E0B", icon: <Clock className="h-4 w-4" /> },
};

const PlanInstructionsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: projects = [] } = useBinuiProjects();
  const project = projects.find((p) => String(p.id) === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <TopNav />
        <div className="max-w-4xl mx-auto p-8 text-center text-muted-foreground">פרויקט לא נמצא</div>
      </div>
    );
  }

  const notes = project.consultant_notes || {};
  const partiesWithContent = CONSULTANT_PARTIES.filter((p) => notes[p]?.quote);
  const partiesWithout = CONSULTANT_PARTIES.filter((p) => !notes[p]?.quote);

  const totalWithContent = partiesWithContent.length;
  const doneCount = partiesWithContent.filter((p) => notes[p]?.status === "done").length;
  const notDoneCount = partiesWithContent.filter((p) => notes[p]?.status === "not_done").length;
  const pendingCount = totalWithContent - doneCount - notDoneCount;

  return (
    <div className="min-h-screen bg-background print:bg-white" dir="rtl">
      <TopNav />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/binui/${id}`)}
            className="flex items-center gap-1 text-sm font-medium hover:underline transition-colors"
            style={{ color: "#2C6E6A" }}
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לפרויקט
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: "#2C6E6A" }} />
            <h1 className="text-xl font-bold" style={{ color: "#2C6E6A" }}>
              הוראות תוכנית — {project.name}
            </h1>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="סה״כ גורמים" value={totalWithContent} total={CONSULTANT_PARTIES.length} color="#2C6E6A" />
          <StatCard label="בוצע" value={doneCount} color="#10B981" />
          <StatCard label="לא בוצע" value={notDoneCount} color="#EF4444" />
          <StatCard label="ממתין" value={pendingCount} color="#F59E0B" />
        </div>

        {/* Consultant cards */}
        {partiesWithContent.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">לא נמצאו הנחיות מהוראות תוכנית.</p>
            <p className="text-xs mt-1">יש להעלות קובץ הוראות תוכנית בדף הפרויקט.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partiesWithContent.map((party) => {
              const cn = notes[party] as ConsultantNote;
              const status = cn.status || "pending";
              const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;
              const lines = cn.quote.split(/\n|\.(?=\s)/).filter((l) => l.trim());

              return (
                <div
                  key={party}
                  className="rounded-xl border bg-card shadow-sm overflow-hidden print:break-inside-avoid"
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: `2px solid ${statusInfo.color}20` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PARTY_ICONS[party] || "📄"}</span>
                      <span className="font-bold text-sm" style={{ color: "#2C6E6A" }}>{party}</span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                      style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Quote content */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">הנחיות מהוראות התוכנית</div>
                    <div className="space-y-1.5">
                      {lines.map((line, i) => {
                        const isChecked = cn.checkedLines?.includes(i);
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-sm leading-relaxed p-2 rounded-lg transition-colors ${
                              isChecked ? "bg-green-50 line-through text-muted-foreground" : "bg-muted/30"
                            }`}
                          >
                            <span className="text-muted-foreground text-[10px] mt-1 shrink-0">{i + 1}.</span>
                            <span>{line.trim()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment */}
                  {cn.comment && (
                    <div className="px-4 pb-3">
                      <div className="text-[10px] font-bold text-muted-foreground mb-1">הערות</div>
                      <div className="text-sm bg-muted/20 rounded-lg p-2 border-r-2" style={{ borderColor: "#2C6E6A" }}>
                        {cn.comment}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Parties without content */}
        {partiesWithout.length > 0 && (
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <div className="text-xs font-bold text-muted-foreground mb-2">גורמים ללא הנחיות</div>
            <div className="flex flex-wrap gap-2">
              {partiesWithout.map((party) => (
                <span key={party} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {PARTY_ICONS[party]} {party}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; total?: number; color: string }> = ({ label, value, total, color }) => (
  <div className="rounded-xl border bg-card shadow-sm p-3 text-center">
    <div className="text-2xl font-black" style={{ color }}>
      {value}{total !== undefined && <span className="text-base font-normal text-muted-foreground">/{total}</span>}
    </div>
    <div className="text-[10px] text-muted-foreground font-medium mt-1">{label}</div>
  </div>
);

export default PlanInstructionsPage;
