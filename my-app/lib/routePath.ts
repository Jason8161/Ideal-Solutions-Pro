/** Stable route key for effects — treats home `""` and `"/"` as the same path. */
export function routePathKey(pathname: string): string {
  if (pathname === "" || pathname === "/") return "/";
  return pathname;
}

export function isHomePath(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}
