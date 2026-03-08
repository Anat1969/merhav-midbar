import React from "react";
import { useQuery } from "@tanstack/react-query";
import { loadAppsWithLinksAsync } from "@/lib/supabaseStorage";
import {
  Globe, MessageSquare, Brain, Code, FileText, Image, Music,
  Video, Mail, Calendar, Map, Calculator, ShoppingCart, Database,
  Cloud, Search, Settings, Bookmark, Zap, Layers, Terminal,
  Palette, PenTool, Camera, Headphones, Monitor, Smartphone,
  BarChart3, Cpu, Bot, Sparkles, Workflow, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

function getIconForApp(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(NAME_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return Globe;
}

interface AppIconsBarProps {
  refreshKey: number;
  color: string;
}

export const AppIconsBar: React.FC<AppIconsBarProps> = ({ refreshKey, color }) => {
  const { data: apps = [] } = useQuery({
    queryKey: ["apps-with-links", refreshKey],
    queryFn: loadAppsWithLinksAsync,
  });

  if (apps.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {apps.map((app) => {
          const Icon = getIconForApp(app.name);
          return (
            <Tooltip key={app.id}>
              <TooltipTrigger asChild>
                <a
                  href={app.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md"
                  style={{
                    background: `${color}15`,
                    color,
                  }}
                >
                  <Icon size={18} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {app.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
