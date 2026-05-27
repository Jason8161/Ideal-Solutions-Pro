import { Linking, Platform, Share } from "react-native";

/** Keep mailto URLs within common platform limits; fall back to Share for long lists. */
const MAILTO_MAX_LEN = 7000;

function buildBodyText(listTitle: string | undefined, lineTexts: string[], jobRef: string): string {
  const dated = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const jobLine = `Job / PO: ${jobRef.trim()}\n\n`;
  const header = listTitle
    ? `Saved list: "${listTitle}"\n${lineTexts.length} item(s) · ${dated}\n`
    : `Material list · ${lineTexts.length} item(s) · ${dated}\n`;
  return `${jobLine}${header}\n${lineTexts.join("\n")}\n\n— Sent from Ideal Solutions Pro`;
}

function buildSubject(listTitle: string | undefined, jobRef: string): string {
  const j = jobRef.trim();
  const base = listTitle ? `Material list: ${listTitle}` : "Material list";
  return `${base} — ${j}`;
}

/**
 * Opens the default email app with subject/body prefilled (mailto:), or the system share
 * sheet if the list is too long for a mailto URL or mailto is unavailable.
 */
export async function composeMaterialListEmail(opts: {
  listTitle?: string;
  lineTexts: string[];
  jobRef: string;
}): Promise<boolean> {
  const { listTitle, lineTexts, jobRef } = opts;
  if (lineTexts.length === 0 || !jobRef.trim()) return false;

  const bodyText = buildBodyText(listTitle, lineTexts, jobRef);
  const subject = buildSubject(listTitle, jobRef);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  if (mailto.length <= MAILTO_MAX_LEN) {
    try {
      await Linking.openURL(mailto);
      return true;
    } catch {
      // Fall through to Share (no mail handler, URL too strict, etc.).
    }
  }

  try {
    await Share.share(
      Platform.OS === "android"
        ? { title: subject, subject, message: bodyText }
        : { title: subject, message: bodyText },
    );
    return true;
  } catch {
    return false;
  }
}
