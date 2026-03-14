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
    <div className="mx-4 mt-3 rounded-xl bg-card shadow-md animate-fade-in border border-border" dir="rtl">
      <div className="px-6 py-5 flex flex-wrap items-center gap-8">
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">סה״כ פרויקטים</span>
          <span className="num-value text-primary font-black" style={{ fontSize: "2rem" }}>{total}</span>
        </div>

        <div className="h-12 w-px bg-border hidden sm:block" />

        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
          ([key, cfg]) =>
            counts[key] > 0 && (
              <div key={key} className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="text-sm font-bold text-muted-foreground">{cfg.label}</span>
                </div>
                <span
                  className="num-value font-black"
                  style={{ color: cfg.color, fontSize: "1.625rem" }}
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
