import { usePathname } from "expo-router";
import { useCallback, useMemo } from "react";
import type { TextInputProps } from "react-native";

import { useImmersiveChrome } from "@/context/ImmersiveChromeContext";
import { isHomePath } from "@/lib/routePath";

/**
 * Spread onto TextInput `onFocus` / `onBlur` on non-home screens (or use ImmersiveTextInput).
 * FormScrollView injects these automatically for nested inputs.
 */
export function useImmersiveTextInputHandlers() {
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
  const { acquire, release } = useImmersiveChrome();

  const onFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>((_e) => {
    if (!onHome) acquire();
  }, [acquire, onHome]);

  const onBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>((_e) => {
    if (!onHome) release();
  }, [onHome, release]);

  return useMemo(() => ({ onFocus, onBlur }), [onFocus, onBlur]);
}
