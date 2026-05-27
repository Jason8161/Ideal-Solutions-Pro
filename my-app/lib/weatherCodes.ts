import type { Ionicons } from "@expo/vector-icons";

export type WeatherCondition = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** WMO weather interpretation codes (Open-Meteo). */
export function weatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0) return { label: "Clear", icon: "sunny" };
  if (code === 1) return { label: "Mainly clear", icon: "partly-sunny" };
  if (code === 2) return { label: "Partly cloudy", icon: "partly-sunny" };
  if (code === 3) return { label: "Overcast", icon: "cloudy" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "cloud" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "rainy" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "rainy" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "rainy" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", icon: "snow" };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", icon: "thunderstorm" };
  return { label: "Unknown", icon: "cloud-outline" };
}
