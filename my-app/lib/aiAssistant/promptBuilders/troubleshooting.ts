import type { TroubleshootingFields } from "@/lib/aiAssistant/types";

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `- ${label}: ${trimmed}` : `- ${label}: (not provided)`;
}

export function buildTroubleshootingPrompt(fields: TroubleshootingFields): string {
  const photoNote = fields.photoTaken
    ? "- Photo: A jobsite photo was taken on the device. I will attach it manually in ChatGPT."
    : "- Photo: None provided";

  return [
    "Help troubleshoot an electrical / equipment issue for a field electrician.",
    "Suggest likely causes, safe diagnostic steps (de-energize when required), and what to check next.",
    "Do not assume live work is safe — emphasize lockout/tagout when appropriate.",
    "",
    line("Problem description", fields.problemDescription),
    line("Equipment type", fields.equipmentType),
    line("Symptoms", fields.symptoms),
    photoNote,
  ].join("\n");
}
