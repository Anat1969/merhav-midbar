// [UPGRADE: Section 10] Process Stage Badge
import React from "react";

export type Stage = "initiated" | "planning" | "inprogress" | "review" | "completed" | "archived";

export const STAGE_CONFIG: Record<Stage, { label: string; className: string }> = {
  initiated:   { label: "1 — נפתח",        className: "stage-initiated" },
  planning:    { label: "2 — בתכנון",       className: "stage-planning" },
  inprogress:  { label: "3 — בביצוע",       className: "stage-inprogress" },
  review:      { label: "4 — בבדיקה",       className: "stage-review" },
  completed:   { label: "5 — הושלם",        className: "stage-completed" },
  archived:    { label: "6 — ארכיון",       className: "stage-archived" },
};

export const STAGE_OPTIONS = Object.entries(STAGE_CONFIG) as [Stage, { label: string; className: string }][];

interface StageBadgeProps {
  stage: Stage;
  size?: "sm" | "md";
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, size = "md" }) => {
  const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.initiated;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${cfg.className} ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {cfg.label}
    </span>
  );
};
