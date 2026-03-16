import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countSubProjectsAsync } from "@/lib/supabaseStorage";

// [DESIGN: typography] Data rows with Frank Ruhl Libre count badges
interface SubButtonProps {
  label: string;
  domain: string;
  category: string;
  sub: string;
  color: string;
  onClick: () => void;
  refreshKey: number;
}

export const SubButton: React.FC<SubButtonProps> = ({
  label,
  domain,
  category,
  sub,
  color,
  onClick,
  refreshKey,
}) => {
  const { data: count = 0 } = useQuery({
    queryKey: ["sub-count", domain, category, sub, refreshKey],
    queryFn: () => countSubProjectsAsync(domain, category, sub),
  });

  return (
    <button
      title={`פתח ${label}`}
      onClick={onClick}
      className="data-row w-full text-right transition-colors hover:bg-secondary/60 cursor-pointer"
      dir="rtl"
    >
      <span className="text-[11.5px] font-medium text-foreground">{label}</span>
      {count > 0 ? (
        <span
          className="record-count rounded-full px-2 py-0.5 min-w-[24px] text-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {count}
        </span>
      ) : (
        <span className="text-[11px] font-medium text-muted-foreground/40 px-2">—</span>
      )}
    </button>
  );
};
