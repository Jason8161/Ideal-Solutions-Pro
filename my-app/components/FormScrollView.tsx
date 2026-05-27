import { usePathname } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useImmersiveTextInputHandlers } from "@/hooks/useImmersiveTextInputHandlers";
import { injectImmersiveTextInputHandlers } from "@/lib/immersiveTextInputTree";
import { isHomePath } from "@/lib/routePath";

/** Approximate AppChrome footer bar height above the safe-area inset. */
export const FOOTER_BAR_HEIGHT = 56;

/** Default gap between focused field and keyboard (single-line fields). */
export const FORM_EXTRA_SCROLL_HEIGHT = 56;

/** Use on screens with multiline description/notes near the bottom. */
export const FORM_MULTILINE_EXTRA_SCROLL_HEIGHT = 140;

export type FormScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView>;

/** Footer + safe-area padding used by forms and bottom-fixed composers in AppChrome. */
export function useFooterScrollInset() {
  const insets = useSafeAreaInsets();
  return FOOTER_BAR_HEIGHT + Math.max(insets.bottom, 10);
}

/** Keyboard height from the bottom of the screen (0 when hidden). */
export function useKeyboardBottomInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates.height);
    const onHide = () => setHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

/**
 * Extra bottom padding for a composer above AppChrome's footer when the keyboard is open.
 * Footer sits outside KeyboardAvoidingView, so subtract its height from the keyboard inset.
 */
export function useComposerKeyboardPadding() {
  const keyboardInset = useKeyboardBottomInset();
  const footerInset = useFooterScrollInset();
  return keyboardInset > 0 ? Math.max(0, keyboardInset - footerInset) : 0;
}

/**
 * Keyboard-aware scroll for forms inside AppChrome (footer + optional sticky header).
 * Scrolls the focused field above the keyboard and leaves room for bottom actions.
 */
export type FormScrollViewExtraProps = {
  innerRef?: FormScrollViewProps["innerRef"];
};

export function FormScrollView({
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  enableOnAndroid = true,
  enableAutomaticScroll = true,
  extraScrollHeight = FORM_EXTRA_SCROLL_HEIGHT,
  innerRef,
  children,
  ...rest
}: FormScrollViewProps & FormScrollViewExtraProps) {
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
  const immersiveHandlers = useImmersiveTextInputHandlers();
  const footerInset = useFooterScrollInset();
  const keyboardInset = useKeyboardBottomInset();

  // keyboard-aware-scroll-view scrolls via ScrollView.scrollResponderScrollNativeHandleToKeyboard,
  // which logs "Error measuring text field." when measureLayout fails on iOS (RN 0.81+ / Fabric refs).
  const iosNativeKeyboardAvoidance = Platform.OS === "ios";
  const libraryAutomaticScroll = enableAutomaticScroll && !iosNativeKeyboardAvoidance;
  const keyboardOpenPadding =
    iosNativeKeyboardAvoidance && keyboardInset > 0 ? extraScrollHeight : 0;

  const immersiveChildren = onHome
    ? children
    : injectImmersiveTextInputHandlers(children, immersiveHandlers);

  const mergedContentStyle = useMemo(
    (): StyleProp<ViewStyle> => [
      { paddingBottom: footerInset + keyboardOpenPadding },
      contentContainerStyle,
    ],
    [contentContainerStyle, footerInset, keyboardOpenPadding],
  );

  return (
    <KeyboardAwareScrollView
      innerRef={innerRef}
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={libraryAutomaticScroll}
      enableResetScrollToCoords={iosNativeKeyboardAvoidance ? false : undefined}
      automaticallyAdjustKeyboardInsets={iosNativeKeyboardAvoidance ? true : undefined}
      automaticallyAdjustContentInsets={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      extraScrollHeight={extraScrollHeight}
      extraHeight={Platform.OS === "ios" && libraryAutomaticScroll ? footerInset : 0}
      contentContainerStyle={mergedContentStyle}
      {...rest}
    >
      {immersiveChildren}
    </KeyboardAwareScrollView>
  );
}

