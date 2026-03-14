import React, { useState, useRef } from "react";
import { Images, Plus, Upload, Trash2, X, PenLine, ChevronDown, ChevronUp } from "lucide-react";

export interface GalleryImage {
  id: string;
  url: string;
  label: string;
  description?: string;
}

export interface AIGallery {
  id: string;
  name: string;
  description?: string;
  images: GalleryImage[];
  createdAt: string;
}

interface AIGalleryManagerProps {
  domainName: string;
  galleries: AIGallery[];
  onUpdate: (galleries: AIGallery[]) => void;
  color?: string;
}

function generateId() {
  return `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDateNow() {
  return new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

// [UPGRADE: ai-gallery] AI Galleries module — accessible from every domain section
// - Create galleries with name + description
// - Upload images via drag-and-drop or file picker
// - Each image has preview, title, optional description
// - Responsive image-first grid layout
export const AIGalleryManager: React.FC<AIGalleryManagerProps> = ({
  domainName,
  galleries,
  onUpdate,
  color = "#2C6E6A",
}) => {
  const [open, setOpen] = useState(false);
  const [activeGallery, setActiveGallery] = useState<string | null>(null);
  const [newGalleryName, setNewGalleryName] = useState("");
  const [newGalleryDesc, setNewGalleryDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createGallery = () => {
    if (!newGalleryName.trim()) return;
    const g: AIGallery = {
      id: generateId(),
      name: newGalleryName.trim(),
      description: newGalleryDesc.trim() || undefined,
      images: [],
      createdAt: getDateNow(),
    };
    const updated = [...galleries, g];
    onUpdate(updated);
    setNewGalleryName(""); setNewGalleryDesc(""); setAdding(false);
    setActiveGallery(g.id);
  };

  const deleteGallery = (id: string) => {
    onUpdate(galleries.filter((g) => g.id !== id));
    if (activeGallery === id) setActiveGallery(null);
  };

  const addImageToGallery = (galleryId: string, file: File, label?: string) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const img: GalleryImage = {
        id: generateId(),
        url,
        label: label || file.name.replace(/\.[^.]+$/, ""),
      };
      const updated = galleries.map((g) =>
        g.id === galleryId ? { ...g, images: [...g.images, img] } : g
      );
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (galleryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => addImageToGallery(galleryId, f));
    e.target.value = "";
  };

  const handleDrop = (galleryId: string, e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    Array.from(files).filter((f) => f.type.startsWith("image/")).forEach((f) => addImageToGallery(galleryId, f));
  };

  const removeImage = (galleryId: string, imageId: string) => {
    const updated = galleries.map((g) =>
      g.id === galleryId ? { ...g, images: g.images.filter((i) => i.id !== imageId) } : g
    );
    onUpdate(updated);
  };

  const updateImageLabel = (galleryId: string, imageId: string, label: string) => {
    const updated = galleries.map((g) =>
      g.id === galleryId
        ? { ...g, images: g.images.map((i) => i.id === imageId ? { ...i, label } : i) }
        : g
    );
    onUpdate(updated);
  };

  const updateGalleryName = (id: string, name: string) => {
    onUpdate(galleries.map((g) => g.id === id ? { ...g, name } : g));
  };

  const currentGallery = galleries.find((g) => g.id === activeGallery);

  return (
    <div className="mt-4" dir="rtl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-base transition-all hover:shadow-sm"
        style={{ borderColor: `${color}40`, color, background: `${color}08` }}
      >
        <Images size={18} />
        <span>גלריות AI — {domainName}</span>
        <span className="rounded-full text-xs px-2 py-0.5 font-black" style={{ background: color, color: "white" }}>
          {galleries.length}
        </span>
        <span className="mr-auto text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden animate-scale-in">
          {/* Gallery list sidebar + main area */}
          <div className="flex min-h-[300px]" style={{ direction: "rtl" }}>
            {/* Sidebar — gallery list */}
            <div className="w-48 border-l border-border/40 bg-gray-50/60 flex flex-col flex-shrink-0">
              <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">גלריות</span>
                <button
                  onClick={() => setAdding(true)}
                  className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-gray-200"
                  title="גלריה חדשה"
                >
                  <Plus size={14} className="text-gray-600" />
                </button>
              </div>

              {/* New gallery form */}
              {adding && (
                <div className="px-3 py-2 border-b border-border/40 bg-white flex flex-col gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    className="h-7 w-full rounded border border-gray-200 px-2 text-sm"
                    placeholder="שם גלריה..."
                    value={newGalleryName}
                    onChange={(e) => setNewGalleryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createGallery(); if (e.key === "Escape") setAdding(false); }}
                    dir="rtl"
                  />
                  <input
                    type="text"
                    className="h-7 w-full rounded border border-gray-200 px-2 text-xs"
                    placeholder="תיאור (אופציונלי)..."
                    value={newGalleryDesc}
                    onChange={(e) => setNewGalleryDesc(e.target.value)}
                    dir="rtl"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={createGallery}
                      className="flex-1 h-6 rounded text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      צור
                    </button>
                    <button
                      onClick={() => setAdding(false)}
                      className="h-6 w-6 rounded border border-gray-200 flex items-center justify-center text-gray-400"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery list */}
              <div className="flex-1 overflow-y-auto">
                {galleries.length === 0 && !adding && (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">
                    <Images size={20} className="mx-auto mb-1 text-gray-300" />
                    <p>אין גלריות</p>
                  </div>
                )}
                {galleries.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGallery(g.id)}
                    className="group w-full px-3 py-2.5 text-right flex items-center justify-between transition-colors border-b border-border/20"
                    style={activeGallery === g.id
                      ? { background: `${color}12`, borderRight: `3px solid ${color}` }
                      : { background: "transparent", borderRight: "3px solid transparent" }
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{g.name}</p>
                      <p className="text-[11px] text-gray-400">{g.images.length} תמונות</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteGallery(g.id); }}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                      title="מחק גלריה"
                    >
                      <Trash2 size={11} />
                    </button>
                  </button>
                ))}
              </div>
            </div>

            {/* Main — gallery content */}
            <div className="flex-1 overflow-hidden">
              {!currentGallery ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                  <Images size={40} className="mb-3 text-gray-300" />
                  <p className="text-sm font-medium">בחר גלריה מהרשימה</p>
                  <p className="text-xs mt-1">או צור גלריה חדשה לחיצה על +</p>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Gallery header */}
                  <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        className="text-base font-bold text-gray-800 bg-transparent border-none outline-none w-full inline-editable"
                        value={currentGallery.name}
                        onChange={(e) => updateGalleryName(currentGallery.id, e.target.value)}
                        dir="rtl"
                      />
                      {currentGallery.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{currentGallery.description}</p>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileSelect(currentGallery.id, e)}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 flex-shrink-0"
                      style={{ background: color }}
                    >
                      <Upload size={13} /> העלה תמונות
                    </button>
                  </div>

                  {/* Image grid */}
                  <div
                    className="flex-1 overflow-y-auto p-4"
                    onDrop={(e) => handleDrop(currentGallery.id, e)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {currentGallery.images.length === 0 ? (
                      <div
                        className="h-full min-h-[200px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload size={28} className="mb-2 text-gray-300" />
                        <p className="text-sm font-medium">גרור תמונות לכאן</p>
                        <p className="text-xs mt-1">או לחץ להעלאה</p>
                      </div>
                    ) : (
                      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                        {currentGallery.images.map((img) => (
                          <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border/40 hover:shadow-md transition-shadow">
                            <div className="aspect-square overflow-hidden bg-gray-100">
                              <img
                                src={img.url}
                                alt={img.label}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                            {/* [UPGRADE: ai-gallery] Inline editable label */}
                            <div className="px-2 py-1.5">
                              <input
                                type="text"
                                className="w-full text-xs font-semibold text-gray-700 bg-transparent border-none outline-none inline-editable"
                                value={img.label}
                                onChange={(e) => updateImageLabel(currentGallery.id, img.id, e.target.value)}
                                dir="rtl"
                              />
                            </div>
                            <button
                              onClick={() => removeImage(currentGallery.id, img.id)}
                              className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center transition-all shadow-md"
                              title="הסר תמונה"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        {/* Upload more tile */}
                        <div
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors text-gray-400"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Plus size={20} />
                          <span className="text-xs mt-1">הוסף</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
