import type { VirtualBusinessCardData } from "@/lib/virtualBusinessCard/types";
import { getVirtualCardTemplate } from "@/lib/virtualBusinessCard/templates";
import { safeTrim, sanitizeVirtualBusinessCardData } from "@/lib/virtualBusinessCard/safeCard";

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  if (!value.trim()) return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;vertical-align:top;">${escHtml(label)}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${escHtml(value)}</td></tr>`;
}

/** HTML used by expo-print for PDF export. */
export function virtualCardExportHtml(card: VirtualBusinessCardData, shareUrl: string): string {
  const safe = sanitizeVirtualBusinessCardData(card);
  const template = getVirtualCardTemplate(safe.templateId);
  const rows = [
    row("Phone", safe.phone),
    row("Email", safe.email),
    row("Website", safe.website),
    row("Address", safe.address),
    row("License", safe.licenseNumber),
  ]
    .filter(Boolean)
    .join("");

  const social = safe.socialLinks
    .filter((l) => safeTrim(l.url))
    .map(
      (l) =>
        `<div style="font-size:12px;margin-top:4px;"><span style="color:${safe.accentColor};">${escHtml(l.label)}:</span> ${escHtml(l.url)}</div>`,
    )
    .join("");

  const qrBlock = safe.showQrCode
    ? `<p style="font-size:11px;color:#64748b;margin-top:16px;">Scan or open: ${escHtml(shareUrl)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 24px; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; }
  </style>
</head>
<body>
  <div style="background:${safe.backgroundColor};color:${safe.textColor};border-radius:16px;padding:28px;border:3px solid ${safe.accentColor};max-width:520px;">
    <div style="border-left:6px solid ${safe.accentColor};padding-left:16px;margin-bottom:16px;">
      <div style="font-size:22px;font-weight:800;">${escHtml(safeTrim(safe.businessName) || "Your business")}</div>
      ${safeTrim(safe.userName) ? `<div style="font-size:16px;margin-top:6px;">${escHtml(safe.userName)}</div>` : ""}
      ${safeTrim(safe.jobTitle) ? `<div style="font-size:13px;opacity:0.85;margin-top:4px;">${escHtml(safe.jobTitle)}</div>` : ""}
      ${safeTrim(safe.tagline) ? `<div style="font-size:12px;font-style:italic;margin-top:8px;opacity:0.9;">${escHtml(safe.tagline)}</div>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    ${social}
    ${qrBlock}
    <p style="font-size:10px;opacity:0.6;margin-top:20px;">${escHtml(template.name)} · Ideal Solutions Pro</p>
  </div>
</body>
</html>`;
}
