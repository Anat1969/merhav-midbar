import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { openFileInNewTab } from "@/lib/fileAccess";
import { FileText, Map, Search, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface TabaRecord {
  id: number;
  quarter: string;
  plan_name: string;
  instructions_url: string;
  tashrit_url: string;
  note: string;
  created_at: string;
}

const PlanInstructionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TabaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tabaot" as any)
        .select("*")
        .order("quarter", { ascending: true })
        .order("plan_name", { ascending: true });
      setRecords((data as any as TabaRecord[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = records.filter(
    (r) =>
      r.quarter.includes(search) ||
      r.plan_name.includes(search) ||
      r.note?.includes(search)
  );

  const grouped = filtered.reduce<Record<string, TabaRecord[]>>((acc, r) => {
    const key = r.quarter || "ללא רובע";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const quarters = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "he", { sensitivity: "base" })
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <TopNav />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">הוראות תוכנית</h1>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring w-56"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-primary">{records.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">סה״כ תוכניות</div>
          </div>
          <div className="rounded-xl border bg-card shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-primary">{quarters.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">רובעים</div>
          </div>
          <div className="rounded-xl border bg-card shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-primary">
              {records.filter((r) => r.instructions_url).length}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">עם הוראות מצורפות</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">לא נמצאו תוכניות</p>
          </div>
        ) : (
          quarters.map((quarter) => (
            <div key={quarter} className="space-y-3">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-primary">{quarter}</h2>
                <span className="text-xs text-muted-foreground">({grouped[quarter].length})</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[quarter].map((rec) => {
                  const isExpanded = expandedId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                    >
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-right"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold text-sm truncate">{rec.plan_name || "ללא שם"}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2 border-t">
                          <div className="pt-2 text-xs text-muted-foreground">
                            רובע: <span className="font-bold">{rec.quarter}</span>
                          </div>

                          {rec.note && (
                            <div className="text-sm bg-muted/20 rounded-lg p-2 border-r-2 border-primary">
                              {rec.note}
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap pt-1">
                            {rec.instructions_url && (
                              <button
                                onClick={() => openFileInNewTab(rec.instructions_url)}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                הוראות תוכנית
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                            {rec.tashrit_url && (
                              <button
                                onClick={() => openFileInNewTab(rec.tashrit_url)}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <Map className="h-3 w-3" />
                                תשריט
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlanInstructionsListPage;
