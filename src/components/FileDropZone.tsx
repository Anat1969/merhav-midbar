import React, { useState, useCallback, useEffect } from "react";
import { Camera, Eye, X, Download, Trash2, FileText, Film, FileSpreadsheet } from "lucide-react";

function getFileType(src: string): "image" | "video" | "pdf" | "other" {
  if (src.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src)) return "image";
  if (src.startsWith("data:video") || /\.(mp4|webm|ogg|mov)$/i.test(src)) return "video";
  if (src.startsWith("data:application/pdf") || /\.pdf$/i.test(src)) return "pdf";
  return "other";
}

function getFileIcon(src: string) {
  const t = getFileType(src);
  if (t === "video") return <Film size={22} className="text-purple-400" />;
  if (t === "pdf") return <FileText size={22} className="text-red-400" />;
  return <FileSpreadsheet size={22} className="text-blue-400" />;
}

interface FileDropZoneProps {
  onFile: (file: File) => void;
  onDelete?: () => void;
  accept?: string;
  currentSrc?: string | null;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFile, onDelete, accept = "image/*,video/*,application/pdf,.pptx,.docx,.xlsx", currentSrc, label = "תמונה", className = "", style, children,
}) => {
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const onPaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) { onFile(file); break; }
      }
    }
  }, [onFile]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) return;
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [focused, onPaste]);

  const fileType = currentSrc ? getFileType(currentSrc) : null;

  const handleClick = (e: React.MouseEvent) => {
    if (currentSrc) {
      e.stopPropagation();
      setViewing(true);
    } else {
      inputRef.current?.click();
    }
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSrc) return;
    const a = document.createElement("a");
    a.href = currentSrc;
    const ext = fileType === "pdf" ? "pdf" : fileType === "video" ? "mp4" : fileType === "image" ? "png" : "bin";
    a.download = `${label}.${ext}`;
    a.click();
  };

  /* ─── Thumbnail preview ─── */
  const renderThumbnail = () => {
    if (!currentSrc) return (
      <>
        <Camera size={18} className="text-gray-300 mb-1" />
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-[9px] text-gray-300 mt-0.5">גרור / הדבק</span>
      </>
    );

    return (
      <div className="relative w-full h-full flex items-center justify-center group">
        {fileType === "image" && (
          <img src={currentSrc} alt={label} className="w-full h-full object-cover" />
        )}
        {fileType === "video" && (
          <video src={currentSrc} className="w-full h-full object-cover" muted />
        )}
        {fileType === "pdf" && (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <FileText size={28} className="text-red-400 mb-1" />
            <span className="text-[10px] text-gray-500">PDF</span>
          </div>
        )}
        {fileType === "other" && (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            {getFileIcon(currentSrc)}
            <span className="text-[10px] text-gray-500 mt-1">קובץ מצורף</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button title="צפה" className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors" onClick={handleClick}>
            <Eye size={14} />
          </button>
          <button title="החלף" className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors" onClick={handleReplace}>
            <Camera size={14} />
          </button>
          <button title="הורד" className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors" onClick={handleDownload}>
            <Download size={14} />
          </button>
          {onDelete && (
            <button title="מחק" className="h-7 w-7 rounded-full bg-red-500/90 flex items-center justify-center text-white hover:bg-red-600 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`flex flex-col items-center justify-center cursor-pointer transition-colors relative ${className}`}
        style={{
          ...style,
          outline: dragging ? "2px dashed #3B82F6" : undefined,
          background: dragging ? "#EFF6FF" : style?.background,
        }}
        title={currentSrc ? `לחץ לצפייה — ${label}` : `גרור, הדבק או לחץ — ${label}`}
        tabIndex={0}
        onClick={currentSrc ? handleClick : () => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setFocused(true)}
        onMouseLeave={() => setFocused(false)}
      >
        <input
          type="file"
          accept={accept}
          className="hidden"
          ref={inputRef}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {children || renderThumbnail()}
      </div>

      {/* ─── Fullscreen viewer modal ─── */}
      {viewing && currentSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => setViewing(false)}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
              if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) { onFile(file); break; }
              }
            }
          }}
          tabIndex={0}
          style={{ direction: "rtl", outline: dragging ? "3px dashed #3B82F6" : undefined }}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl overflow-hidden"
            style={{ maxWidth: "90vw", maxHeight: "90vh", width: fileType === "pdf" ? 800 : undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <div className="flex gap-2">
                <button title="החלף קובץ" className="h-7 px-2 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1" onClick={handleReplace}>
                  <Camera size={12} /> החלף
                </button>
                <button title="הורד" className="h-7 px-2 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1" onClick={handleDownload}>
                  <Download size={12} /> הורד
                </button>
                <button title="סגור" className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors" onClick={() => setViewing(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex items-center justify-center" style={{ maxHeight: "calc(90vh - 48px)", overflow: "auto" }}>
              {fileType === "image" && (
                <img src={currentSrc} alt={label} className="max-w-full max-h-[80vh] object-contain" />
              )}
              {fileType === "video" && (
                <video src={currentSrc} controls autoPlay className="max-w-full max-h-[80vh]" />
              )}
              {fileType === "pdf" && (
                <iframe src={currentSrc} title={label} className="w-full" style={{ height: "80vh" }} />
              )}
              {fileType === "other" && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  {getFileIcon(currentSrc)}
                  <span className="text-sm text-gray-500 mt-3">סוג קובץ זה אינו נתמך לצפייה ישירה</span>
                  <button
                    title="הורד קובץ"
                    className="mt-4 h-8 px-4 rounded-lg text-white text-xs font-bold"
                    style={{ background: "#3B82F6" }}
                    onClick={handleDownload}
                  >
                    הורד קובץ
                  </button>
                </div>
              )}
            </div>
          </div>
          {dragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-white/90 text-blue-600 font-bold px-6 py-3 rounded-xl shadow-lg text-lg">שחרר כדי להחליף קובץ</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
