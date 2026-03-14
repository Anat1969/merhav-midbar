import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countAllStatusAsync } from "@/lib/supabaseStorage";
import { STATUS_CONFIG } from "@/lib/hierarchy";

interface StatsBarProps {
  refreshKey: number;
}

// [UPGRADE: typography] Larger numeric values (20px+ bold), better visual hierarchy
export const StatsBar: React.FC<StatsBarProps> = ({ refreshKey }) => {
  const { data: counts } = useQuery({
    queryKey: ["status-counts", refreshKey],
    queryFn: countAllStatusAsync,
  });

  if (!counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (

        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border/60 hidden sm:block" />

        {/* [UPGRADE: typography] Status counts with num-value class */}
        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][]).map(
          ([key, cfg]) =>
            counts[key] > 0 && (

              </div>
            )
        )}
      </div>
    </div>
  );
};
