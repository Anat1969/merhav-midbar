import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countAllStatusAsync } from "@/lib/supabaseStorage";
import { STATUS_CONFIG } from "@/lib/hierarchy";

interface StatsBarProps {
  refreshKey: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({ refreshKey }) => {
  const { data: counts } = useQuery({
    queryKey: ["status-counts", refreshKey],
    queryFn: countAllStatusAsync,
  });

  if (!counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl bg-white shadow-sm animate-fade-in border border-border/30" dir="rtl">
      <div className="px-6 py-4 flex flex-wrap items-center gap-6">
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">סה״כ פרויקטים</span>
          <span className="num-value text-primary" style={{ fontSize: "1.5rem" }}>{total}</span>
        </div>

        <div className="h-10 w-px bg-border/60 hidden sm:block" />

        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
          ([key, cfg]) =>
            counts[key] > 0 && (
              <div key={key} className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs font-semibold text-muted-foreground">{cfg.label}</span>
                </div>
                <span
                  className="num-value font-bold"
                  style={{ color: cfg.color, fontSize: "1.25rem" }}
                >
                  {counts[key]}
                </span>
              </div>
            )
        )}
      </div>
    </div>
  );
};
