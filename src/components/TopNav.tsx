import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailModal } from "./EmailModal";
import { LinksManager } from "./LinksManager";
import { TabaotManager } from "./TabaotManager";
import { IdeaCardsManager } from "./IdeaCardsManager";
import { DataMigration } from "./DataMigration";
import { Menu, X } from "lucide-react";

// [DESIGN: color system] Header — deep navy #1a3a5c, gradient bottom line
export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [tabaotOpen, setTabaotOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navBtns = [
    { icon: "🏠", label: "דשבורד",        action: () => navigate("/"),                    primary: true },
    { icon: "🔗", label: "קישורים",       action: () => setLinksOpen(true),              primary: false },
    { icon: "📋", label: "הוראות תוכנית", action: () => navigate("/plan-instructions"), primary: false },
    { icon: "📑", label: 'תב"עות',        action: () => setTabaotOpen(true),             primary: false },
    { icon: "💡", label: "רעיונות",       action: () => setIdeasOpen(true),              primary: false },
    { icon: "🖨",  label: "הדפס",          action: () => window.print(),                  primary: false },
    { icon: "✉️", label: "שלח מייל",      action: () => setEmailOpen(true),              primary: false },
    { icon: "☁️", label: "העבר ל-Cloud",  action: () => setMigrateOpen(true),           primary: false },
  ];

  return (
    <>
      {/* [DESIGN: color system] Navy header with gradient bottom edge */}
      <nav
        className="sticky top-0 z-40 print:hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-between bg-navy-header px-5 py-2">
          {/* Right side — titles */}
          <div className="text-right">
            <div className="text-[11px] font-normal tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
              אגף הנדסה — עיריית אשדוד
            </div>
            {/* [DESIGN: typography] Enlarged main title */}
            <div className="font-frank text-[26px] font-black text-white leading-tight">
              דשבורד אדריכלית העיר
            </div>
            <div className="text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.38)" }}>
              עץ ארגוני · תכולת עבודה · 2025
            </div>
          </div>

          {/* Left side — nav buttons (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {navBtns.map((b) => (
              <button
                key={b.label}
                title={b.label}
                onClick={b.action}
                className="rounded-md px-4 py-2 text-[13px] font-medium text-white/80 transition-colors hover:text-white hover:bg-white/10 border border-white/15 backdrop-blur-sm"
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-md border border-white/20 p-1.5 text-white/80 transition-colors hover:text-white hover:bg-white/10"
            onClick={() => setMenuOpen((o) => !o)}
            title="תפריט"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* [DESIGN: color system] 3px gradient bottom line */}
        <div
          className="h-[3px]"
          style={{ background: "linear-gradient(to left, #2d8fd4, transparent)" }}
        />
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-[52px] left-0 right-0 bg-navy-header border-b border-white/10 shadow-xl p-3 flex flex-col gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {navBtns.map((b) => (
              <button
                key={b.label}
                onClick={() => { b.action(); setMenuOpen(false); }}
                className="rounded-md px-3 py-2 text-[13px] font-medium text-right text-white/80 transition-all hover:bg-white/10 flex items-center gap-2"
              >
                <span className="text-sm">{b.icon}</span>
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
