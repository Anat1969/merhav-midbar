import React from "react";
import { useQuery } from "@tanstack/react-query";
import { loadProjectsWithLinksAsync } from "@/lib/supabaseStorage";
import { openExternalLink } from "@/lib/fileAccess";
import {
  Globe, MessageSquare, Brain, Code, FileText, Image, Music,
  Video, Mail, Calendar, Map, Calculator, ShoppingCart, Database,
  Cloud, Search, Settings, Bookmark, Zap, Layers, Terminal,
  Palette, PenTool, Camera, Headphones, Monitor, Smartphone,
  BarChart3, Cpu, Bot, Sparkles, Workflow, type LucideIcon,
} from "lucide-react";

const NAME_ICON_MAP: Record<string, LucideIcon> = {
  chat: MessageSquare,
  chatgpt: MessageSquare,
  gpt: Brain,
  ai: Sparkles,
  code: Code,
  github: Terminal,
  docs: FileText,
  document: FileText,
  image: Image,
  photo: Camera,
  music: Music,
  video: Video,
  email: Mail,
  mail: Mail,
  calendar: Calendar,
  map: Map,
  maps: Map,
  calculator: Calculator,
  shop: ShoppingCart,
  store: ShoppingCart,
  database: Database,
  cloud: Cloud,
  search: Search,
  settings: Settings,
  bookmark: Bookmark,
  automation: Zap,
  zapier: Zap,
  layers: Layers,
  terminal: Terminal,
  design: Palette,
  figma: PenTool,
  canva: Palette,
  headphones: Headphones,
  monitor: Monitor,
  phone: Smartphone,
  analytics: BarChart3,
  cpu: Cpu,
  bot: Bot,
  agent: Bot,
  workflow: Workflow,
};

export function getIconForApp(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(NAME_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return Globe;
}

export function getDisplayName(name: string): string {
  const idx = name.indexOf("-");
  if (idx >= 0) return name.substring(idx + 1).trim();
  const idx2 = name.indexOf("–");
  if (idx2 >= 0) return name.substring(idx2 + 1).trim();
  return name;
}

// Domain key mapping for sub names
const SUB_DOMAIN_MAP: Record<string, string> = {
  "אפליקציות": "apps",
  "סוכנים": "agents",
};

interface SubIconsRowProps {
  sub: string;
  color: string;
  refreshKey: number;
}

export const SubIconsRow: React.FC<SubIconsRowProps> = ({ sub, color, refreshKey }) => {
  const domainKey = SUB_DOMAIN_MAP[sub];
  
  const { data: projects = [] } = useQuery({
    queryKey: ["sub-icons", domainKey, refreshKey],
    queryFn: () => loadProjectsWithLinksAsync(domainKey!),
    enabled: !!domainKey,
  });

  const appsWithLinks = projects.filter((app) => app.viewLink || app.link);

  if (!domainKey || appsWithLinks.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {appsWithLinks.map((app) => {
        const Icon = getIconForApp(app.name);
        const displayName = getDisplayName(app.name);
        return (
          <button
            key={app.id}
            onClick={(e) => {
              e.preventDefault();
              openExternalLink(app.viewLink || app.link);
            }}
            title={`פתח ${displayName}`}
            className="group flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer"
            style={{
              background: `linear-gradient(145deg, ${color}18, ${color}08)`,
              border: `1px solid ${color}20`,
            }}
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 group-hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              }}
            >
              <Icon size={18} className="text-white" />
            </div>
            <span
              className="text-[10px] font-bold leading-tight text-center max-w-[64px] truncate"
              style={{ color }}
            >
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
};
