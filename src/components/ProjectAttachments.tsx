import React, { useState, useRef, useCallback } from "react";
import { Paperclip, Plus, Trash2, FileText, Film, FileSpreadsheet, Download, Eye, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Attachment } from "@/lib/domainConstants";
import { uploadProjectFile, deleteFile } from "@/lib/fileStorage";
import { saveAttachmentAsync, deleteAttachmentAsync } from "@/lib/supabaseStorage";
import { downloadFile, openFileInNewTab } from "@/lib/fileAccess";
import { toast } from "sonner";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getFileType(src: string): "image" | "video" | "pdf" | "other" {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src) || src.startsWith("data:image")) return "image";
  if (/\.(mp4|webm|ogg|mov)$/i.test(src) || src.startsWith("data:video")) return "video";
  if (/\.pdf$/i.test(src) || src.startsWith("data:application/pdf")) return "pdf";
  return "other";
}

interface Props {
  projectId: number;
  projectType: "binui" | "generic";
  attachments: Attachment[];
  color: string;
  invalidateKey: string[];
  onRefresh: () => void;
}

export const ProjectAttachments: React.FC<Props> = ({ projectId, projectType, attachments, color, invalidateKey, onRefresh }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} גדול מדי (מקסימום 20MB)`); continue; }
        const url = await uploadProjectFile(file, projectType, projectId);
        await saveAttachmentAsync(projectType, projectId, file.name, url);
      }
      onRefresh();
      toast.success("קבצים הועלו בהצלחה");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  }, [projectId, projectType, onRefresh]);

  const handleDelete = async (att: Attachment) => {
    if (!window.confirm(`למחוק את "${att.name}"?`)) return;
    try {
      if (att.data) {
        try {
          const url = new URL(att.data);
          const m = url.pathname.match(/\/object\/public\/project-files\/(.+)/);
          if (m) await deleteFile(m[1]);
        } catch {}
      }
      await deleteAttachmentAsync(att.id);
      onRefresh();
      toast.success("קובץ נמחק");
    } catch { toast.error("שגיאה במחיקה"); }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const viewingAtt = viewerIndex !== null ? attachments[viewerIndex] : null;

  return (
    <div dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip size={15} style={{ color }} className="flex-shrink-0" />
        <span className="text-sm font-bold" style={{ color }}>מסמכים מצורפים</span>
        <span className="text-xs text-muted-foreground">({attachments.length})</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mr-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: color }}
          title="הוסף קובץ"
        >
          <Plus size={12} /> {uploading ? "מעלה..." : "הוסף"}
        </button>
      </div>

      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      {/* Drop zone */}
      <div
        className={`rounded-xl border-2 border-dashed p-3 transition-colors min-h-[60px] ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
      >
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground text-xs">
            <Paperclip size={20} className="mb-1 opacity-40" />
            <span>גרור קבצים לכאן או לחץ "הוסף"</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, i) => {
              const ft = getFileType(att.data);
              return (
                <div key={att.id} className="relative group flex flex-col items-center w-20 cursor-pointer" onClick={() => setViewerIndex(i)}>
                  <div className="w-16 h-16 rounded-lg border border-border overflow-hidden flex items-center justify-center bg-muted/30">
                    {ft === "image" && <img src={att.data} alt={att.name} className="w-full h-full object-cover" />}
                    {ft === "pdf" && <FileText size={22} className="text-red-400" />}
                    {ft === "video" && <Film size={22} className="text-purple-400" />}
                    {ft === "other" && <FileSpreadsheet size={22} className="text-blue-400" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">{att.name}</span>
                  <button
                    title="מחק"
                    className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Viewer modal */}
      {viewingAtt && viewerIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setViewerIndex(null)}>
          <div className="relative bg-card rounded-xl shadow-2xl overflow-hidden" style={{ maxWidth: "90vw", maxHeight: "90vh", width: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
              <span className="text-sm font-semibold text-foreground">{viewingAtt.name}</span>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">{viewerIndex + 1} / {attachments.length}</span>
                {attachments.length > 1 && (
                  <>
                    <button title="הקודם" className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted" onClick={() => setViewerIndex((viewerIndex - 1 + attachments.length) % attachments.length)}><ChevronRight size={16} /></button>
                    <button title="הבא" className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted" onClick={() => setViewerIndex((viewerIndex + 1) % attachments.length)}><ChevronLeft size={16} /></button>
                  </>
                )}
                <button title="הורד" className="h-7 px-2 rounded text-xs border border-border text-muted-foreground hover:bg-muted flex items-center gap-1" onClick={() => void downloadFile(viewingAtt.data, viewingAtt.name)}>
                  <Download size={12} /> הורד
                </button>
                <button title="סגור" className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setViewerIndex(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center" style={{ maxHeight: "calc(90vh - 48px)", overflow: "auto" }}>
              {(() => {
                const ft = getFileType(viewingAtt.data);
                if (ft === "image") return <img src={viewingAtt.data} alt={viewingAtt.name} className="max-w-full max-h-[80vh] object-contain" />;
                if (ft === "video") return <video src={viewingAtt.data} controls autoPlay className="max-w-full max-h-[80vh]" />;
                if (ft === "pdf") return (
                  <div className="flex flex-col items-center p-12">
                    <FileText size={48} className="text-red-400 mb-4" />
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium" onClick={() => void openFileInNewTab(viewingAtt.data)}>פתח PDF</button>
                  </div>
                );
                return (
                  <div className="flex flex-col items-center p-12">
                    <FileSpreadsheet size={48} className="text-blue-400 mb-4" />
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium" onClick={() => void downloadFile(viewingAtt.data, viewingAtt.name)}>הורד קובץ</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
