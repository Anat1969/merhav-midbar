import React from "react";
import { useQuery } from "@tanstack/react-query";
import { countSubProjectsAsync } from "@/lib/supabaseStorage";

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
      className="group flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-right transition-all duration-200 hover:shadow-md hover:-translate-x-0.5 active:scale-[0.99]"
      style={{ borderColor: `${color}30` }}
      dir="rtl"
    >
      <span className="font-semibold text-gray-700 text-base leading-snug">{label}</span>
      {count > 0 && (
        <span
          className="rounded-full px-2.5 py-0.5 text-sm font-black text-white min-w-[28px] text-center flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {count}
        </span>
      )}
    </button>
  );
};
