import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useKeyboardBottomInset } from "@/components/FormScrollView";
import { useImmersiveChrome } from "@/context/ImmersiveChromeContext";
import { isHomePath } from "@/lib/routePath";

/**
 * Keeps immersive mode in sync with the keyboard on non-home screens so any TextInput
 * (including those not inside FormScrollView) gets full-screen typing space.
 */
export function ImmersiveChromeSync() {
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
  const keyboardInset = useKeyboardBottomInset();
  const { setKeyboardOpen } = useImmersiveChrome();
  const keyboardOpenRef = useRef(false);

  useEffect(() => {
    const nextOpen = !onHome && keyboardInset > 0;
    if (keyboardOpenRef.current === nextOpen) return;
    keyboardOpenRef.current = nextOpen;
    setKeyboardOpen(nextOpen);
  }, [keyboardInset, onHome, setKeyboardOpen]);

  useEffect(() => {
    if (Platform.OS === "web" && onHome && keyboardOpenRef.current) {
      keyboardOpenRef.current = false;
      setKeyboardOpen(false);
    }
  }, [onHome, setKeyboardOpen]);

  return null;
}
