import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, ExternalLink } from "lucide-react";
import { openExternalLink } from "@/lib/fileAccess";

interface SavedLink {
  id: number;
  name: string;
  url: string;
}

const STORAGE_KEY = "dashboard_links";

function loadLinks(): SavedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLinks(links: SavedLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LinksManager: React.FC<Props> = ({ isOpen, onClose }) => {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (isOpen) setLinks(loadLinks());
  }, [isOpen]);

  const addLink = () => {
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) return;
    const finalUrl = trimUrl.startsWith("http") ? trimUrl : `https://${trimUrl}`;
    const updated = [...links, { id: Date.now(), name: trimName, url: finalUrl }];
    setLinks(updated);
    saveLinks(updated);
    setName("");
    setUrl("");
  };

  const removeLink = (id: number) => {
    const updated = links.filter((l) => l.id !== id);
    setLinks(updated);
    saveLinks(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">🔗 קישורים שמורים</DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">שם</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הקישור" className="h-8 text-sm" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">כתובת</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" dir="ltr" />
          </div>
          <Button size="sm" onClick={addLink} className="h-8 px-2" disabled={!name.trim() || !url.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Links list */}
        <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
          {links.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">אין קישורים שמורים</p>}
          {links.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-1.5 text-primary hover:underline truncate">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium">{l.name}</span>
              </a>
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" dir="ltr">{l.url}</span>
              <button onClick={() => removeLink(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
