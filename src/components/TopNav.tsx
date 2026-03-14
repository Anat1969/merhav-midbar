import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailModal } from "./EmailModal";
import { LinksManager } from "./LinksManager";
import { TabaotManager } from "./TabaotManager";
import { IdeaCardsManager } from "./IdeaCardsManager";
import { DataMigration } from "./DataMigration";

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [tabaotOpen, setTabaotOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-[#0A1628] px-4 py-2 shadow-sm border-b border-[#1E3A6E] print:hidden" dir="rtl">
        <div className="text-right">
          <div className="text-xl font-black text-[#C9A84C]">דשבורד — אדריכלית העיר</div>
          <div className="text-sm text-[#B8C5D6]">עץ ארגוני תכולת עבודה</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            title="חזור הביתה"
            onClick={() => navigate("/")}
            className="min-h-12 rounded border border-[#C9A84C] bg-[#C9A84C] px-4 py-2 text-base font-bold text-[#0A1628] transition-colors hover:bg-[#E8C96A]"
          >
            🏠 דשבורד
          </button>
          <button
            title="קישורים"
            onClick={() => setLinksOpen(true)}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            🔗 קישורים
          </button>
          <button
            title="הוראות תוכנית"
            onClick={() => navigate("/plan-instructions")}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            📋 הוראות תוכנית
          </button>
          <button
            title="תב&quot;עות"
            onClick={() => setTabaotOpen(true)}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            📑 תב&quot;עות
          </button>
          <button
            title="כרטיסי רעיונות"
            onClick={() => setIdeasOpen(true)}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            💡 רעיונות
          </button>
          <button
            title="הדפס"
            onClick={() => window.print()}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            🖨 הדפס
          </button>
          <button
            title="שלח מייל"
            onClick={() => setEmailOpen(true)}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            ✉️ שלח מייל
          </button>
          <button
            title="העבר נתונים ל-Cloud"
            onClick={() => setMigrateOpen(true)}
            className="min-h-12 rounded border border-[#1E3A6E] bg-transparent px-4 py-2 text-base text-white transition-colors hover:bg-[#162B55]"
          >
            ☁️ העבר ל-Cloud
          </button>
        </div>
      </nav>
      <EmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} />
      <LinksManager isOpen={linksOpen} onClose={() => setLinksOpen(false)} />
      <TabaotManager isOpen={tabaotOpen} onClose={() => setTabaotOpen(false)} />
      <IdeaCardsManager isOpen={ideasOpen} onClose={() => setIdeasOpen(false)} />
      <DataMigration open={migrateOpen} onOpenChange={setMigrateOpen} />
    </>
  );
};
