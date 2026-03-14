import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchAllProjectsAsync, SearchResult } from "@/lib/supabaseStorage";
import { STATUS_CONFIG } from "@/lib/hierarchy";

interface GlobalSearchProps {
  onOpenPanel: (domain: string, category: string, sub: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onOpenPanel }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length > 0) {
      setLoading(true);
      const timeout = setTimeout(() => {
        searchAllProjectsAsync(query).then((r) => {
          setResults(r);
          setShowDropdown(true);
          setLoading(false);
        }).catch(() => setLoading(false));
      }, 300); // debounce
      return () => clearTimeout(timeout);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    if (r.detailRoute) {
      navigate(r.detailRoute);
    } else {
      onOpenPanel(r.domain, r.category, r.sub);
    }
    setShowDropdown(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 חיפוש פרויקט..."
        className="w-full rounded-lg border border-[#1E3A6E] bg-[#162B55] px-4 py-3 text-base text-white placeholder:text-[#4A5568] outline-none focus:border-[#C9A84C] transition-colors"
        dir="rtl"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border border-[#1E3A6E] bg-[#162B55] text-white shadow-lg max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-sm text-[#B8C5D6] border-b border-[#1E3A6E] bg-[#0F2044]">
            {results.length} תוצאות
          </div>
          {results.map((r, i) => {
            const st = STATUS_CONFIG[r.project.status as keyof typeof STATUS_CONFIG];
            return (
              <button
                key={`${r.project.id}-${i}`}
                onClick={() => handleSelect(r)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-right text-base hover:bg-[#1E3A6E] transition-colors"
                dir="rtl"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-white">{r.project.name}</div>
                  <div className="text-sm text-[#B8C5D6]">{r.domain} / {r.category} / {r.sub}</div>
                </div>
                <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: st?.bg, color: st?.color }}>{st?.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {showDropdown && query.trim().length > 0 && results.length === 0 && !loading && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border border-[#1E3A6E] bg-[#162B55] p-3 text-center text-base shadow-lg">
          <span className="text-[#B8C5D6]">לא נמצאו תוצאות</span>
        </div>
      )}
    </div>
  );
};
