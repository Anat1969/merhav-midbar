import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return (
    <div
      className="relative mx-4 mt-4 rounded-2xl p-8 print:hidden overflow-hidden border border-border bg-secondary"
      dir="rtl"
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(43 50% 55%) 1px, transparent 1px),
                            radial-gradient(circle at 80% 20%, hsl(43 50% 55%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex-1">
          <p className="mb-1 text-base font-light text-muted-foreground">
            אדריכלות עיר — ניהול ידע ופרויקטים
          </p>
          <h1 className="mb-2 text-5xl font-black leading-tight text-primary">מרחב ביניים</h1>
          <p className="text-base font-light text-muted-foreground">
            רווחת האדם — סביבה מקיימת — תפעול אפקטיבי
          </p>
        </div>
        <GlobalSearch onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
};
