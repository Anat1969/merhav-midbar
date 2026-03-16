import React, { useState, useCallback } from "react";
import { HIERARCHY } from "@/lib/hierarchy";
import { TopNav } from "@/components/TopNav";
import { StatsBar } from "@/components/StatsBar";
import { DomainCard } from "@/components/DomainCard";
import { ProjectPanel } from "@/components/ProjectPanel";
import { DashboardFooter } from "@/components/DashboardFooter";
import PrintHeader from "@/components/PrintHeader";

// [DESIGN: color system] Full-viewport flex column layout — no scroll
const domainKeys = Object.keys(HIERARCHY);
const topRow = domainKeys.slice(0, 2);
const bottomRow = domainKeys.slice(2);

const Index: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [panel, setPanel] = useState<{ domain: string; category: string; sub: string } | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openPanel = useCallback((domain: string, category: string, sub: string) => {
    setPanel({ domain, category, sub });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />
      <PrintHeader />
      <StatsBar refreshKey={refreshKey} />

      {/* Main grid area — fills remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top row — 2 equal columns, divided by border */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0" style={{ borderBottom: "2px solid #d0dce8" }}>
          {topRow.map((name, i) => (
            <div
              key={name}
              className="min-h-0 overflow-auto"
              style={i < topRow.length - 1 ? { borderLeft: "2px solid #d0dce8" } : undefined}
            >
              <DomainCard
                name={name}
                def={HIERARCHY[name]}
                onOpenPanel={openPanel}
                refreshKey={refreshKey}
                isAltBg={i % 2 === 1}
              />
            </div>
          ))}
        </div>

        {/* Bottom row — 3 columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 min-h-0">
          {bottomRow.map((name, i) => (
            <div
              key={name}
              className="min-h-0 overflow-auto"
              style={i < bottomRow.length - 1 ? { borderLeft: "2px solid #d0dce8" } : undefined}
            >
              <DomainCard
                name={name}
                def={HIERARCHY[name]}
                onOpenPanel={openPanel}
                refreshKey={refreshKey}
                isAltBg={i % 2 === 1}
              />
            </div>
          ))}
        </div>
      </div>

      <DashboardFooter refreshKey={refreshKey} />

      {/* Project Panel */}
      {panel && (
        <ProjectPanel
          domain={panel.domain}
          category={panel.category}
          sub={panel.sub}
          onClose={() => setPanel(null)}
          onDataChange={refresh}
        />
      )}
    </div>
  );
};

export default Index;
