import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_color_scheme_v1";

export type ColorScheme = {
  background: string;
  button: string;
  text: string;
  /** Captions / helper lines — keep ≥4.5:1 vs background when possible. */
  textMuted: string;
  border: string;
  accent: string;
};

/** Previous navy defaults — used to migrate stored schemes on load. */
export const LEGACY_DEFAULT_COLOR_SCHEME: ColorScheme = {
  background: "#0C1424",
  button: "#1A3552",
  text: "#F2F5F8",
  textMuted: "#9BA8BA",
  border: "#5A5345",
  accent: "#F59E0B",
};

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  /** Near-black — screens stay transparent so metal wallpaper shows through */
  background: "#0A0908",
  /** Dark copper-tinted panel (translucent feel over metal) */
  button: "#241A14",
  text: "#FFFFFF",
  /** Secondary copy: white at ~72% (components may also use text + opacity) */
  textMuted: "#FFFFFF",
  border: "transparent",
  /** Rough industrial copper — icons, highlights, active states */
  accent: "#C87533",
};

function schemesEqual(a: ColorScheme, b: ColorScheme): boolean {
  return (
    a.background === b.background &&
    a.button === b.button &&
    a.text === b.text &&
    a.textMuted === b.textMuted &&
    a.border === b.border &&
    a.accent === b.accent
  );
}

function resolveBorder(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "transparent") return "transparent";
  return normalizeHex(value ?? "") ?? fallback;
}

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

export function normalizeHex(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = input.trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!HEX_RE.test(withHash)) return null;
  return `#${withHash.slice(1).toUpperCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

function mergeScheme(partial: Partial<ColorScheme> | null): ColorScheme {
  return {
    background: normalizeHex(partial?.background ?? "") ?? DEFAULT_COLOR_SCHEME.background,
    button: normalizeHex(partial?.button ?? "") ?? DEFAULT_COLOR_SCHEME.button,
    text: normalizeHex(partial?.text ?? "") ?? DEFAULT_COLOR_SCHEME.text,
    textMuted: normalizeHex(partial?.textMuted ?? "") ?? DEFAULT_COLOR_SCHEME.textMuted,
    border: resolveBorder(partial?.border, DEFAULT_COLOR_SCHEME.border),
    accent: normalizeHex(partial?.accent ?? "") ?? DEFAULT_COLOR_SCHEME.accent,
  };
}

export async function loadColorScheme(): Promise<ColorScheme> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLOR_SCHEME };
    const merged = mergeScheme(JSON.parse(raw) as Partial<ColorScheme>);
    if (schemesEqual(merged, LEGACY_DEFAULT_COLOR_SCHEME)) {
      const next = { ...DEFAULT_COLOR_SCHEME };
      await saveColorScheme(next);
      return next;
    }
    return merged;
  } catch {
    return { ...DEFAULT_COLOR_SCHEME };
  }
}

export async function saveColorScheme(scheme: ColorScheme): Promise<void> {
  const normalized = mergeScheme(scheme);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

/** RGBA helper for translucent overlays (footer scrim, backdrop tints). */
export function hexToRgba(hex: string | null | undefined, alpha: number): string {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return `rgba(0,0,0,${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}
