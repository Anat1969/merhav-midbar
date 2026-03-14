import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAttachType(src: string): "image" | "video" | "pdf" | "other" {
  if (/^(data:image|https?:.*\.(jpg|jpeg|png|gif|webp|svg))/i.test(src)) return "image";
  if (/^(data:video|https?:.*\.(mp4|webm|ogg|mov))/i.test(src)) return "video";
  if (/^(data:application\/pdf|https?:.*\.pdf)/i.test(src)) return "pdf";
  return "other";
}

export const IMAGE_LABELS: Record<string, string> = {
  tashrit: "תשריט",
  tza: 'תצ"א',
  hadmaya: "הדמייה",
};
