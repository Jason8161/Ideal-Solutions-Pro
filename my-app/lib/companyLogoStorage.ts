import * as FileSystem from "expo-file-system/legacy";

const LOGO_DIR = "company-logos/";
const LOGO_BASENAME = "company-logo";

export function getCompanyLogosDirectory(): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}${LOGO_DIR}`;
}

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (ext && /^(png|jpe?g|webp|heic|heif|gif|bmp)$/i.test(ext)) return `.${ext}`;
  return ".jpg";
}

export function isPersistedCompanyLogoUri(uri: string): boolean {
  const dir = getCompanyLogosDirectory();
  if (!dir) return false;
  return uri.startsWith(dir);
}

async function ensureDir(): Promise<string> {
  const dir = getCompanyLogosDirectory();
  if (!dir) throw new Error("File storage is not available on this device.");
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function removeExistingLogoFiles(dir: string): Promise<void> {
  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    for (const name of entries) {
      if (name.startsWith(`${LOGO_BASENAME}.`)) {
        await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true });
      }
    }
  } catch {
    // directory may be empty or unreadable
  }
}

/** Copies a picked image into the app documents folder for backup and stable URIs. */
export async function persistCompanyLogoUri(sourceUri: string): Promise<string | null> {
  const trimmed = sourceUri.trim();
  if (!trimmed) return null;
  if (isPersistedCompanyLogoUri(trimmed)) return trimmed;

  try {
    const dir = await ensureDir();
    await removeExistingLogoFiles(dir);
    const ext = extensionFromUri(trimmed);
    const destUri = `${dir}${LOGO_BASENAME}${ext}`;
    await FileSystem.copyAsync({ from: trimmed, to: destUri });
    return destUri;
  } catch {
    return null;
  }
}

export async function deleteCompanyLogoFile(uri: string | null | undefined): Promise<void> {
  const trimmed = uri?.trim();
  if (!trimmed || !isPersistedCompanyLogoUri(trimmed)) return;
  try {
    const info = await FileSystem.getInfoAsync(trimmed);
    if (info.exists) {
      await FileSystem.deleteAsync(trimmed, { idempotent: true });
    }
  } catch {
    // ignore cleanup failures
  }
}
