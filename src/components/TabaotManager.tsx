import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, FileText, Map, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProjectFile } from "@/lib/fileStorage";
import { openFileInNewTab } from "@/lib/fileAccess";
import { toast } from "sonner";

interface TabaRecord {
  id: number;
  quarter: string;
  plan_name: string;
  instructions_url: string;
  tashrit_url: string;
  note: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TabaotManager: React.FC<Props> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<TabaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState("");
  const [planName, setPlanName] = useState("");
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [tashritFile, setTashritFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const instrRef = useRef<HTMLInputElement>(null);
  const tashRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tabaot" as any)
      .select("*")
      .order("quarter", { ascending: true });
    setRecords((data as any as TabaRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchRecords();
  }, [isOpen]);

  const handleAdd = async () => {
    if (!quarter.trim()) { toast.error("יש להזין שם רובע"); return; }
    setUploading(true);
    try {
      let instrUrl = "";
      let tashUrl = "";
      const ts = Date.now();
      if (instructionsFile) {
        const safeName = instructionsFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        instrUrl = await uploadProjectFile(instructionsFile, "binui", 0);
      }
      if (tashritFile) {
        tashUrl = await uploadProjectFile(tashritFile, "binui", 0);
      }

      const { error } = await supabase.from("tabaot" as any).insert({
        quarter: quarter.trim(),
        plan_name: planName.trim(),
        instructions_url: instrUrl,
        tashrit_url: tashUrl,
      } as any);

      if (error) throw error;
      toast.success("תב\"ע נוספה בהצלחה");
      setQuarter("");
      setPlanName("");
      setInstructionsFile(null);
      setTashritFile(null);
      if (instrRef.current) instrRef.current.value = "";
      if (tashRef.current) tashRef.current.value = "";
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהוספת תב\"ע");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("למחוק תב\"ע זו?")) return;
    await supabase.from("tabaot" as any).delete().eq("id", id);
    fetchRecords();
  };

  // Group by quarter
  const grouped = records.reduce<Record<string, TabaRecord[]>>((acc, r) => {
    const q = r.quarter || "ללא רובע";
    if (!acc[q]) acc[q] = [];
    acc[q].push(r);
    return acc;
  }, {});

  const sortedQuarters = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "he"));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Map className="h-5 w-5" style={{ color: "#2C6E6A" }} />
              📋 תב&quot;עות
            </DialogTitle>
          </DialogHeader>

          {/* Add form */}
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2C6E6A44", background: "#2C6E6A08" }}>
            <div className="text-sm font-bold" style={{ color: "#2C6E6A" }}>➕ הוספת תב&quot;ע חדשה</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">שם רובע *</label>
                <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="שם הרובע..." className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">שם תוכנית</label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="שם התוכנית..." className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">📄 הוראות תוכנית</label>
                <input
                  ref={instrRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="block w-full text-xs file:h-7 file:rounded file:border-0 file:px-3 file:text-xs file:font-medium file:cursor-pointer"
                  style={{ direction: "ltr" }}
                  onChange={(e) => setInstructionsFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">🗺️ תשריט</label>
                <input
                  ref={tashRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="block w-full text-xs file:h-7 file:rounded file:border-0 file:px-3 file:text-xs file:font-medium file:cursor-pointer"
                  style={{ direction: "ltr" }}
                  onChange={(e) => setTashritFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={uploading || !quarter.trim()}
              className="h-8 text-xs font-bold"
              style={{ background: "#2C6E6A" }}
            >
              {uploading ? <><Loader2 className="h-3 w-3 animate-spin" /> מעלה...</> : <><Plus className="h-3 w-3" /> הוסף תב&quot;ע</>}
            </Button>
          </div>

          {/* Records list grouped by quarter */}
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">טוען...</div>
          ) : sortedQuarters.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">אין תב&quot;עות — הוסף את הראשונה</div>
          ) : (
            <div className="space-y-2 mt-2">
              {sortedQuarters.map((q) => (
                <div key={q} className="rounded-lg border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold hover:bg-muted/50 transition-colors"
                    style={{ color: "#2C6E6A" }}
                    onClick={() => setExpandedId(expandedId === grouped[q][0]?.id ? null : grouped[q][0]?.id)}
                  >
                    <span>📍 {q} ({grouped[q].length})</span>
                    {expandedId === grouped[q][0]?.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedId === grouped[q][0]?.id && (
                    <div className="border-t divide-y">
                      {grouped[q].map((r) => (
                        <div key={r.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{r.plan_name || "ללא שם"}</div>
                            <div className="flex gap-3 mt-1">
                              {r.instructions_url && (
                                <button
                                  onClick={() => { setPreviewUrl(r.instructions_url); setPreviewName(`הוראות - ${r.plan_name || r.quarter}`); }}
                                  className="text-xs flex items-center gap-1 hover:underline"
                                  style={{ color: "#2C6E6A" }}
                                >
                                  <FileText className="h-3 w-3" /> הוראות תוכנית
                                </button>
                              )}
                              {r.tashrit_url && (
                                <button
                                  onClick={() => { setPreviewUrl(r.tashrit_url); setPreviewName(`תשריט - ${r.plan_name || r.quarter}`); }}
                                  className="text-xs flex items-center gap-1 hover:underline"
                                  style={{ color: "#6B4C9A" }}
                                >
                                  <Map className="h-3 w-3" /> תשריט
                                </button>
                              )}
                              {!r.instructions_url && !r.tashrit_url && (
                                <span className="text-xs text-muted-foreground">אין מסמכים</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <div
            className="relative bg-white rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "90vw", height: "90vh", maxWidth: 1200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b" dir="rtl">
              <span className="text-sm font-semibold">{previewName}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => openFileInNewTab(previewUrl)}
                >
                  פתח בחלון חדש
                </Button>
                <button
                  className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewUrl(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <PreviewFrame url={previewUrl} />
          </div>
        </div>
      )}
    </>
  );
};

/** Renders a blob-based iframe for PDFs or an img for images */
const PreviewFrame: React.FC<{ url: string }> = ({ url }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      setLoading(true);
      try {
        // Detect type from URL extension
        const ext = url.split("?")[0].toLowerCase();
        const imgExt = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(ext);
        setIsImage(imgExt);

        // Download as blob via Supabase SDK
        const pathMatch = url.match(/\/object\/public\/([^/]+)\/(.+?)(\?|$)/);
        if (pathMatch) {
          const { data } = await supabase.storage.from(pathMatch[1]).download(pathMatch[2]);
          if (data) {
            const blob = URL.createObjectURL(data);
            revoke = blob;
            setBlobUrl(blob);
            setLoading(false);
            return;
          }
        }
        // Fallback: use URL directly
        setBlobUrl(url);
      } catch {
        setBlobUrl(url);
      }
      setLoading(false);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [url]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!blobUrl) return null;

  if (isImage) {
    return (
      <div className="flex items-center justify-center h-[calc(100%-40px)] overflow-auto bg-muted/30 p-4">
        <img src={blobUrl} alt="preview" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  return <iframe src={blobUrl} className="w-full h-[calc(100%-40px)]" title="document preview" />;
};
