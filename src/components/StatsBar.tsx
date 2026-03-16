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
      style={{ height: "40px", borderColor: "#d0dce8", borderBottomWidth: "1.5px" }}
      dir="rtl"
    >
      <div className="h-full flex items-center justify-between px-5">
        {/* Right: total label + number */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">סה״כ פרויקטים</span>
          <span className="font-frank text-[20px] font-black text-blue-data leading-none">{total}</span>
        </div>

        {/* Left: status pills */}
        <div className="flex items-center gap-2">
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
                  }}
                >
                  <span
                    className="h-[7px] w-[7px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: pill.dot }}
                  />
                  <span className="text-[10.5px] font-semibold" style={{ color: pill.dot }}>
                    {cfg.label}
                  </span>
                  <span className="font-frank text-[11px] font-bold" style={{ color: pill.dot }}>
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
