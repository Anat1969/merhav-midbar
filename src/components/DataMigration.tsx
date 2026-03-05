import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadBinuiProjects, BinuiProject } from "@/lib/binuiConstants";
import { loadGenericProjects, GenericProject, PITUA_CONFIG, MEYADIM_CONFIG, PEULOT_CONFIG } from "@/lib/domainConstants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface MigrationLog {
  message: string;
  type: "info" | "success" | "error";
}

const GENERIC_DOMAINS = [
  { config: PITUA_CONFIG, key: "pitua" },
  { config: MEYADIM_CONFIG, key: "meyadim" },
  { config: PEULOT_CONFIG, key: "peulot" },
];

export const DataMigration: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void }> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [migrating, setMigrating] = useState(false);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [done, setDone] = useState(false);

  const log = (message: string, type: MigrationLog["type"] = "info") => {
    setLogs((prev) => [...prev, { message, type }]);
  };

  const migrate = async () => {
    setMigrating(true);
    setLogs([]);
    setDone(false);

    try {
      // --- Binui projects ---
      const binuiProjects = loadBinuiProjects();
      log(`נמצאו ${binuiProjects.length} פרויקטי מבנים ב-localStorage`);

      for (const p of binuiProjects) {
        const { error } = await supabase.from("binui_projects").insert({
          name: p.name,
          category: p.category,
          sub: p.sub,
          status: p.status,
          created: p.created,
          note: p.note,
          history: p.history as any,
          details: p.details as any,
          images: p.images as any,
        });
        if (error) {
          log(`❌ שגיאה בהעברת "${p.name}": ${error.message}`, "error");
        } else {
          log(`✅ "${p.name}" הועבר בהצלחה`, "success");
        }
      }

      // --- Generic projects ---
      for (const domain of GENERIC_DOMAINS) {
        const projects = loadGenericProjects(domain.config.storageKey);
        log(`נמצאו ${projects.length} פרויקטי ${domain.config.domainName} ב-localStorage`);

        for (const p of projects) {
          const { error } = await supabase.from("generic_projects").insert({
            domain: domain.key,
            name: p.name,
            poetic_name: p.poeticName || "",
            poem: p.poem || "",
            category: p.category,
            sub: p.sub,
            status: p.status,
            created: p.created,
            note: p.note,
            description: p.description || "",
            document: p.document || "",
            task: p.task || "",
            decision: p.decision || "",
            history: p.history as any,
            tracking: p.tracking as any,
            initiator: p.initiator || "",
            image: p.image,
          });
          if (error) {
            log(`❌ שגיאה בהעברת "${p.name}": ${error.message}`, "error");
          } else {
            log(`✅ "${p.name}" (${domain.config.domainName}) הועבר`, "success");
          }
        }
      }

      const totalLocal = binuiProjects.length + GENERIC_DOMAINS.reduce((s, d) => s + loadGenericProjects(d.config.storageKey).length, 0);
      if (totalLocal === 0) {
        log("לא נמצאו נתונים ב-localStorage להעברה", "info");
      } else {
        log(`✅ ההעברה הסתיימה! סה"כ ${totalLocal} רשומות`, "success");
        toast.success("הנתונים הועברו בהצלחה ל-Cloud");
      }
      // Invalidate all queries to refresh UI
      qc.invalidateQueries();
      setDone(true);
    } catch (err: any) {
      log(`❌ שגיאה כללית: ${err.message}`, "error");
      toast.error("שגיאה בהעברת הנתונים");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            העברת נתונים מ-localStorage ל-Cloud
          </DialogTitle>
          <DialogDescription>
            כלי זה יקרא את כל הנתונים השמורים ב-localStorage ויעביר אותם למסד הנתונים בענן. הנתונים המקוריים לא יימחקו.
          </DialogDescription>
        </DialogHeader>

        {logs.length > 0 && (
          <div className="flex-1 overflow-y-auto border rounded-md p-3 bg-muted/30 text-sm space-y-1 max-h-60">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                {l.type === "success" && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />}
                {l.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                {l.type === "info" && <span className="w-4 h-4 shrink-0" />}
                <span className={l.type === "error" ? "text-red-700" : ""}>{l.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          {!done && (
            <Button onClick={migrate} disabled={migrating}>
              {migrating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {migrating ? "מעביר..." : "התחל העברה"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {done ? "סגור" : "ביטול"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
