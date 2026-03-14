import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

// [UPGRADE: typography] Increased heading sizes, better visual hierarchy
export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return (
    <div
      className="mx-4 mt-4 rounded-2xl px-8 py-10 text-white print:hidden relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2C6E6A 0%, #3A7D6F 50%, #4A6741 100%)",
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
          <p className="mb-2 text-base font-light opacity-80 tracking-wide">
            אדריכלות עיר — ניהול ידע ופרויקטים
          </p>
          {/* [UPGRADE: typography] h1 minimum 40px per spec */}
          <h1 className="mb-3 font-black leading-tight" style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}>
            מרחב ביניים
          </h1>
          <p className="text-lg font-light opacity-90 leading-relaxed">
            רווחת האדם — סביבה מקיימת — תפעול אפקטיבי
          </p>
        </div>
        <GlobalSearch onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
};
