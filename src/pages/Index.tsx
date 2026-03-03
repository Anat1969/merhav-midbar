import React, { useState, useCallback } from "react";
import { HIERARCHY } from "@/lib/hierarchy";
import { TopNav } from "@/components/TopNav";
import { HeroBanner } from "@/components/HeroBanner";
import { StatsBar } from "@/components/StatsBar";
import { DomainCard } from "@/components/DomainCard";
import { ProjectPanel } from "@/components/ProjectPanel";
import PrintHeader from "@/components/PrintHeader";

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
    <div className="min-h-screen bg-background">
      <TopNav />
      <PrintHeader />
      <HeroBanner onOpenPanel={openPanel} />
      <StatsBar refreshKey={refreshKey} />

      {/* Top row — 2 equal columns */}
      <div className="mx-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {topRow.map((name) => (
          <DomainCard key={name} name={name} def={HIERARCHY[name]} onOpenPanel={openPanel} refreshKey={refreshKey} />
        ))}
      </div>

      {/* Bottom row — 3 columns */}
      <div
        className="mx-4 mt-4 mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 animate-fade-in"
        style={{ animationDelay: "0.2s", gridTemplateColumns: "1.2fr 1fr 0.8fr" }}
      >
        {bottomRow.map((name) => (
          <DomainCard key={name} name={name} def={HIERARCHY[name]} onOpenPanel={openPanel} refreshKey={refreshKey} />
        ))}
      </div>

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
