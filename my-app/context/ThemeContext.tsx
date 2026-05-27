import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_COLOR_SCHEME,
  loadColorScheme,
  normalizeHex,
  saveColorScheme,
  type ColorScheme,
} from "@/lib/colorSchemeStorage";

type ThemeContextValue = {
  colors: ColorScheme;
  ready: boolean;
  setColor: (key: keyof ColorScheme, value: string) => Promise<void>;
  resetColors: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [colors, setColors] = useState<ColorScheme>(DEFAULT_COLOR_SCHEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadColorScheme().then((loaded) => {
      setColors(loaded);
      setReady(true);
    });
  }, []);

  const setColor = useCallback(async (key: keyof ColorScheme, value: string) => {
    const normalized = normalizeHex(value);
    if (!normalized) return;
    setColors((prev) => {
      const next = { ...prev, [key]: normalized };
      void saveColorScheme(next);
      return next;
    });
  }, []);

  const resetColors = useCallback(async () => {
    const next = { ...DEFAULT_COLOR_SCHEME };
    setColors(next);
    await saveColorScheme(next);
  }, []);

  const value = useMemo(
    () => ({ colors, ready, setColor, resetColors }),
    [colors, ready, setColor, resetColors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}
