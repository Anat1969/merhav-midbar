import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailModal } from "./EmailModal";
import { LinksManager } from "./LinksManager";
import { TabaotManager } from "./TabaotManager";
import { IdeaCardsManager } from "./IdeaCardsManager";
import { DataMigration } from "./DataMigration";
import { Menu, X } from "lucide-react";

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
      <nav
        className="sticky top-0 z-40 flex items-center justify-between bg-[#0A1628] px-4 py-2 shadow-sm border-b border-[#1E3A6E] print:hidden"
        dir="rtl"
      >
        <div className="text-right">
          <div className="text-xl font-black text-[#C9A84C]">דשבורד — אדריכלית העיר</div>
          <div className="text-sm text-[#B8C5D6]">עץ ארגוני תכולת עבודה</div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex gap-2 flex-wrap">
          {navBtns.map((b) => (
            <button
              key={b.label}
              title={b.label}
              onClick={b.action}
              className={
                b.primary
                  ? "min-h-12 rounded border border-[#C9A84C] bg-[#C9A84C] px-4 py-2 text-base font-bold text-[#0A1628] transition-colors hover:bg-[#E8C96A]"
                  : "min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
              }
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden rounded-lg border border-[#1E3A6E] bg-transparent p-2 text-white transition-colors hover:bg-[#162B55]"
          onClick={() => setMenuOpen((o) => !o)}
          title="תפריט"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-[#0A1628] border-b border-[#1E3A6E] shadow-xl p-4 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {navBtns.map((b) => (
              <button
                key={b.label}
                onClick={() => { b.action(); setMenuOpen(false); }}
                className="rounded-lg border border-[#1E3A6E] bg-transparent px-4 py-3 text-base font-semibold text-right text-white transition-all hover:bg-[#162B55] flex items-center gap-3"
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
