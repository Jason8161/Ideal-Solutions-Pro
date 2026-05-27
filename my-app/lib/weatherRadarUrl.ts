/** RainViewer map (no API key). `loc` is lat, lon, zoom. */
export function buildRainViewerRadarUrl(latitude: number, longitude: number): string {
  const zoom = 7;
  return `https://www.rainviewer.com/map.html?loc=${latitude},${longitude},${zoom}`;
}
