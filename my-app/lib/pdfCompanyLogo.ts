import { readAsStringAsync } from "expo-file-system/legacy";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guessImageMime(uri: string): string {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

/** Embeds a local or remote logo in expo-print HTML (file:// URIs are converted to data URLs). */
export async function resolvePdfLogoDataUri(logoUri: string | null | undefined): Promise<string | null> {
  const trimmed = logoUri?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  try {
    const base64 = await readAsStringAsync(trimmed, { encoding: "base64" });
    if (!base64) return null;
    return `data:${guessImageMime(trimmed)};base64,${base64}`;
  } catch {
    return null;
  }
}

export type PdfLogoHeaderOptions = {
  logoDataUri: string | null;
  companyName: string;
  /** When false, omit the header logo block entirely (company name remains in body). */
  showWhenNoLogo?: boolean;
};

/**
 * Header block for PDF exports: logo top-left (~72px tall) or company name when no usable logo.
 */
export function buildPdfLogoHeaderHtml(options: PdfLogoHeaderOptions): string {
  const { logoDataUri, companyName, showWhenNoLogo = true } = options;
  if (logoDataUri) {
    return `<div style="margin-bottom:12px;text-align:left;">
  <img src="${logoDataUri}" alt="" style="max-height:72px;max-width:220px;display:block;object-fit:contain;" />
</div>`;
  }
  if (!showWhenNoLogo) return "";
  const name = companyName.trim() || "Your company";
  return `<div style="margin-bottom:12px;text-align:left;font-size:20px;font-weight:700;line-height:1.2;">${escapeHtml(name)}</div>`;
}
