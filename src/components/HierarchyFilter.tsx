import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const DOMAINS = [
  { name: "מבנים", icon: "🏛", color: "#2C6E6A", route: "/binui" },
  { name: "פיתוח", icon: "🌿", color: "#3A7D6F", route: "/pitua" },
  { name: "מיידעים", icon: "📋", color: "#4A6741", route: "/meyadim" },
  { name: "פעולות", icon: "⚡", color: "#5A5A7A", route: "/peulot" },
];

interface StatusOption {
  value: string;
  label: string;
  color: string;
  bg: string;
}

interface HierarchyFilterProps {
  activeDomain: string;
  domainColor: string;
  categories: { name: string; color?: string; count: number }[];
  filterCat: string | null;
  onFilterCat: (cat: string | null) => void;
  subs: { name: string; count: number }[];
  filterSub: string | null;
  onFilterSub: (sub: string | null) => void;
  statusOptions: readonly StatusOption[];
  statusCounts: Record<string, number>;
  filterStatus: string | null;
  onFilterStatus: (status: string | null) => void;
  totalCount: number;
  filteredCount: number;
}

export const HierarchyFilter: React.FC<HierarchyFilterProps> = ({
  activeDomain, domainColor, categories, filterCat, onFilterCat,
  subs, filterSub, onFilterSub, statusOptions, statusCounts,
  filterStatus, onFilterStatus, totalCount, filteredCount,
}) => {
  const navigate = useNavigate();
  const hasSubs = subs.length > 0;

  return (
    <div className="no-print mx-4 mt-3 mb-4 rounded-xl bg-card shadow-sm border border-border/50 p-5" dir="rtl">
      <div className="text-base font-bold text-gray-700 mb-5 flex items-center gap-2">
        🔽 סינון היררכי
      </div>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        {/* Right: Tree hierarchy */}
        <div className="flex-1 min-w-0">
          {/* Level 0: Domain */}
          <TreeLevel level={0} label="דומיין" hasChildren>
            <div className="flex items-center gap-2 flex-wrap">
              {DOMAINS.map((d) => (
                <TreePill
                  key={d.name}
                  active={d.name === activeDomain}
                  color={d.color}
                  onClick={() => d.name !== activeDomain && navigate(d.route)}
                >
                  {d.icon} {d.name}
                </TreePill>
              ))}
            </div>
          </TreeLevel>

          {/* Level 1: Category */}
          <TreeLevel level={1} label="קטגוריה" hasChildren={hasSubs} connector>
            <div className="flex items-center gap-2 flex-wrap">
              <TreePill
                active={!filterCat && !filterSub}
                color={domainColor}
                onClick={() => { onFilterCat(null); onFilterSub(null); }}
              >
                הכל
              </TreePill>
              {categories.map((cat) => (
                <TreePill
                  key={cat.name}
                  active={filterCat === cat.name}
                  color={cat.color || domainColor}
                  onClick={() => { onFilterCat(cat.name === filterCat ? null : cat.name); onFilterSub(null); }}
                  count={cat.count}
                >
                  {cat.name}
                </TreePill>
              ))}
            </div>
          </TreeLevel>

          {/* Level 2: Sub-category */}
          {hasSubs && (
            <TreeLevel level={2} label="נושא" connector>
              <div className="flex items-center gap-2 flex-wrap">
                <TreePill
                  active={!filterSub}
                  color={domainColor}
                  onClick={() => onFilterSub(null)}
                >
                  הכל
                </TreePill>
                {subs.map((s) => (
                  <TreePill
                    key={s.name}
                    active={filterSub === s.name}
                    color={domainColor}
                    onClick={() => onFilterSub(s.name === filterSub ? null : s.name)}
                    count={s.count}
                  >
                    {s.name}
                  </TreePill>
                ))}
              </div>
            </TreeLevel>
          )}
        </div>

        {/* Left: Status + counter */}
        <div className="flex flex-col gap-3 items-end shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground shrink-0">סטטוס:</span>
            <TreePill active={!filterStatus} onClick={() => onFilterStatus(null)} variant="status">
              הכל
            </TreePill>
            {statusOptions.map((s) => (
              <TreePill
                key={s.value}
                active={filterStatus === s.value}
                color={s.color}
                variant="status"
                onClick={() => onFilterStatus(s.value === filterStatus ? null : s.value)}
                count={statusCounts[s.value] ?? 0}
              >
                {s.label}
              </TreePill>
            ))}
          </div>
          <span
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{ background: domainColor + "1A", color: domainColor }}
          >
            מציג {filteredCount} מתוך {totalCount}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Tree level with visual connector ─── */
function TreeLevel({ level, label, children, hasChildren, connector }: {
  level: number; label: string; children: React.ReactNode; hasChildren?: boolean; connector?: boolean;
}) {
  return (
    <div className="relative flex items-start gap-0" style={{ paddingRight: level * 28 }}>
      {/* Vertical + horizontal connector lines */}
      {connector && (
        <div className="absolute top-0 flex items-center" style={{ right: (level - 1) * 28 + 12 }}>
          {/* Vertical line from parent */}
          <div
            className="absolute w-0.5 bg-border"
            style={{ height: "calc(50% + 4px)", top: -4, right: 0 }}
          />
          {/* Horizontal branch line */}
          <div
            className="absolute h-0.5 bg-border"
            style={{ top: "50%", right: 0, width: 16 }}
          />
          {/* Dot at junction */}
          <div
            className="absolute w-2 h-2 rounded-full border-2 border-border bg-card"
            style={{ top: "calc(50% - 4px)", right: -3 }}
          />
        </div>
      )}

      {/* Label */}
      <div className="flex items-center gap-3 py-2.5 min-w-0">
        <span className="text-xs font-bold text-muted-foreground w-14 shrink-0 text-start">{label}</span>
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 rotate-180" />
        {children}
      </div>

      {/* Vertical continuation line for parent nodes */}
      {hasChildren && (
        <div
          className="absolute w-0.5 bg-border"
          style={{ right: level * 28 + 12, top: "50%", height: "calc(100% + 8px)" }}
        />
      )}
    </div>
  );
}

/* ─── Tree pill button ─── */
function TreePill({ children, active, color, variant, onClick, count }: {
  children: React.ReactNode; active: boolean; color?: string; variant?: "status"; onClick: () => void; count?: number;
}) {
  const isStatus = variant === "status";
  return (
    <button
      title={typeof children === "string" ? children : ""}
      onClick={onClick}
      className="h-8 px-3 rounded-lg text-sm font-semibold transition-all border flex items-center gap-1.5"
      style={
        active
          ? { background: color || "#666", color: "#fff", borderColor: color || "#666", boxShadow: `0 2px 8px ${(color || "#666")}33` }
          : isStatus && color
            ? { background: "#fff", color: color, borderColor: color + "55" }
            : { background: "#FAFAF8", color: "#777", borderColor: "#E8E8E2" }
      }
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className="text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
          style={
            active
              ? { background: "rgba(255,255,255,0.3)", color: "#fff" }
              : { background: (color || "#666") + "15", color: color || "#666" }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default HierarchyFilter;
