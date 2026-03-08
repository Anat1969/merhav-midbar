import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DomainDef } from "@/lib/hierarchy";
import { countDomainProjectsAsync, countCategoryProjectsAsync } from "@/lib/supabaseStorage";
import { SubButton } from "./SubButton";

const DOMAIN_ROUTES: Record<string, string> = {
  "מבנים": "/binui",
  "פיתוח": "/pitua",
  "מיידעים": "/meyadim",
  "פעולות": "/peulot",
  "כלי AI": "/apps",
};

// Categories with their own dedicated route
const CATEGORY_ROUTES: Record<string, string> = {
  "סוכנים": "/agents",
};

const DOMAINS_WITH_PAGES = new Set(["מבנים", "פיתוח", "מיידעים", "פעולות", "כלי AI"]);

interface DomainCardProps {
  name: string;
  def: DomainDef;
  onOpenPanel: (domain: string, category: string, sub: string) => void;
  refreshKey: number;
}

export const DomainCard: React.FC<DomainCardProps> = ({ name, def, onOpenPanel, refreshKey }) => {
  const navigate = useNavigate();
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["domain-count", name, refreshKey],
    queryFn: () => countDomainProjectsAsync(name),
  });

  const route = DOMAIN_ROUTES[name] ?? "/";
  const hasDedicatedPage = DOMAINS_WITH_PAGES.has(name);
  const hasSubItems = Object.values(def.categories).some((c) => c.items.length > 0);
  const hideCategoryTitles = !hasSubItems;
  return (
    <div className="overflow-hidden rounded-xl shadow-sm bg-white" dir="rtl">
      <Link
        to={route}
        className="group flex items-center justify-between px-5 py-4 text-white transition-all hover:brightness-110"
        style={{ background: `linear-gradient(135deg, ${def.color}, ${def.color}CC)` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{def.icon}</span>
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm font-light opacity-80">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-base font-bold backdrop-blur-sm">{totalCount}</span>
          )}
          <span className="opacity-0 transition-opacity group-hover:opacity-80 text-lg">→</span>
        </div>
      </Link>

      <div className="p-4">
        {hasSubItems ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(def.categories).length}, 1fr)` }}>
            {Object.entries(def.categories).map(([catName, catDef]) => {
              const subs = catDef.items.length > 0 ? catDef.items : [catName];
              return (
                <DomainCategoryColumn
                  key={catName}
                  domainName={name}
                  catName={catName}
                  subs={subs}
                  color={def.color}
                  route={route}
                  hasDedicatedPage={hasDedicatedPage}
                  onOpenPanel={onOpenPanel}
                  refreshKey={refreshKey}
                  navigate={navigate}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(def.categories).map(([catName, catDef]) => {
              const subs = catDef.items.length > 0 ? catDef.items : [catName];
              return (
                <DomainCategoryColumn
                  key={catName}
                  domainName={name}
                  catName={catName}
                  subs={subs}
                  color={def.color}
                  route={route}
                  hasDedicatedPage={hasDedicatedPage}
                  onOpenPanel={onOpenPanel}
                  refreshKey={refreshKey}
                  navigate={navigate}
                  gridLayout
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function DomainCategoryColumn({ domainName, catName, subs, color, route, hasDedicatedPage, onOpenPanel, refreshKey, navigate, gridLayout }: {
  domainName: string; catName: string; subs: string[]; color: string; route: string; hasDedicatedPage: boolean;
  onOpenPanel: (d: string, c: string, s: string) => void; refreshKey: number; navigate: any; gridLayout?: boolean;
}) {
  const { data: catCount = 0 } = useQuery({
    queryKey: ["category-count", domainName, catName, refreshKey],
    queryFn: () => countCategoryProjectsAsync(domainName, catName),
  });

  return (
    <div className={gridLayout ? "" : "space-y-2"}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{catName}</h3>
        {catCount > 0 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>{catCount}</span>
        )}
      </div>
      <div className={gridLayout ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        {subs.map((sub) => (
          <SubButton
            key={sub}
            label={sub}
            domain={domainName}
            category={catName}
            sub={sub}
            color={color}
            onClick={() => {
              const catRoute = CATEGORY_ROUTES[sub];
              if (catRoute) {
                navigate(catRoute);
              } else if (hasDedicatedPage) {
                navigate(`${route}?filter=${encodeURIComponent(sub)}`);
              } else {
                onOpenPanel(domainName, catName, sub);
              }
            }}
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </div>
  );
}
