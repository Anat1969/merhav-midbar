import React from "react";
import { GlobalSearch } from "./GlobalSearch";

interface HeroBannerProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

// [DESIGN: color system] Hero banner removed — replaced by header in TopNav
// Keep component for search functionality
export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPanel }) => {
  return null;
};
