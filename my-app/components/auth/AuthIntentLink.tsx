import { useRouter, type Href } from "expo-router";
import { useCallback, type PropsWithChildren } from "react";
import { Pressable, Text, type PressableProps, type TextProps } from "react-native";

import { allowAuthScreenNavigation } from "@/lib/auth/authNavigationIntent";

type AuthIntentPressableProps = Omit<PressableProps, "onPress"> & {
  href: Href;
  onPress?: () => void;
};

/** Navigates to login/signup after marking explicit user intent (avoids cold-start login wall). */
export function AuthIntentPressable({
  href,
  onPress,
  children,
  ...rest
}: PropsWithChildren<AuthIntentPressableProps>) {
  const router = useRouter();

  const openAuth = useCallback(() => {
    allowAuthScreenNavigation();
    onPress?.();
    router.push(href);
  }, [href, onPress, router]);

  return (
    <Pressable accessibilityRole="link" onPress={openAuth} {...rest}>
      {children}
    </Pressable>
  );
}

type AuthIntentTextLinkProps = TextProps & {
  href: Href;
  onPress?: () => void;
};

export function AuthIntentTextLink({ href, onPress, ...rest }: AuthIntentTextLinkProps) {
  const router = useRouter();

  const openAuth = useCallback(() => {
    allowAuthScreenNavigation();
    onPress?.();
    router.push(href);
  }, [href, onPress, router]);

  return <Text accessibilityRole="link" onPress={openAuth} {...rest} />;
}

export function navigateToAuthScreen(router: ReturnType<typeof useRouter>, href: Href): void {
  allowAuthScreenNavigation();
  router.push(href);
}

export function replaceWithAuthScreen(router: ReturnType<typeof useRouter>, href: Href): void {
  allowAuthScreenNavigation();
  router.replace(href);
}
