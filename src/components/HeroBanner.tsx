import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return (
    <div
      className="relative mx-4 mt-4 rounded-2xl p-8 print:hidden overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0A1628 0%, #162B55 100%)",
        border: "1px solid #1E3A6E",
      }}
      dir="rtl"
    >
      {/* Subtle background pattern */}
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
          <p className="mb-1 text-base font-light text-[#B8C5D6]">
            אדריכלות עיר — ניהול ידע ופרויקטים
          </p>
          <h1 className="mb-2 text-5xl font-black leading-tight text-[#C9A84C]">מרחב ביניים</h1>
          <p className="text-base font-light text-[#B8C5D6]">
            רווחת האדם — סביבה מקיימת — תפעול אפקטיבי
          </p>
        </div>
        <GlobalSearch onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
};
