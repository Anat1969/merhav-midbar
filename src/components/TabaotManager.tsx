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

  // Upload file for existing record
  const uploadFileForRecord = async (recordId: number, type: "instructions" | "tashrit", file: File) => {
    setUploading(true);
    try {
      const url = await uploadProjectFile(file, "binui", 0);
      const updateField = type === "instructions" ? { instructions_url: url } : { tashrit_url: url };
      await supabase.from("tabaot" as any).update(updateField as any).eq("id", recordId);
      toast.success(type === "instructions" ? "הוראות התוכנית הועלו" : "התשריט הועלה");
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת קובץ");
    } finally {
      setUploading(false);
    }
  };

  const sortedRecords = [...records].sort((a, b) => a.quarter.localeCompare(b.quarter, "he"));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Map className="h-5 w-5" style={{ color: "#2C6E6A" }} />
              📋 תב&quot;עות
            </DialogTitle>
          </DialogHeader>

          {/* Add form */}
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#2C6E6A44", background: "#2C6E6A08" }}>
            <div className="text-sm font-bold" style={{ color: "#2C6E6A" }}>➕ הוספת רובע חדש</div>
            <div className="flex items-center gap-2">
              <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="שם הרובע..." className="h-8 text-sm flex-1" />
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="שם התוכנית (אופציונלי)..." className="h-8 text-sm flex-1" />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={uploading || !quarter.trim()}
                className="h-8 text-xs font-bold shrink-0"
                style={{ background: "#2C6E6A" }}
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                הוסף
              </Button>
            </div>
          </div>

          {/* Records list - each quarter as a row */}
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">טוען...</div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">אין תב&quot;עות — הוסף את הראשונה</div>
          ) : (
            <div className="space-y-1 mt-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 px-3 py-1 text-xs font-bold text-muted-foreground border-b">
                <span>רובע / תוכנית</span>
                <span className="text-center">הוראות תוכנית</span>
                <span className="text-center">תשריט</span>
                <span></span>
              </div>
              
              {sortedRecords.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors border">
                  {/* Quarter & Plan name */}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: "#2C6E6A" }}>📍 {r.quarter}</div>
                    {r.plan_name && <div className="text-xs text-muted-foreground truncate">{r.plan_name}</div>}
                  </div>
                  
                  {/* Instructions button/upload */}
                  <div className="flex justify-center">
                    {r.instructions_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        style={{ borderColor: "#2C6E6A", color: "#2C6E6A" }}
                        onClick={() => { setPreviewUrl(r.instructions_url); setPreviewName(`הוראות - ${r.plan_name || r.quarter}`); }}
                      >
                        <FileText className="h-3 w-3" /> צפה
                      </Button>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFileForRecord(r.id, "instructions", file);
                            e.target.value = "";
                          }}
                        />
                        <span className="inline-flex items-center gap-1 h-7 px-2 text-xs border border-dashed rounded-md text-muted-foreground hover:bg-muted/50 transition-colors" style={{ borderColor: "#F59E0B" }}>
                          <Plus className="h-3 w-3" /> העלה
                        </span>
                      </label>
                    )}
                  </div>
                  
                  {/* Tashrit button/upload */}
                  <div className="flex justify-center">
                    {r.tashrit_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        style={{ borderColor: "#6B4C9A", color: "#6B4C9A" }}
                        onClick={() => { setPreviewUrl(r.tashrit_url); setPreviewName(`תשריט - ${r.plan_name || r.quarter}`); }}
                      >
                        <Map className="h-3 w-3" /> צפה
                      </Button>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFileForRecord(r.id, "tashrit", file);
                            e.target.value = "";
                          }}
                        />
                        <span className="inline-flex items-center gap-1 h-7 px-2 text-xs border border-dashed rounded-md text-muted-foreground hover:bg-muted/50 transition-colors" style={{ borderColor: "#6B4C9A" }}>
                          <Plus className="h-3 w-3" /> העלה
                        </span>
                      </label>
                    )}
                  </div>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
