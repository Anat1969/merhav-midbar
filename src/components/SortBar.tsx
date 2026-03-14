import React from "react";
import { ArrowUpDown } from "lucide-react";

export type SortKey = "name" | "date" | "status" | "priority";
export type SortDir = "asc" | "desc";

interface SortBarProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  totalCount?: number;
  filteredCount?: number;
  label?: string;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name",     label: "שם" },
  { key: "date",     label: "תאריך" },
  { key: "status",   label: "סטטוס" },
];

// [UPGRADE: navigation] Sort controls for all record lists
export const SortBar: React.FC<SortBarProps> = ({
  sortKey,
  sortDir,
  onSort,
  totalCount,
  filteredCount,
  label = "רשומות",
}) => {
  return (
    <div className="sort-bar flex-wrap no-print" dir="rtl">
      <ArrowUpDown size={15} className="text-gray-400 flex-shrink-0" />
      <span className="text-sm font-medium text-gray-500 ml-1">מיון:</span>

      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSort(opt.key)}
          className={`sort-btn flex items-center gap-1 ${sortKey === opt.key ? "active" : ""}`}
          title={`מיון לפי ${opt.label}`}
        >
          {opt.label}
          {sortKey === opt.key && (
            <span className="text-[10px] opacity-75">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
      ))}

      {/* [UPGRADE: navigation] Result count display */}
      {totalCount !== undefined && (
        <span className="mr-auto text-sm text-gray-400 font-medium">
          {filteredCount !== undefined && filteredCount !== totalCount
            ? `${filteredCount} מתוך ${totalCount} ${label}`
            : `${totalCount} ${label}`}
        </span>
      )}
    </div>
  );
};
