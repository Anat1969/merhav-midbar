import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countAllStatusAsync } from "@/lib/supabaseStorage";
import { STATUS_CONFIG } from "@/lib/hierarchy";

// [DESIGN: color system] Stats strip — white bg, blue number, pill badges
interface StatsBarProps {
  refreshKey: number;
}

const PILL_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  planning:   { bg: "#e8f3fb", border: "#b8d9f0", dot: "#3B82F6" },
  inprogress: { bg: "#fef3c7", border: "#fcd34d", dot: "#f59e0b" },
  review:     { bg: "#ede9fe", border: "#c4b5fd", dot: "#8b5cf6" },
  done:       { bg: "#e6f4ed", border: "#a7d7c0", dot: "#10B981" },
};

export const StatsBar: React.FC<StatsBarProps> = ({ refreshKey }) => {
  const { data: counts } = useQuery({
    queryKey: ["status-counts", refreshKey],
    queryFn: countAllStatusAsync,
  });

  if (!counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div
      className="bg-white border-b"
      style={{ height: "48px", borderColor: "#d0dce8", borderBottomWidth: "1.5px" }}
      dir="rtl"
    >
      <div className="h-full flex items-center justify-between px-5">
        {/* Right: total label + number */}
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold text-muted-foreground">סה״כ פרויקטים</span>
          {/* [DESIGN: typography] Large Frank Ruhl Libre number */}
          <span className="font-frank text-[28px] font-black text-blue-data leading-none">{total}</span>
        </div>

        {/* Left: status pills */}
        <div className="flex items-center gap-3">
          {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
            ([key, cfg]) => {
              const pill = PILL_STYLES[key];
              return counts[key] > 0 && pill ? (
                <div
                  key={key}
                  className="status-pill"
                  style={{
                    backgroundColor: pill.bg,
                    borderColor: pill.border,
                    padding: "4px 14px",
                  }}
                >
                  <span
                    className="h-[9px] w-[9px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: pill.dot }}
                  />
                  {/* [DESIGN: typography] Enlarged pill labels */}
                  <span className="text-[13px] font-semibold" style={{ color: pill.dot }}>
                    {cfg.label}
                  </span>
                  <span className="font-frank text-[14px] font-bold" style={{ color: pill.dot }}>
                    {counts[key]}
                  </span>
                </div>
              ) : null;
            }
          )}
        </div>
      </div>
    </div>
  );
};
