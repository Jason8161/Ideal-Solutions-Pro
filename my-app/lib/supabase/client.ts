/**
 * Minimal Supabase REST/RPC client (no @supabase/supabase-js dependency).
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL.replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

type RpcOptions = {
  /** Optional Supabase Auth access token (when wired). */
  accessToken?: string;
};

export async function supabaseRpc<T>(
  functionName: string,
  args: Record<string, unknown>,
  options?: RpcOptions,
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${options?.accessToken ?? SUPABASE_ANON_KEY}`,
  };
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as { message: string }).message)
        : `Supabase RPC failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}
