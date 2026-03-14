import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

// [UPGRADE: typography] Increased heading sizes, better visual hierarchy
export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return (
    <div

      style={{
        background: "linear-gradient(135deg, #0A1628 0%, #162B55 100%)",
        border: "1px solid #1E3A6E",
      }}
      dir="rtl"
    >
      {/* [UPGRADE: visual] Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                            radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex-1">

            רווחת האדם — סביבה מקיימת — תפעול אפקטיבי
          </p>
        </div>
        <GlobalSearch onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
};
