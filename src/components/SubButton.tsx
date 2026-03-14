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

// [UPGRADE: typography] Larger text, better hover state, count badge prominent
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

          {count}
        </span>
      )}
    </button>
  );
};
