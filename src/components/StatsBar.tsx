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
    <div className="mx-4 mt-3 rounded-xl bg-[#0F2044] border border-[#1E3A6E] p-4 shadow-sm animate-fade-in" dir="rtl">
      <div className="flex flex-wrap items-center gap-6 text-base">
        <div className="font-bold text-3xl text-[#C9A84C] stat-number">
          סה״כ: {total}
        </div>
        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
          ([key, cfg]) =>
            counts[key] > 0 && (
              <div key={key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-[#B8C5D6]">{cfg.label}: <span className="font-bold text-white">{counts[key]}</span></span>
              </div>
            )
        )}
      </div>
    </div>
  );
};
