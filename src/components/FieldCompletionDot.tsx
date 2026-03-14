// [UPGRADE: Section 6] Field completion indicator
import React from "react";

interface FieldCompletionDotProps {
  filled: boolean;
  fieldName?: string;
}

export const FieldCompletionDot: React.FC<FieldCompletionDotProps> = ({ filled, fieldName }) => (
  <span
    title={filled ? "שדה מלא" : `שדה ריק: ${fieldName ?? ""}`}
    className={`inline-block w-2.5 h-2.5 rounded-full ml-1 ${filled ? "bg-[#C9A84C]" : "bg-[#4A5568]"}`}
  />
);
