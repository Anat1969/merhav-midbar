import React, { useState, useCallback } from "react";
import { Link2, Plus, Trash2, ExternalLink } from "lucide-react";
import { openExternalLink } from "@/lib/fileAccess";

export interface LinkEntry {
  id: string;
  url: string;
  viewUrl?: string;
  label: string;
}

interface RecordLinksProps {
  links: LinkEntry[];
  isWorkMode?: boolean;
  onUpdate: (links: LinkEntry[]) => void;
}

function generateId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// [UPGRADE: links] Universal Links section for every record in every domain
// - Clickable in View Mode, editable in Work Mode
// - Auto-save on input change
// - Multiple links per record
export const RecordLinks: React.FC<RecordLinksProps> = ({ links, isWorkMode = false, onUpdate }) => {
  const [localLinks, setLocalLinks] = useState<LinkEntry[]>(links);
  const isDirtyRef = React.useRef(false);

  // Sync parent → local only when not actively editing
  React.useEffect(() => {
    if (!isDirtyRef.current) {
      setLocalLinks(links);
    }
  }, [links]);

  const flush = useCallback(() => {
    if (isDirtyRef.current) {
      isDirtyRef.current = false;
      onUpdate(localLinks);
    }
  }, [localLinks, onUpdate]);

  const addLink = () => {
    const updated = [...localLinks, { id: generateId(), url: "", label: "" }];
    setLocalLinks(updated);
    onUpdate(updated);
  };

  const removeLink = (id: string) => {
    const updated = localLinks.filter((l) => l.id !== id);
    setLocalLinks(updated);
    isDirtyRef.current = false;
    onUpdate(updated);
  };

  const changeField = (id: string, field: "url" | "label", value: string) => {
    isDirtyRef.current = true;
    setLocalLinks((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const hasLinks = localLinks.length > 0 && localLinks.some((l) => l.url.trim());

  if (!isWorkMode && !hasLinks) return null;

  return (
    <div className="links-section" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={15} className="text-primary flex-shrink-0" />
        <span className="text-sm font-bold text-gray-600">קישורים</span>
        {isWorkMode && (
          <button
            onClick={addLink}
            className="mr-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: "#2C6E6A" }}
            title="הוסף קישור"
          >
            <Plus size={12} /> הוסף
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {localLinks.map((link) => (
          <div key={link.id} className="link-entry">
            {isWorkMode ? (
              // [UPGRADE: links] Work mode — editable inline fields
              <>
                <input
                  type="url"
                  className="h-8 flex-1 rounded border border-gray-200 bg-white px-3 text-sm focus:ring-1 focus:ring-primary min-w-0"
                  style={{ direction: "ltr", textAlign: "left" }}
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => changeField(link.id, "url", e.target.value)}
                  onBlur={flush}
                />
                <input
                  type="text"
                  className="h-8 w-36 rounded border border-gray-200 bg-white px-3 text-sm focus:ring-1 focus:ring-primary"
                  style={{ direction: "rtl" }}
                  placeholder="תיאור..."
                  value={link.label}
                  onChange={(e) => changeField(link.id, "label", e.target.value)}
                  onBlur={flush}
                />
                {link.url.trim() && (
                  <button
                    onClick={() => openExternalLink(link.url)}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity flex-shrink-0"
                    title="פתח קישור"
                  >
                    <ExternalLink size={13} />
                    פתח
                  </button>
                )}
                <button
                  onClick={() => removeLink(link.id)}
                  className="h-7 w-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  title="הסר קישור"
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              // [UPGRADE: links] View mode — clickable link
              link.url.trim() && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline truncate"
                  title={link.url}
                >
                  <ExternalLink size={13} className="flex-shrink-0" />
                  <span className="truncate">{link.label || link.url}</span>
                </a>
              )
            )}
          </div>
        ))}

        {isWorkMode && localLinks.length === 0 && (
          <p className="text-xs text-gray-400 italic py-1">אין קישורים — לחץ "הוסף" להוספת קישור ראשון</p>
        )}
      </div>
    </div>
  );
};
