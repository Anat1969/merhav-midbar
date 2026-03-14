import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailModal } from "./EmailModal";
import { LinksManager } from "./LinksManager";
import { TabaotManager } from "./TabaotManager";
import { IdeaCardsManager } from "./IdeaCardsManager";
import { DataMigration } from "./DataMigration";
import { Menu, X } from "lucide-react";

// [UPGRADE: navigation] Improved TopNav with mobile hamburger + larger text
export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [tabaotOpen, setTabaotOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navBtns = [
    { icon: "🏠", label: "דשבורד",       action: () => navigate("/"),                        border: "border-input" },
    { icon: "🔗", label: "קישורים",      action: () => setLinksOpen(true),                  border: "border-input" },
    { icon: "📋", label: "הוראות תוכנית", action: () => navigate("/plan-instructions"),     border: "border-primary/40 text-primary" },
    { icon: "📑", label: 'תב"עות',       action: () => setTabaotOpen(true),                 border: "border-input" },
    { icon: "💡", label: "רעיונות",      action: () => setIdeasOpen(true),                  border: "border-primary/40 text-primary" },
    { icon: "🖨",  label: "הדפס",         action: () => window.print(),                       border: "border-input" },
    { icon: "✉️", label: "שלח מייל",     action: () => setEmailOpen(true),                  border: "border-input" },
    { icon: "☁️", label: "העבר ל-Cloud", action: () => setMigrateOpen(true),               border: "border-orange-300 bg-orange-50 hover:bg-orange-100" },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-40 flex items-center justify-between bg-background px-4 py-3 shadow-sm print:hidden border-b border-border/40"
        dir="rtl"
      >
        {/* Brand */}
        <div className="text-right">
          <div className="text-lg font-black text-primary leading-tight">דשבורד — אדריכלית העיר</div>
          <div className="text-sm text-muted-foreground font-medium">עץ ארגוני תכולת עבודה</div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex gap-2 flex-wrap justify-end">
          {navBtns.map((b) => (
            <button
              key={b.label}
              title={b.label}
              onClick={b.action}
              className={`rounded-lg border bg-background px-3 py-2 text-sm font-semibold transition-all hover:shadow-sm hover:brightness-95 flex items-center gap-1.5 ${b.border}`}
            >
              <span>{b.icon}</span>
              <span className="hidden lg:inline">{b.label}</span>
            </button>
          ))}
        </div>

        {/* [UPGRADE: navigation] Mobile hamburger */}
        <button
          className="md:hidden rounded-lg border border-input bg-background p-2 transition-colors hover:bg-accent"
          onClick={() => setMenuOpen((o) => !o)}
          title="תפריט"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* [UPGRADE: navigation] Mobile drawer menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col gap-2 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {navBtns.map((b) => (
              <button
                key={b.label}
                onClick={() => { b.action(); setMenuOpen(false); }}
                className={`rounded-lg border bg-background px-4 py-3 text-base font-semibold text-right transition-all hover:bg-accent flex items-center gap-3 ${b.border}`}
              >
                <span className="text-xl">{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <EmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} />
      <LinksManager isOpen={linksOpen} onClose={() => setLinksOpen(false)} />
      <TabaotManager isOpen={tabaotOpen} onClose={() => setTabaotOpen(false)} />
      <IdeaCardsManager isOpen={ideasOpen} onClose={() => setIdeasOpen(false)} />
      <DataMigration open={migrateOpen} onOpenChange={setMigrateOpen} />
    </>
  );
};
