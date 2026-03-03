import React from "react";
import { useParams, Link } from "react-router-dom";
import { HIERARCHY } from "@/lib/hierarchy";
import { TopNav } from "@/components/TopNav";

const ROUTE_TO_DOMAIN: Record<string, string> = {
  binui: "בינוי",
  pitua: "פיתוח",
  meyadim: "מיידעים",
  peulot: "פעולות",
  apps: "אפליקציות",
};

const DomainPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const domainName = ROUTE_TO_DOMAIN[slug ?? ""] ?? "";
  const def = HIERARCHY[domainName];

  if (!def) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center pt-32 text-lg text-muted-foreground">דף לא נמצא</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <TopNav />

      {/* Breadcrumb */}
      <div className="mx-4 mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">דשבורד</Link>
        <span>←</span>
        <span className="font-medium text-foreground">{domainName}</span>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center justify-center pt-24 pb-16 text-center">
        <span className="text-5xl mb-4">{def.icon}</span>
        <h1 className="text-4xl font-black mb-2" style={{ color: def.color }}>{domainName}</h1>
        <p className="text-muted-foreground mb-8">{def.description}</p>
        <Link
          to="/"
          className="rounded-lg px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#2C6E6A" }}
        >
          בקרוב — חזור הביתה
        </Link>
      </div>
    </div>
  );
};

export default DomainPage;
