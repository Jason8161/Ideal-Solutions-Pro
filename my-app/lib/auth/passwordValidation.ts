export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Min 8 chars, 1 uppercase, 1 number — friendly messages for the UI. */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const p = password;

  if (p.length < 8) {
    errors.push("Use at least 8 characters.");
  }
  if (!/[A-Z]/.test(p)) {
    errors.push("Include at least one uppercase letter.");
  }
  if (!/[0-9]/.test(p)) {
    errors.push("Include at least one number.");
  }

  return { valid: errors.length === 0, errors };
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}
