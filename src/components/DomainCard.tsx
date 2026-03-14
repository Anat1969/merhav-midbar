import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DomainDef } from "@/lib/hierarchy";
import { countDomainProjectsAsync, countCategoryProjectsAsync } from "@/lib/supabaseStorage";
import { SubButton } from "./SubButton";
import { SubIconsRow } from "./AppIconsBar";

const DOMAIN_ROUTES: Record<string, string> = {
  "מבנים": "/binui",
  "פיתוח": "/pitua",
  "מיידעים": "/meyadim",
  "פעולות": "/peulot",
  "כלי AI": "/apps",
};

const CATEGORY_ROUTES: Record<string, string> = {
  "כלי AI": "/apps",
  "סוכנים": "/agents",
  "אפליקציות": "/apps",
};

const DOMAINS_WITH_PAGES = new Set(["מבנים", "פיתוח", "מיידעים", "פעולות", "כלי AI"]);
const SUBS_WITH_ICONS = new Set(["אפליקציות", "סוכנים"]);

interface DomainCardProps {
  name: string;
  def: DomainDef;
  onOpenPanel: (domain: string, category: string, sub: string) => void;
  refreshKey: number;
}

// [UPGRADE: typography] Larger headings, better visual hierarchy throughout domain cards
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
  const isAITools = name === "כלי AI";

  return (
    <div className="overflow-hidden rounded-2xl shadow-md bg-white hover:shadow-lg transition-shadow duration-200" dir="rtl">
      {/* [UPGRADE: typography] Domain header — h2 at 24px+ */}
      <Link
        to={route}
        className="group flex items-center justify-between px-6 py-5 text-white transition-all hover:brightness-110 active:brightness-95"
        style={{ background: `linear-gradient(135deg, ${def.color}, ${def.color}CC)` }}
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl drop-shadow">{def.icon}</span>
          <div>
            <h2 className="text-2xl font-black leading-tight">{name}</h2>
            <p className="text-sm font-light opacity-85 mt-0.5">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="rounded-full bg-white/25 px-3.5 py-1.5 num-value font-black text-white backdrop-blur-sm" style={{ fontSize: "1.125rem" }}>
              {totalCount}
            </span>
          )}
          <span className="opacity-0 transition-opacity group-hover:opacity-70 text-xl">→</span>
        </div>
      </Link>

      <div className="p-5">
        {isAITools ? (
          <AIToolsLayout
            domainName={name}
            def={def}
            color={def.color}
            route={route}
            hasDedicatedPage={hasDedicatedPage}
            onOpenPanel={onOpenPanel}
            refreshKey={refreshKey}
            navigate={navigate}
          />
        ) : hasSubItems ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Object.keys(def.categories).length}, 1fr)` }}>
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
                  hideTitle={hideCategoryTitles}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
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
                  hideTitle={hideCategoryTitles}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function AIToolsLayout({ domainName, def, color, route, hasDedicatedPage, onOpenPanel, refreshKey, navigate }: {
  domainName: string; def: DomainDef; color: string; route: string; hasDedicatedPage: boolean;
  onOpenPanel: (d: string, c: string, s: string) => void; refreshKey: number; navigate: any;
}) {
  const categories = def.categories;
  const subs = Object.values(categories).flatMap((c) => c.items.length > 0 ? c.items : []);
  const catName = Object.keys(categories)[0];

  return (
    <div className="space-y-4">
      {subs.map((sub) => (
        <div key={sub}>
          <SubButton
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
          {SUBS_WITH_ICONS.has(sub) && (
            <SubIconsRow sub={sub} color={color} refreshKey={refreshKey} />
          )}
        </div>
      ))}
    </div>
  );
}

function DomainCategoryColumn({ domainName, catName, subs, color, route, hasDedicatedPage, onOpenPanel, refreshKey, navigate, gridLayout, hideTitle }: {
  domainName: string; catName: string; subs: string[]; color: string; route: string; hasDedicatedPage: boolean;
  onOpenPanel: (d: string, c: string, s: string) => void; refreshKey: number; navigate: any; gridLayout?: boolean; hideTitle?: boolean;
}) {
  const { data: catCount = 0 } = useQuery({
    queryKey: ["category-count", domainName, catName, refreshKey],
    queryFn: () => countCategoryProjectsAsync(domainName, catName),
  });

  return (
    <div className={gridLayout ? "" : "space-y-2"}>
      {/* [UPGRADE: typography] Category title at h5 level (~14px bold caps) */}
      {!hideTitle && (
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{catName}</h3>
          {catCount > 0 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}18`, color }}>{catCount}</span>
          )}
        </div>
      )}
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
