import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { DomainDef } from "@/lib/hierarchy";
import { countDomainProjects, countCategoryProjects, countSubProjects } from "@/lib/storage";
import { SubButton } from "./SubButton";

const DOMAIN_ROUTES: Record<string, string> = {
  "מבנים": "/binui",
  "פיתוח": "/pitua",
  "מיידעים": "/meyadim",
  "פעולות": "/peulot",
  "אפליקציות": "/apps",
};

// Domains that have their own dedicated management page
const DOMAINS_WITH_PAGES = new Set(["מבנים", "פיתוח", "מיידעים", "פעולות"]);

interface DomainCardProps {
  name: string;
  def: DomainDef;
  onOpenPanel: (domain: string, category: string, sub: string) => void;
  refreshKey: number;
}

export const DomainCard: React.FC<DomainCardProps> = ({ name, def, onOpenPanel, refreshKey }) => {
  const navigate = useNavigate();
  const totalCount = countDomainProjects(name);
  const route = DOMAIN_ROUTES[name] ?? "/";
  const hasDedicatedPage = DOMAINS_WITH_PAGES.has(name);

  return (
    <div className="overflow-hidden rounded-xl shadow-sm bg-white" dir="rtl">
      {/* Header — clickable link */}
      <Link
        to={route}
        className="group flex items-center justify-between px-5 py-4 text-white transition-all hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${def.color}, ${def.color}CC)`,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{def.icon}</span>
          <div>
            <h2 className="text-lg font-bold">{name}</h2>
            <p className="text-xs font-light opacity-80">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur-sm">
              {totalCount}
            </span>
          )}
          <span className="opacity-0 transition-opacity group-hover:opacity-80 text-lg">→</span>
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 space-y-4">
        {Object.entries(def.categories).map(([catName, catDef]) => {
          const subs = catDef.items.length > 0 ? catDef.items : [catName];
          const catCount = countCategoryProjects(name, catName);
          return (
            <div key={catName}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {catName}
                </h3>
                {catCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${def.color}15`, color: def.color }}
                  >
                    {catCount}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {subs.map((sub) => (
                  <SubButton
                    key={sub}
                    label={sub}
                    domain={name}
                    category={catName}
                    sub={sub}
                    color={def.color}
                    onClick={() => hasDedicatedPage ? navigate(`${route}?filter=${encodeURIComponent(sub)}`) : onOpenPanel(name, catName, sub)}
                    refreshKey={refreshKey}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
