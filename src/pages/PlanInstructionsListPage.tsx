import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { openFileInNewTab } from "@/lib/fileAccess";
import {
  FileText, Map, Search, ChevronDown, ChevronUp, ExternalLink,
  Loader2, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";

const CONSULTANT_PARTIES = [
  "תנועה", "תברואה", "ניהול ניקוז", "חשמל", "נטיעות",
  "איכות סביבה", "נכסים", "חינוך", "רישוי", "תכנון",
];

const PARTY_ICONS: Record<string, string> = {
  "תנועה": "🚗", "תברואה": "🚰", "ניהול ניקוז": "🌊", "חשמל": "⚡",
  "נטיעות": "🌳", "איכות סביבה": "🌍", "נכסים": "🏘️",
  "חינוך": "🎓", "רישוי": "📋", "תכנון": "📐",
};

interface ConsultantNote {
  quote: string;
  comment?: string;
}

interface TabaRecord {
  id: number;
  quarter: string;
  plan_name: string;
  instructions_url: string;
  tashrit_url: string;
  note: string;
  consultant_notes: Record<string, ConsultantNote>;
  created_at: string;
}

const PlanInstructionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TabaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [parsingId, setParsingId] = useState<number | null>(null);
  const [activeParty, setActiveParty] = useState<{ id: number; party: string } | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tabaot" as any)
      .select("*")
      .order("quarter", { ascending: true })
      .order("plan_name", { ascending: true });
    setRecords((data as any as TabaRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleParse = async (rec: TabaRecord) => {
    if (!rec.instructions_url) {
      toast.error("אין קובץ הוראות מצורף לתוכנית זו");
      return;
    }
    setParsingId(rec.id);
    try {
      const { data, error } = await supabase.functions.invoke("parse-plan-instructions", {
        body: { fileUrl: rec.instructions_url, fileName: rec.plan_name },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "שגיאה בניתוח");

      const notes = data.data?.consultantNotes || {};
      await supabase
        .from("tabaot" as any)
        .update({ consultant_notes: notes } as any)
        .eq("id", rec.id);

      setRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, consultant_notes: notes } : r))
      );
      toast.success("הניתוח הושלם בהצלחה!");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בניתוח המסמך");
    } finally {
      setParsingId(null);
    }
  };

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

  const getPartiesWithContent = (notes: Record<string, ConsultantNote> | null | undefined) => {
    if (!notes || typeof notes !== "object") return [];
    return CONSULTANT_PARTIES.filter((p) => notes[p]?.quote);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <TopNav />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="סה״כ תוכניות" value={records.length} color="text-primary" />
          <StatCard label="רובעים" value={quarters.length} color="text-primary" />
          <StatCard label="עם הוראות" value={records.filter((r) => r.instructions_url).length} color="text-primary" />
          <StatCard
            label="נותחו"
            value={records.filter((r) => getPartiesWithContent(r.consultant_notes).length > 0).length}
            color="text-green-600"
          />
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

              <div className="space-y-3">
                {grouped[quarter].map((rec) => {
                  const isExpanded = expandedId === rec.id;
                  const isParsing = parsingId === rec.id;
                  const parties = getPartiesWithContent(rec.consultant_notes);
                  const hasNotes = parties.length > 0;

                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between px-4 py-3 gap-2">
                        <button
                          className="flex items-center gap-2 min-w-0 flex-1 text-right"
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold text-sm truncate">{rec.plan_name || "ללא שם"}</span>
                          <span className="text-xs text-muted-foreground shrink-0">({rec.quarter})</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>

                        {/* Parse button */}
                        {rec.instructions_url && (
                          <button
                            onClick={() => handleParse(rec)}
                            disabled={isParsing}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                          >
                            {isParsing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            {isParsing ? "מנתח..." : hasNotes ? "נתח מחדש" : "נתח הוראות"}
                          </button>
                        )}
                      </div>

                      {/* Consultant party pills */}
                      {hasNotes && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                          {CONSULTANT_PARTIES.map((party) => {
                            const hasContent = rec.consultant_notes?.[party]?.quote;
                            if (!hasContent) return null;
                            const isActive = activeParty?.id === rec.id && activeParty?.party === party;
                            return (
                              <button
                                key={party}
                                onClick={() =>
                                  setActiveParty(isActive ? null : { id: rec.id, party })
                                }
                                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                <span>{PARTY_ICONS[party]}</span>
                                {party}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Active party detail */}
                      {activeParty?.id === rec.id && rec.consultant_notes?.[activeParty.party]?.quote && (
                        <div className="mx-4 mb-3 rounded-lg border bg-muted/20 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b">
                            <div className="flex items-center gap-2 text-sm font-bold text-primary">
                              <span>{PARTY_ICONS[activeParty.party]}</span>
                              {activeParty.party}
                            </div>
                            <button
                              onClick={() => setActiveParty(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="p-3 space-y-1.5">
                            {rec.consultant_notes[activeParty.party].quote
                              .split(/\n|\.(?=\s)/)
                              .filter((l: string) => l.trim())
                              .map((line: string, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm leading-relaxed p-2 rounded-lg bg-background"
                                >
                                  <span className="text-muted-foreground text-[10px] mt-1 shrink-0">
                                    {i + 1}.
                                  </span>
                                  <span>{line.trim()}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2 border-t pt-2">
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

                          {/* All parties summary when no specific one selected */}
                          {hasNotes && !activeParty && (
                            <div className="text-xs text-muted-foreground pt-1">
                              נותחו {parties.length} גורמים — לחץ על גורם לצפייה בהנחיות
                            </div>
                          )}
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

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="rounded-xl border bg-card shadow-sm p-3 text-center">
    <div className={`text-2xl font-black ${color}`}>{value}</div>
    <div className="text-[10px] text-muted-foreground font-medium mt-1">{label}</div>
  </div>
);

export default PlanInstructionsListPage;
