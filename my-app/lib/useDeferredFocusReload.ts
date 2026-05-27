import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { InteractionManager } from "react-native";

/**
 * Runs async reload after focus transitions settle — avoids Linking probes racing
 * with Fabric unmount during navigation.
 */
export function useDeferredFocusReload(reload: () => void | Promise<void>): void {
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const handle = InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          if (cancelled) return;
          void Promise.resolve(reload()).catch(() => {
            // reload handlers manage their own errors
          });
        }, 0);
      });
      return () => {
        cancelled = true;
        handle.cancel?.();
      };
    }, [reload]),
  );
}
