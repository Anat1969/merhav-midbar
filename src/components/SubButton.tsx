import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countSubProjectsAsync } from "@/lib/supabaseStorage";

// [DESIGN: typography] Enlarged data rows with Frank Ruhl Libre count badges
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
      <span className="text-[15px] font-medium text-foreground">{label}</span>
      {count > 0 ? (
        <span
          className="record-count rounded-full px-3 py-1 min-w-[30px] text-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {count}
        </span>
      ) : (
        <span className="text-[13px] font-medium text-muted-foreground/40 px-2">—</span>
      )}
    </button>
  );
};
