import { usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { isHomePath, routePathKey } from "@/lib/routePath";

type ImmersiveChromeContextValue = {
  /** True on non-home routes when a field is focused or the keyboard is open. */
  immersiveActive: boolean;
  acquire: () => void;
  release: () => void;
  setKeyboardOpen: (open: boolean) => void;
};

const ImmersiveChromeContext = createContext<ImmersiveChromeContextValue | null>(null);

export function ImmersiveChromeProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const routeKey = routePathKey(pathname);
  const onHome = isHomePath(pathname);
  const [focusDepth, setFocusDepth] = useState(0);
  const [keyboardOpen, setKeyboardOpenState] = useState(false);

  useEffect(() => {
    setFocusDepth(0);
    setKeyboardOpenState(false);
  }, [routeKey]);

  const acquire = useCallback(() => {
    setFocusDepth((n) => n + 1);
  }, []);

  const release = useCallback(() => {
    setFocusDepth((n) => Math.max(0, n - 1));
  }, []);

  const setKeyboardOpen = useCallback((open: boolean) => {
    setKeyboardOpenState(open);
  }, []);

  const immersiveActive = !onHome && (focusDepth > 0 || keyboardOpen);

  const value = useMemo(
    () => ({ immersiveActive, acquire, release, setKeyboardOpen }),
    [immersiveActive, acquire, release, setKeyboardOpen],
  );

  return <ImmersiveChromeContext.Provider value={value}>{children}</ImmersiveChromeContext.Provider>;
}

export function useImmersiveChrome() {
  const value = useContext(ImmersiveChromeContext);
  if (!value) {
    throw new Error("useImmersiveChrome must be used within ImmersiveChromeProvider");
  }
  return value;
}
