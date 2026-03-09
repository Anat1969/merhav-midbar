import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Lightbulb, Loader2, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProjectFile } from "@/lib/fileStorage";
import { toast } from "sonner";

interface IdeaCard {
  id: number;
  name: string;
  image_url: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IdeaCardsManager: React.FC<Props> = ({ isOpen, onClose }) => {
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("idea_cards" as any)
      .select("*")
      .order("name", { ascending: true });
    const sorted = ((data as any as IdeaCard[]) || []).sort((a, b) =>
      a.name.localeCompare(b.name, "he", { sensitivity: "base" })
    );
    setCards(sorted);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchCards();
  }, [isOpen]);

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("יש להזין שם לכרטיס"); return; }
    setUploading(true);
    try {
      let imgUrl = "";
      if (imageFile) {
        imgUrl = await uploadProjectFile(imageFile, "binui", 0);
      }

      const { error } = await supabase.from("idea_cards" as any).insert({
        name: name.trim(),
        image_url: imgUrl,
      } as any);

      if (error) throw error;
      toast.success("כרטיס רעיון נוסף בהצלחה");
      setName("");
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchCards();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהוספת כרטיס");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("למחוק כרטיס זה?")) return;
    await supabase.from("idea_cards" as any).delete().eq("id", id);
    fetchCards();
  };

  const uploadImageForCard = async (cardId: number, file: File) => {
    setUploading(true);
    try {
      const url = await uploadProjectFile(file, "binui", 0);
      await supabase.from("idea_cards" as any).update({ image_url: url } as any).eq("id", cardId);
      toast.success("התמונה הועלתה");
      fetchCards();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Lightbulb className="h-5 w-5" style={{ color: "#E67E22" }} />
              💡 כרטיסי רעיונות
            </DialogTitle>
          </DialogHeader>

          {/* Add form */}
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "#E67E2244", background: "#E67E2208" }}>
            <div className="text-sm font-bold" style={{ color: "#E67E22" }}>➕ הוספת כרטיס חדש</div>
            <div className="flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הכרטיס..." className="h-8 text-sm flex-1" />
              <label className="cursor-pointer shrink-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <span className="inline-flex items-center gap-1 h-8 px-3 text-xs border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                  <Image className="h-3 w-3" />
                  {imageFile ? imageFile.name.slice(0, 15) + "..." : "בחר תמונה"}
                </span>
              </label>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={uploading || !name.trim()}
                className="h-8 text-xs font-bold shrink-0"
                style={{ background: "#E67E22" }}
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                הוסף
              </Button>
            </div>
          </div>

          {/* Cards carousel */}
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">טוען...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">אין כרטיסים — הוסף את הראשון</div>
          ) : (
            <div className="relative mt-2">
              <ScrollArea className="w-full" dir="rtl">
                <div className="flex gap-3 pb-4 px-1" style={{ direction: "rtl" }}>
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="relative rounded-lg border overflow-hidden group hover:shadow-md transition-shadow cursor-pointer shrink-0"
                      style={{ width: "180px" }}
                      onClick={() => {
                        if (card.image_url) {
                          setPreviewUrl(card.image_url);
                          setPreviewName(card.name);
                        }
                      }}
                    >
                      {card.image_url ? (
                        <div className="aspect-[4/3] bg-muted">
                          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <label className="aspect-[4/3] bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImageForCard(card.id, file);
                              e.target.value = "";
                            }}
                          />
                          <div className="text-center text-muted-foreground">
                            <Image className="h-8 w-8 mx-auto mb-1 opacity-50" />
                            <span className="text-xs">העלה תמונה</span>
                          </div>
                        </label>
                      )}
                      <div className="p-2 bg-background">
                        <div className="text-xs font-medium truncate" style={{ color: "#E67E22" }}>{card.name}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                        className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg text-white text-sm font-medium">
            {previewName}
          </div>
          <img
            src={previewUrl}
            alt={previewName}
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
