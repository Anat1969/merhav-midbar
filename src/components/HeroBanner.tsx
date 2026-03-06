import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return (
    <div
      className="mx-4 mt-4 rounded-2xl p-8 text-white print:hidden"
      style={{
        background: "linear-gradient(135deg, #2C6E6A 0%, #3A7D6F 50%, #4A6741 100%)",
      }}
      dir="rtl"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <p className="mb-1 text-base font-light opacity-80">
            אדריכלות עיר — ניהול ידע ופרויקטים
          </p>
          <h1 className="mb-2 text-5xl font-black leading-tight">מרחב ביניים</h1>
          <p className="text-base font-light opacity-90">
            רווחת האדם — סביבה מקיימת — תפעול אפקטיבי
          </p>
        </div>
        <GlobalSearch onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
};
