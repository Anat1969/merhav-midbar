import React, { useState, useCallback, useEffect } from "react";
import { Camera } from "lucide-react";

interface FileDropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  currentSrc?: string | null;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFile, accept = "image/*,video/*,application/pdf,.pptx,.docx", currentSrc, label = "תמונה", className = "", style, children,
}) => {
  const [dragging, setDragging] = useState(false);
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

  // Attach paste listener when this zone is focused / hovered
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) return;
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [focused, onPaste]);

  const isImage = currentSrc && (currentSrc.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentSrc));

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center justify-center cursor-pointer transition-colors relative ${className}`}
      style={{
        ...style,
        outline: dragging ? "2px dashed #3B82F6" : undefined,
        background: dragging ? "#EFF6FF" : style?.background,
      }}
      title={`גרור, הדבק או לחץ — ${label}`}
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
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
      {children ? children : currentSrc ? (
        isImage ? (
          <img src={currentSrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <span className="text-2xl mb-1">📎</span>
            <span className="text-[10px] text-gray-500">קובץ מצורף</span>
          </div>
        )
      ) : (
        <>
          <Camera size={18} className="text-gray-300 mb-1" />
          <span className="text-[10px] text-gray-400">{label}</span>
          <span className="text-[9px] text-gray-300 mt-0.5">גרור / הדבק</span>
        </>
      )}
    </div>
  );
};
