import { randomBytes } from "crypto";

export function newId(): string {
  return `${Date.now()}-${randomBytes(6).toString("hex")}`;
}

export function newAuthToken(prefix: "boss" | "emp"): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

/** Human-friendly invite code (no ambiguous chars). */
export function newInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}
