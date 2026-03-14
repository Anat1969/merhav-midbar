// [UPGRADE: Section 9] Activity Log — replaces חוות דעת
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ActivityEntry {
  id: string;
  text: string;
  date: string;
  type: "manual" | "auto";
}

interface ActivityLogProps {
  recordId: string;
  entries?: ActivityEntry[];
  onAddEntry?: (text: string) => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ recordId, entries = [], onAddEntry }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [input, setInput] = useState("");

  const submit = () => {
    if (!input.trim()) return;
    onAddEntry?.(input.trim());
    setInput("");
  };

  return (
    <div className="border border-[#1E3A6E] rounded-lg bg-[#0F2044] mt-2">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#C9A84C] hover:bg-[#162B55] rounded-lg transition-colors"
      >
        <span>יומן פעילות ({entries.length})</span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="הוסף הערה / פעולה אחרונה..."
              className="flex-1 rounded border border-[#1E3A6E] bg-[#162B55] px-3 py-1.5 text-sm text-white placeholder:text-[#4A5568] focus:border-[#C9A84C] outline-none"
              dir="rtl"
            />
            <button
              onClick={submit}
              className="px-3 py-1.5 rounded bg-[#C9A84C] text-[#0A1628] text-sm font-bold hover:bg-[#E8C96A]"
            >
              הוסף
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {entries.length === 0 && (
              <div className="text-xs text-[#4A5568] py-2 text-center">אין פעילות עדיין</div>
            )}
            {[...entries].reverse().map(e => (
              <div key={e.id} className="activity-entry flex justify-between">
                <span>{e.text}</span>
                <span className="text-[#4A5568] text-xs whitespace-nowrap mr-2">{e.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
