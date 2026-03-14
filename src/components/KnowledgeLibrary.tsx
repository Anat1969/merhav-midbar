import React, { useState, useRef } from "react";
import { Library, Upload, Link2, FileText, Image, File, Trash2, Tag, Calendar, Plus, X } from "lucide-react";

export interface KnowledgeItem {
  id: string;
  title: string;
  type: "document" | "image" | "link" | "other";
  url?: string;
  linkUrl?: string;
  fileName?: string;
  notes?: string;
  tags?: string[];
  uploadDate: string;
}

interface KnowledgeLibraryProps {
  domainName: string;
  items: KnowledgeItem[];
  onUpdate: (items: KnowledgeItem[]) => void;
  color?: string;
}

const TYPE_ICONS: Record<KnowledgeItem["type"], React.ReactNode> = {
  document: <FileText size={18} className="text-blue-500" />,
  image:    <Image size={18} className="text-green-500" />,
  link:     <Link2 size={18} className="text-purple-500" />,
  other:    <File size={18} className="text-gray-400" />,
};

const TYPE_LABELS: Record<KnowledgeItem["type"], string> = {
  document: "מסמך",
  image:    "תמונה",
  link:     "קישור",
  other:    "אחר",
};

function generateId() {
  return `ki-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getHebrewDateNow() {
  return new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

function detectType(file: File): KnowledgeItem["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.endsWith(".docx") || file.name.endsWith(".xlsx") || file.name.endsWith(".pptx")) return "document";
  return "other";
}

// [UPGRADE: knowledge-library] Professional Knowledge Library for every domain
// - Upload documents, images, any file type
// - Save external links with title and URL
// - Filter by type, date, tag
// - Auto-save all entries
export const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({
  domainName,
  items,
  onUpdate,
  color = "#2C6E6A",
}) => {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<KnowledgeItem["type"] | "all">("all");
  const [newTitle, setNewTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newTag, setNewTag] = useState("");
  const [addMode, setAddMode] = useState<"file" | "link" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filterType === "all" ? items : items.filter((i) => i.type === filterType);

  const addLinkItem = () => {
    if (!newTitle.trim() || !newLinkUrl.trim()) return;
    const item: KnowledgeItem = {
      id: generateId(),
      title: newTitle.trim(),
      type: "link",
      linkUrl: newLinkUrl.trim(),
      notes: newNotes.trim() || undefined,
      tags: newTag.trim() ? [newTag.trim()] : [],
      uploadDate: getHebrewDateNow(),
    };
    onUpdate([...items, item]);
    setNewTitle(""); setNewLinkUrl(""); setNewNotes(""); setNewTag("");
    setAddMode(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const item: KnowledgeItem = {
        id: generateId(),
        title: newTitle.trim() || file.name,
        type: detectType(file),
        url: dataUrl,
        fileName: file.name,
        notes: newNotes.trim() || undefined,
        tags: newTag.trim() ? [newTag.trim()] : [],
        uploadDate: getHebrewDateNow(),
      };
      onUpdate([...items, item]);
      setNewTitle(""); setNewNotes(""); setNewTag("");
      setAddMode(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const item: KnowledgeItem = {
        id: generateId(),
        title: file.name,
        type: detectType(file),
        url: dataUrl,
        fileName: file.name,
        uploadDate: getHebrewDateNow(),
      };
      onUpdate([...items, item]);
    };
    reader.readAsDataURL(file);
  };

  const removeItem = (id: string) => {
    onUpdate(items.filter((i) => i.id !== id));
  };

  const updateNotes = (id: string, notes: string) => {
    onUpdate(items.map((i) => i.id === id ? { ...i, notes } : i));
  };

  return (
    <div className="mt-4" dir="rtl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-base transition-all hover:shadow-sm"
        style={{ borderColor: `${color}40`, color, background: `${color}08` }}
      >
        <Library size={18} />
        <span>ספריית ידע — {domainName}</span>
        <span className="rounded-full text-xs px-2 py-0.5 font-black" style={{ background: color, color: "white" }}>
          {items.length}
        </span>
        <span className="mr-auto text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden animate-scale-in">
          {/* Filter bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-gray-50/50 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">סנן:</span>
            {(["all", "document", "image", "link", "other"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={filterType === t
                  ? { background: color, color: "white", borderColor: color }
                  : { background: "white", color: "#6B7280", borderColor: "#E0E0D8" }
                }
              >
                {t === "all" ? "הכל" : TYPE_LABELS[t]}
              </button>
            ))}

            {/* Add buttons */}
            <div className="mr-auto flex gap-2">
              <button
                onClick={() => setAddMode(addMode === "file" ? null : "file")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
                style={{ background: color }}
                title="העלה קובץ"
              >
                <Upload size={13} /> קובץ
              </button>
              <button
                onClick={() => setAddMode(addMode === "link" ? null : "link")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={{ borderColor: `${color}50`, color }}
                title="הוסף קישור חיצוני"
              >
                <Link2 size={13} /> קישור
              </button>
            </div>
          </div>

          {/* Add form */}
          {addMode === "link" && (
            <div className="px-4 py-3 border-b border-border/40 bg-blue-50/30 flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  className="h-9 flex-1 min-w-[160px] rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder="כותרת..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  dir="rtl"
                />
                <input
                  type="url"
                  className="h-9 flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "left" }}
                />
                <input
                  type="text"
                  className="h-9 w-28 rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder="תגית..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  dir="rtl"
                />
                <button
                  onClick={addLinkItem}
                  className="h-9 px-4 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110"
                  style={{ background: color }}
                >
                  שמור
                </button>
                <button
                  onClick={() => setAddMode(null)}
                  className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                placeholder="הערות אופציונליות..."
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                dir="rtl"
              />
            </div>
          )}

          {addMode === "file" && (
            <div
              className="px-4 py-3 border-b border-border/40"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="flex gap-2 flex-wrap mb-2">
                <input
                  type="text"
                  className="h-9 flex-1 min-w-[160px] rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder="כותרת (אופציונלי — ברירת מחדל: שם קובץ)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  dir="rtl"
                />
                <input
                  type="text"
                  className="h-9 w-28 rounded-lg border border-gray-200 px-3 text-sm"
                  placeholder="תגית..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 font-medium">גרור קובץ לכאן או לחץ להעלאה</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, PPTX, תמונות וכל סוג קובץ</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="*/*"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Items list */}
          <div className="divide-y divide-border/30">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <Library size={32} className="mx-auto mb-2 text-gray-300" />
                <p>הספרייה ריקה — העלה קבצים או הוסף קישורים</p>
              </div>
            )}
            {filtered.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors group">
                <div className="mt-0.5 flex-shrink-0">{TYPE_ICONS[item.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Title / Link */}
                    {item.type === "link" && item.linkUrl ? (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-primary hover:underline truncate"
                      >
                        {item.title}
                      </a>
                    ) : item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-gray-700 hover:text-primary hover:underline truncate"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span className="font-semibold text-sm text-gray-700 truncate">{item.title}</span>
                    )}
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: `${color}15`, color }}
                    >
                      {TYPE_LABELS[item.type]}
                    </span>
                    {item.tags?.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-1">
                        <Tag size={9} /> {tag}
                      </span>
                    ))}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.notes}</p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={10} className="text-gray-300" />
                    <span className="text-[11px] text-gray-400">{item.uploadDate}</span>
                    {item.fileName && (
                      <span className="text-[11px] text-gray-400">• {item.fileName}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                  title="הסר פריט"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
