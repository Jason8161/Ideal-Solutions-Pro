import type { VirtualBusinessCardData } from "@/lib/virtualBusinessCard/types";

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildVCardFromVirtualCard(card: VirtualBusinessCardData): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  const fullName = [card.userName.trim(), card.businessName.trim()].filter(Boolean).join(" — ") || card.businessName;
  if (fullName) lines.push(`FN:${escapeVCard(fullName)}`);
  if (card.userName.trim()) lines.push(`N:${escapeVCard(card.userName)};;;;`);
  if (card.businessName.trim()) lines.push(`ORG:${escapeVCard(card.businessName)}`);
  if (card.jobTitle.trim()) lines.push(`TITLE:${escapeVCard(card.jobTitle)}`);
  if (card.phone.trim()) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCard(card.phone)}`);
  if (card.email.trim()) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(card.email)}`);
  if (card.website.trim()) {
    const url = card.website.match(/^https?:\/\//i) ? card.website : `https://${card.website}`;
    lines.push(`URL:${escapeVCard(url)}`);
  }
  if (card.address.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCard(card.address)};;;;`);
  }
  if (card.tagline.trim()) lines.push(`NOTE:${escapeVCard(card.tagline)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
