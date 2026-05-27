/** Quick outbound check so startup logs show whether Node can reach the public internet. */
export async function probeInternetReachable(): Promise<boolean> {
  const urls = [
    "https://www.google.com/generate_204",
    "https://cloudflare.com/cdn-cgi/trace",
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { method: "GET", signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok || res.status === 204) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}
