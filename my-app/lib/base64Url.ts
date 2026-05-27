const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    output += BASE64_CHARS[(triple >> 18) & 63];
    output += BASE64_CHARS[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_CHARS[(triple >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? BASE64_CHARS[triple & 63] : "=";
  }
  return output;
}

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const len = cleaned.length;
  const outLen = Math.floor((len * 3) / 4) - (cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0);
  const out = new Uint8Array(outLen);
  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(cleaned[i] ?? "A");
    const enc2 = BASE64_CHARS.indexOf(cleaned[i + 1] ?? "A");
    const enc3 = cleaned[i + 2] === "=" ? 0 : BASE64_CHARS.indexOf(cleaned[i + 2] ?? "A");
    const enc4 = cleaned[i + 3] === "=" ? 0 : BASE64_CHARS.indexOf(cleaned[i + 3] ?? "A");
    const triple = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    if (byteIndex < outLen) out[byteIndex++] = (triple >> 16) & 255;
    if (byteIndex < outLen) out[byteIndex++] = (triple >> 8) & 255;
    if (byteIndex < outLen) out[byteIndex++] = triple & 255;
  }
  return out;
}

function utf8ToBytes(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text);
  }
  const encoded = unescape(encodeURIComponent(text));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    out[i] = encoded.charCodeAt(i);
  }
  return out;
}

function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return decodeURIComponent(escape(binary));
}

export function encodeBase64Url(text: string): string {
  const b64 = bytesToBase64(utf8ToBytes(text));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return bytesToUtf8(base64ToBytes(padded + pad));
}
