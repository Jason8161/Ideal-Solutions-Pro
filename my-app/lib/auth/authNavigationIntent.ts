/**
 * When false, AuthGate sends cold-start auth screens to guest trial onboarding.
 * Set before navigating to login/signup from tier-trial, settings, or invites.
 */
let authScreenNavigationAllowed = false;

export function allowAuthScreenNavigation(): void {
  authScreenNavigationAllowed = true;
}

/** Returns true once if auth navigation was explicitly requested this session. */
export function consumeAuthScreenNavigationAllowed(): boolean {
  if (!authScreenNavigationAllowed) return false;
  authScreenNavigationAllowed = false;
  return true;
}

export function peekAuthScreenNavigationAllowed(): boolean {
  return authScreenNavigationAllowed;
}
