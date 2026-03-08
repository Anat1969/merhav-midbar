import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { countSubProjectsAsync, loadProjectsBySubAsync } from "@/lib/supabaseStorage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DOMAIN_ROUTE_BASE: Record<string, string> = {
  "מבנים": "binui",
  "פיתוח": "pitua",
  "מיידעים": "meyadim",
  "פעולות": "peulot",
};

const CATEGORY_ROUTE_BASE: Record<string, string> = {
  "סוכנים": "agents",
  "אפליקציות": "apps",
  "כלי AI": "apps",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "#3B82F6",
  inprogress: "#F59E0B",
  review: "#F97316",
  done: "#10B981",
};

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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: count = 0 } = useQuery({
    queryKey: ["sub-count", domain, category, sub, refreshKey],
    queryFn: () => countSubProjectsAsync(domain, category, sub),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["sub-projects", domain, category, sub, refreshKey],
    queryFn: () => loadProjectsBySubAsync(domain, category, sub),
    enabled: open,
  });

  const getDetailRoute = (projectId: number) => {
    const catRoute = CATEGORY_ROUTE_BASE[sub] || CATEGORY_ROUTE_BASE[category];
    if (catRoute) return `/${catRoute}/${projectId}`;
    const domainRoute = DOMAIN_ROUTE_BASE[domain];
    if (domainRoute) return `/${domainRoute}/${projectId}`;
    return `/`;
  };

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title={`פתח ${label}`}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={onClick}
          className="group flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-right text-base transition-all duration-200 hover:-translate-x-0.5"
          style={{ borderColor: `${color}30` }}
          onFocus={handleEnter}
          onBlur={handleLeave}
          dir="rtl"
        >
          <span className="font-medium text-gray-700">{label}</span>
          {count > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 max-h-80 overflow-auto"
        align="start"
        dir="rtl"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color }}>{label}</span>
          <button
            onClick={() => { setOpen(false); onClick(); }}
            className="text-xs px-2 py-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            פתח הכל →
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-400">
            אין פרויקטים
          </div>
        ) : (
          <div className="py-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  navigate(getDetailRoute(p.id));
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-right text-sm hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[p.status] || "#999" }}
                />
                <span className="truncate text-gray-700">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
