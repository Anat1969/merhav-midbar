import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DomainDef } from "@/lib/hierarchy";
import { countDomainProjectsAsync, countCategoryProjectsAsync } from "@/lib/supabaseStorage";
import { SubButton } from "./SubButton";
import { SubIconsRow } from "./AppIconsBar";

// [DESIGN: color system] Section header colors mapped to domains
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

// [DESIGN: color system] Section header background colors
const SECTION_HEADER_COLORS: Record<string, string> = {
  "מבנים": "#1a3060",   /* dark slate */
  "פיתוח": "#1a6f7a",   /* teal */
  "מיידעים": "#1e5e38", /* deep green */
  "פעולות": "#1a5490",  /* navy-blue */
  "כלי AI": "#1a5490",  /* navy-blue */
};

// [DESIGN: color system] Card header tint backgrounds
const CARD_TINTS: Record<string, string> = {
  "מבנים": "#e6f0f8",
  "פיתוח": "#e6f4f6",
  "מיידעים": "#edf7f1",
  "פעולות": "#eef4fa",
  "כלי AI": "#eef4fa",
};

interface DomainCardProps {
  name: string;
  def: DomainDef;
  onOpenPanel: (domain: string, category: string, sub: string) => void;
  refreshKey: number;
  isAltBg?: boolean;
}

export const DomainCard: React.FC<DomainCardProps> = ({ name, def, onOpenPanel, refreshKey, isAltBg }) => {
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
  const headerColor = SECTION_HEADER_COLORS[name] || "#1a5490";
  const cardTint = CARD_TINTS[name] || "#eef4fa";

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: isAltBg ? "#edf2f7" : "white" }}
      dir="rtl"
    >
      {/* Section header bar */}
      <Link
        to={route}
        className="section-header group transition-opacity hover:opacity-90"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex flex-col">
          <span className="section-header-title">{def.icon} {name}</span>
          <span className="section-header-subtitle">{def.description}</span>
        </div>
        <span className="section-ghost-number">{totalCount || ""}</span>
      </Link>

      {/* Cards area */}
      <div className="flex-1 p-2 space-y-2">
        {isAITools ? (
          <AIToolsCards
            domainName={name}
            def={def}
            color={def.color}
            route={route}
            hasDedicatedPage={hasDedicatedPage}
            onOpenPanel={onOpenPanel}
            refreshKey={refreshKey}
            navigate={navigate}
            cardTint={cardTint}
          />
        ) : hasSubItems ? (
          Object.entries(def.categories).map(([catName, catDef]) => {
            const subs = catDef.items.length > 0 ? catDef.items : [catName];
            return (
              <CategoryCard
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
                cardTint={cardTint}
              />
            );
          })
        ) : (
          Object.entries(def.categories).map(([catName, catDef]) => {
            const subs = catDef.items.length > 0 ? catDef.items : [catName];
            return (
              <CategoryCard
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
                cardTint={cardTint}
                hideTitle={hideCategoryTitles}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

function AIToolsCards({ domainName, def, color, route, hasDedicatedPage, onOpenPanel, refreshKey, navigate, cardTint }: {
  domainName: string; def: DomainDef; color: string; route: string; hasDedicatedPage: boolean;
  onOpenPanel: (d: string, c: string, s: string) => void; refreshKey: number; navigate: any; cardTint: string;
}) {
  const categories = def.categories;
  const subs = Object.values(categories).flatMap((c) => c.items.length > 0 ? c.items : []);
  const catName = Object.keys(categories)[0];

  return (
    <div className="data-card">
      <div className="data-card-header" style={{ backgroundColor: cardTint }}>
        <span className="text-[10.5px] font-bold" style={{ color }}>כלים דיגיטליים</span>
      </div>
      {subs.map((sub) => (
        <React.Fragment key={sub}>
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
        </React.Fragment>
      ))}
    </div>
  );
}

function CategoryCard({ domainName, catName, subs, color, route, hasDedicatedPage, onOpenPanel, refreshKey, navigate, cardTint, hideTitle }: {
  domainName: string; catName: string; subs: string[]; color: string; route: string; hasDedicatedPage: boolean;
  onOpenPanel: (d: string, c: string, s: string) => void; refreshKey: number; navigate: any; cardTint: string; hideTitle?: boolean;
}) {
  const { data: catCount = 0 } = useQuery({
    queryKey: ["category-count", domainName, catName, refreshKey],
    queryFn: () => countCategoryProjectsAsync(domainName, catName),
  });

  return (
    <div className="data-card">
      {!hideTitle && (
        <div className="data-card-header" style={{ backgroundColor: cardTint }}>
          <span className="text-[10.5px] font-bold" style={{ color }}>{catName}</span>
          {catCount > 0 && (
            <span
              className="record-count rounded-full px-2 py-0.5 min-w-[20px] text-center"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {catCount}
            </span>
          )}
        </div>
      )}
      <div>
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
