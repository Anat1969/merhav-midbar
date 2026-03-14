// [UPGRADE: Section 11] Step Summary block
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface StepSummaryProps {
  stage: string;
  changedFields: string[];
  lastUpdated: string;
}

export const StepSummary: React.FC<StepSummaryProps> = ({ stage, changedFields, lastUpdated }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1E3A6E] rounded-lg bg-[#0F2044] mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#B8C5D6] hover:bg-[#162B55] transition-colors rounded-lg"
      >
        <span>סיכום שלב: {stage} — עודכן {lastUpdated}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-[#B8C5D6]">
          <p className="font-medium text-[#C9A84C] mb-1">עודכן בשלב זה:</p>
          {changedFields.length === 0 ? (
            <p className="text-[#4A5568]">אין שינויים רשומים</p>
          ) : (
            <ul className="list-disc list-inside space-y-0.5">
              {changedFields.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
