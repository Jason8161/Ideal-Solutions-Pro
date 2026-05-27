import type { Href, Router } from "expo-router";
import { InteractionManager } from "react-native";

/** Defer work until after animations/transitions settle (next frame). */
export function deferAfterInteractions(task: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(task, 0);
  });
}

export function deferRouterPush(router: Router, href: Href): void {
  deferAfterInteractions(() => {
    try {
      router.push(href);
    } catch {
      // Screen may have unmounted during transition.
    }
  });
}

export function deferRouterReplace(router: Router, href: Href): void {
  deferAfterInteractions(() => {
    try {
      router.replace(href);
    } catch {
      // Screen may have unmounted during transition.
    }
  });
}

/** Close a modal first, then run navigation on the next frame. */
export function deferAfterModalClose(onClose: () => void, task: () => void): void {
  onClose();
  deferAfterInteractions(task);
}
