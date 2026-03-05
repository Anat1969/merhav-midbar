import React, { useState } from "react";
import { loadBinuiProjects } from "@/lib/binuiConstants";
import { loadGenericProjects, PITUA_CONFIG, MEYADIM_CONFIG, PEULOT_CONFIG } from "@/lib/domainConstants";
import { DataMigration } from "@/components/DataMigration";
import { Upload } from "lucide-react";

const STORAGE_KEY_MAP: Record<string, string> = {
  "מבנים": "__binui__",
  "פיתוח": PITUA_CONFIG.storageKey,
  "מיידעים": MEYADIM_CONFIG.storageKey,
  "פעולות": PEULOT_CONFIG.storageKey,
};

interface EmptyStateProps {
  domainName: string;
  storageKey?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ domainName, storageKey }) => {
  const [migrationOpen, setMigrationOpen] = useState(false);

  // Check if there's local data
  let localCount = 0;
  try {
    if (domainName === "מבנים") {
      localCount = loadBinuiProjects().length;
    } else {
      const key = storageKey || STORAGE_KEY_MAP[domainName];
      if (key && key !== "__binui__") {
        localCount = loadGenericProjects(key).length;
      }
    }
  } catch {}

  if (localCount > 0) {
    return (
      <>
        <div className="text-center py-16">
          <div className="text-5xl mb-3">☁️</div>
          <div className="text-lg font-semibold text-foreground">
            יש {localCount} פרויקטים מקומיים שטרם הועברו לענן
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            הנתונים קיימים בדפדפן שלך אך טרם הועברו למסד הנתונים בענן
          </div>
          <button
            onClick={() => setMigrationOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            העבר נתונים לענן
          </button>
        </div>
        <DataMigration open={migrationOpen} onOpenChange={setMigrationOpen} />
      </>
    );
  }

  return (
    <div className="text-center py-20 text-muted-foreground">
      <div className="text-5xl mb-3">📂</div>
      <div className="text-lg">אין פרויקטים להצגה</div>
      <div className="text-sm mt-1">הוסף פרויקט חדש מהשורה למעלה</div>
    </div>
  );
};
