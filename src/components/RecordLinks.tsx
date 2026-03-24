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
    const updated = [...localLinks, { id: generateId(), url: "", viewUrl: "", label: "" }];
    setLocalLinks(updated);
    onUpdate(updated);
  };

  const removeLink = (id: string) => {
    const updated = localLinks.filter((l) => l.id !== id);
    setLocalLinks(updated);
    isDirtyRef.current = false;
    onUpdate(updated);
  };

  const changeField = (id: string, field: "url" | "viewUrl" | "label", value: string) => {
    isDirtyRef.current = true;
    setLocalLinks((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const hasLinks = localLinks.length > 0 && localLinks.some((l) => l.url.trim() || (l.viewUrl || "").trim());

  if (!isWorkMode && !hasLinks) return null;

  return (
    <div className="links-section" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={15} className="text-primary flex-shrink-0" />
        <span className="text-sm font-bold text-muted-foreground">קישורים</span>
        {isWorkMode && (
          <button
            onClick={addLink}
            className="mr-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold bg-primary text-primary-foreground transition-all hover:opacity-90"
            title="הוסף קישור"
          >
            <Plus size={12} /> הוסף
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {localLinks.map((link) => (
          <div key={link.id} className="link-entry">
            {isWorkMode ? (
              <div className="flex flex-col gap-1.5 w-full">
                {/* Label */}
                <input
                  type="text"
                  className="h-8 w-full rounded border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                  style={{ direction: "rtl" }}
                  placeholder="תיאור הקישור..."
                  value={link.label}
                  onChange={(e) => changeField(link.id, "label", e.target.value)}
                  onBlur={flush}
                />
                {/* Row: Work link + View link + Delete */}
                <div className="flex items-center gap-1.5">
                  {/* Work link */}
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="url"
                      className="h-8 flex-1 rounded border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring min-w-0"
                      style={{ direction: "ltr", textAlign: "left" }}
                      placeholder="קישור עבודה..."
                      value={link.url}
                      onChange={(e) => changeField(link.id, "url", e.target.value)}
                      onBlur={flush}
                    />
                    {link.url.trim() && (
                      <button
                        onClick={() => openExternalLink(link.url)}
                        className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity flex-shrink-0"
                        title="פתח קישור עבודה"
                      >
                        <Link2 size={13} />
                        🔗
                      </button>
                    )}
                  </div>
                  {/* View link */}
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="url"
                      className="h-8 flex-1 rounded border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring min-w-0"
                      style={{ direction: "ltr", textAlign: "left" }}
                      placeholder="קישור תצוגה..."
                      value={link.viewUrl || ""}
                      onChange={(e) => changeField(link.id, "viewUrl", e.target.value)}
                      onBlur={flush}
                    />
                    {(link.viewUrl || "").trim() && (
                      <button
                        onClick={() => openExternalLink(link.viewUrl!)}
                        className="h-8 px-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity flex-shrink-0"
                        title="פתח קישור תצוגה"
                      >
                        <ExternalLink size={13} />
                        👁
                      </button>
                    )}
                  </div>
                  {/* Delete */}
                  <button
                    onClick={() => removeLink(link.id)}
                    className="h-7 w-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    title="הסר קישור"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              /* View mode — show both links */
              (link.url.trim() || (link.viewUrl || "").trim()) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground truncate">{link.label || "קישור"}</span>
                  {link.url.trim() && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      title="קישור עבודה"
                    >
                      <Link2 size={12} /> עבודה
                    </a>
                  )}
                  {(link.viewUrl || "").trim() && (
                    <a
                      href={link.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      title="קישור תצוגה"
                    >
                      <ExternalLink size={12} /> תצוגה
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        ))}

        {isWorkMode && localLinks.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-1">אין קישורים — לחץ "הוסף" להוספת קישור ראשון</p>
        )}
      </div>
    </div>
  );
};
