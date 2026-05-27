import type { VirtualBusinessCardData, VirtualCardTemplateId } from "@/lib/virtualBusinessCard/types";

export type VirtualCardTemplateDefinition = {
  id: VirtualCardTemplateId;
  name: string;
  description: string;
  /** Suggested colors when switching templates (user data is preserved). */
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  layout: "standard" | "centered" | "split" | "qr-hero" | "minimal-pro";
};

export const VIRTUAL_CARD_TEMPLATES: readonly VirtualCardTemplateDefinition[] = [
  {
    id: "clean-modern",
    name: "Clean Modern",
    description: "Bright panel with accent stripe — professional and readable.",
    accentColor: "#2563eb",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    layout: "standard",
  },
  {
    id: "contractor-bold",
    name: "Contractor Bold",
    description: "Dark slate with strong type for field trades.",
    accentColor: "#f59e0b",
    backgroundColor: "#1e293b",
    textColor: "#f8fafc",
    layout: "standard",
  },
  {
    id: "electric-blue-glow",
    name: "Electric Blue Glow",
    description: "Deep blue with electric accent — great for electrical contractors.",
    accentColor: "#38bdf8",
    backgroundColor: "#0c4a6e",
    textColor: "#e0f2fe",
    layout: "centered",
  },
  {
    id: "luxury-black-gold",
    name: "Luxury Black & Gold",
    description: "Premium black card with gold highlights.",
    accentColor: "#d4af37",
    backgroundColor: "#0a0a0a",
    textColor: "#fafafa",
    layout: "centered",
  },
  {
    id: "simple-white",
    name: "Simple White",
    description: "Minimal white card with subtle borders.",
    accentColor: "#334155",
    backgroundColor: "#ffffff",
    textColor: "#1e293b",
    layout: "standard",
  },
  {
    id: "rugged-work-truck",
    name: "Rugged Work Truck",
    description: "Warm industrial tones for crews and job sites.",
    accentColor: "#ea580c",
    backgroundColor: "#292524",
    textColor: "#fafaf9",
    layout: "standard",
  },
  {
    id: "minimal-pro",
    name: "Minimal Pro",
    description: "Lots of whitespace — name and contact first.",
    accentColor: "#64748b",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    layout: "minimal-pro",
  },
  {
    id: "service-call",
    name: "Service Call Style",
    description: "Matches Ideal Solutions Pro service-call panels.",
    accentColor: "#eab308",
    backgroundColor: "#1c1917",
    textColor: "#fafaf9",
    layout: "split",
  },
  {
    id: "social-friendly",
    name: "Social Media Friendly",
    description: "Highlights social links for sharing online.",
    accentColor: "#8b5cf6",
    backgroundColor: "#18181b",
    textColor: "#fafafa",
    layout: "standard",
  },
  {
    id: "qr-focused",
    name: "QR Code Focused",
    description: "Large scannable QR for job flyers and trucks.",
    accentColor: "#22c55e",
    backgroundColor: "#f1f5f9",
    textColor: "#0f172a",
    layout: "qr-hero",
  },
] as const;

export function getVirtualCardTemplate(id: VirtualCardTemplateId): VirtualCardTemplateDefinition {
  return VIRTUAL_CARD_TEMPLATES.find((t) => t.id === id) ?? VIRTUAL_CARD_TEMPLATES[0];
}

/** Apply template color scheme only — keeps all text and images. */
export function applyTemplateTheme(
  card: VirtualBusinessCardData,
  templateId: VirtualCardTemplateId,
): VirtualBusinessCardData {
  const t = getVirtualCardTemplate(templateId);
  return {
    ...card,
    templateId,
    accentColor: t.accentColor,
    backgroundColor: t.backgroundColor,
    textColor: t.textColor,
    showQrCode: templateId === "qr-focused" ? true : card.showQrCode,
    updatedAt: new Date().toISOString(),
  };
}
