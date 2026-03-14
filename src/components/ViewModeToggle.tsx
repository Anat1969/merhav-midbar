import React from "react";
import { Eye, PenLine } from "lucide-react";

interface ViewModeToggleProps {
  isWorkMode: boolean;
  onToggle: (workMode: boolean) => void;
}

// [UPGRADE: view-mode] Prominent View/Work mode toggle for all record pages
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ isWorkMode, onToggle }) => {
  return (
    <div
      className="flex items-center rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden"
      role="group"
      aria-label="מצב תצוגה"
      dir="rtl"
    >
      <button
        onClick={() => onToggle(false)}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all"
        style={
          !isWorkMode
            ? { background: "#2C6E6A", color: "white" }
            : { background: "transparent", color: "#6B7280" }
        }
        title="מצב תצוגה — קריאה בלבד, גלישה נוחה"
      >
        <Eye size={16} />
        <span>תצוגה</span>
      </button>
      <button
        onClick={() => onToggle(true)}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all border-r border-border/40"
        style={
          isWorkMode
            ? { background: "#F59E0B", color: "white" }
            : { background: "transparent", color: "#6B7280" }
        }
        title="מצב עבודה — עריכה מוטמעת לכל שדה"
      >
        <PenLine size={16} />
        <span>עבודה</span>
      </button>
    </div>
  );
};
