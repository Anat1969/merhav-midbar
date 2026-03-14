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

  const isEmpty = count === 0;

  return (
    <button
      title={isEmpty ? "אין רשומות בקטגוריה זו" : `פתח ${label}`}
      onClick={isEmpty ? undefined : onClick}
      className={`group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-right text-base transition-all duration-200 hover:-translate-x-0.5 ${
        isEmpty
          ? "bg-[#0F2044] border-[#1E3A6E] opacity-50 cursor-not-allowed text-[#4A5568]"
          : "bg-[#0F2044] border-[#1E3A6E] text-[#B8C5D6] hover:bg-[#1E3A6E] hover:text-white"
      }`}
      dir="rtl"
    >
      <span className="font-medium">{label}</span>
      {count > 0 && (
        <span className="rounded-full px-2 py-0.5 text-sm font-bold bg-[#C9A84C] text-[#0A1628]">
          {count}
        </span>
      )}
    </button>
  );
};
