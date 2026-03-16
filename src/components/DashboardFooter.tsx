import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countAllStatusAsync } from "@/lib/supabaseStorage";
import { HIERARCHY } from "@/lib/hierarchy";
import { countDomainProjectsAsync } from "@/lib/supabaseStorage";

// [DESIGN: color system] Footer — navy background matching header
export const DashboardFooter: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const { data: counts } = useQuery({
    queryKey: ["status-counts", refreshKey],
    queryFn: countAllStatusAsync,
  });

  const domainNames = Object.keys(HIERARCHY);
  const domainQueries = domainNames.map((name) => {
    const { data: count = 0 } = useQuery({
      queryKey: ["domain-count", name, refreshKey],
      queryFn: () => countDomainProjectsAsync(name),
    });
    return { name, count };
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const kpis = [
    { label: "סה״כ פרויקטים", value: total },
    ...domainQueries.map((d) => ({ label: d.name, value: d.count })),
  ];

  return (
    <footer
      className="bg-navy-header print:hidden"
      dir="rtl"
    >
      <div className="flex items-center justify-between px-5 py-3">
        {/* Right: attribution */}
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
          דשבורד אדריכלית העיר — אגף הנדסה עיריית אשדוד © 2025
        </span>

        {/* Left: KPI cells */}
        <div className="flex items-center">
          {kpis.map((kpi, i) => (
            <React.Fragment key={kpi.label}>
              {i > 0 && (
                <div className="h-5 mx-3" style={{ width: "1px", background: "rgba(255,255,255,0.12)" }} />
              )}
              <div className="flex flex-col items-center">
                {/* [DESIGN: typography] Enlarged KPI numbers */}
                <span className="font-frank text-[18px] font-black text-blue-accent leading-none">
                  {kpi.value}
                </span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {kpi.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
};
