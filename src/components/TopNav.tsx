import React, { useState } from "react";
import { EmailModal } from "./EmailModal";
import { LinksManager } from "./LinksManager";

export const TopNav: React.FC = () => {
  const [emailOpen, setEmailOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-2 shadow-sm print:hidden" dir="rtl">
        <div className="text-right">
          <div className="text-sm font-bold" style={{ color: "#2C6E6A" }}>דשבורד — אדריכלית העיר</div>
          <div className="text-[11px] text-gray-400">עץ ארגוני תכולת עבודה</div>
        </div>
        <div className="flex gap-2">
          <button
            title="חזור הביתה"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50"
          >
            🏠 חזור הביתה
          </button>
          <button
            title="קישורים"
            onClick={() => setLinksOpen(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50"
          >
            🔗 קישורים
          </button>
          <button
            title="חזור אחורה"
            onClick={() => window.history.back()}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50"
          >
            ← חזור אחורה
          </button>
          <button
            title="הדפס"
            onClick={() => window.print()}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50"
          >
            🖨 הדפס
          </button>
          <button
            title="שלח מייל"
            onClick={() => setEmailOpen(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50"
          >
            ✉️ שלח מייל
          </button>
        </div>
      </nav>
      <EmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} />
      <LinksManager isOpen={linksOpen} onClose={() => setLinksOpen(false)} />
    </>
  );
};
