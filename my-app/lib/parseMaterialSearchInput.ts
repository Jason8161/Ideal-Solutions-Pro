import { parseNoteLines } from "@/lib/materialListStorage";

export type MaterialSearchInput = {
  /** Individual search items parsed from the input box. */
  items: string[];
  /** Combined term passed to supplier deep links (space-joined when multiple items). */
  searchTerm: string;
};

function splitInlineItems(line: string): string[] {
  return line
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Parse materials search input — one item or many.
 * Supports newline-separated lists (Notes-style bullets), commas, and semicolons.
 * Multiple items are joined with spaces for supplier app search deep links.
 */
export function parseMaterialSearchInput(raw: string): MaterialSearchInput {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { items: [], searchTerm: "" };
  }

  const items: string[] = [];
  for (const line of parseNoteLines(trimmed)) {
    if (/[,;]/.test(line)) {
      items.push(...splitInlineItems(line));
    } else {
      items.push(line);
    }
  }

  const uniqueItems = [...new Set(items.filter((item) => item.length > 0))];
  return {
    items: uniqueItems,
    searchTerm: uniqueItems.join(" "),
  };
}
