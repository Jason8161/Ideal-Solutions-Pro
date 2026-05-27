import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

import { weatherCodeToCondition } from "@/lib/weatherCodes";

export type DailyForecastDay = {
  date: string;
  dayLabel: string;
  highF: number;
  lowF: number;
  condition: string;
  icon: ReturnType<typeof weatherCodeToCondition>["icon"];
  precipChancePercent: number | null;
};

export type HourlyForecastSlot = {
  timeIso: string;
  hourLabel: string;
  temperatureF: number;
  condition: string;
  icon: ReturnType<typeof weatherCodeToCondition>["icon"];
  precipChancePercent: number | null;
};

export type WeatherForecast = {
  temperatureF: number;
  highF: number;
  lowF: number;
  condition: string;
  icon: ReturnType<typeof weatherCodeToCondition>["icon"];
  locationLabel: string;
  latitude: number;
  longitude: number;
  daily: DailyForecastDay[];
  hourly: HourlyForecastSlot[];
};

type WeatherState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: WeatherForecast };

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
  hourly?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
  };
};

function formatDayLabel(dateIso: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(`${dateIso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    forecast_hours: "48",
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Weather unavailable");
  return res.json() as Promise<OpenMeteoResponse>;
}

async function resolveLocationLabel(lat: number, lon: number): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const place = places[0];
    if (!place) return "Your area";
    const city = place.city ?? place.subregion ?? place.region;
    const region = place.region && place.region !== city ? place.region : null;
    if (city && region) return `${city}, ${region}`;
    return city ?? region ?? "Your area";
  } catch {
    return "Your area";
  }
}

function buildDailyForecast(daily: NonNullable<OpenMeteoResponse["daily"]>): DailyForecastDay[] | null {
  const times = daily.time ?? [];
  const codes = daily.weather_code ?? [];
  const highs = daily.temperature_2m_max ?? [];
  const lows = daily.temperature_2m_min ?? [];
  const precip = daily.precipitation_probability_max ?? [];

  if (times.length === 0) return null;

  const days: DailyForecastDay[] = [];
  for (let i = 0; i < times.length; i++) {
    const date = times[i];
    const code = codes[i];
    const high = highs[i];
    const low = lows[i];
    if (date == null || code == null || high == null || low == null) continue;

    const { label, icon } = weatherCodeToCondition(code);
    const precipValue = precip[i];
    days.push({
      date,
      dayLabel: formatDayLabel(date, i),
      highF: Math.round(high),
      lowF: Math.round(low),
      condition: label,
      icon,
      precipChancePercent: precipValue == null ? null : Math.round(precipValue),
    });
  }

  return days.length > 0 ? days : null;
}

const HOURLY_DISPLAY_LIMIT = 24;

function formatHourLabel(timeIso: string): string {
  const date = new Date(timeIso);
  return date.toLocaleTimeString(undefined, { hour: "numeric", hour12: true });
}

function buildHourlyForecast(
  hourly: NonNullable<OpenMeteoResponse["hourly"]>,
): HourlyForecastSlot[] | null {
  const times = hourly.time ?? [];
  const codes = hourly.weather_code ?? [];
  const temps = hourly.temperature_2m ?? [];
  const precip = hourly.precipitation_probability ?? [];

  if (times.length === 0) return null;

  const slots: HourlyForecastSlot[] = [];
  const limit = Math.min(times.length, HOURLY_DISPLAY_LIMIT);
  for (let i = 0; i < limit; i++) {
    const timeIso = times[i];
    const code = codes[i];
    const temp = temps[i];
    if (timeIso == null || code == null || temp == null) continue;

    const { label, icon } = weatherCodeToCondition(code);
    const precipValue = precip[i];
    slots.push({
      timeIso,
      hourLabel: formatHourLabel(timeIso),
      temperatureF: Math.round(temp),
      condition: label,
      icon,
      precipChancePercent: precipValue == null ? null : Math.round(precipValue),
    });
  }

  return slots.length > 0 ? slots : null;
}

export function useWeatherForecast() {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState({
          status: "error",
          message: "Allow location to see local weather.",
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      const [payload, locationLabel] = await Promise.all([
        fetchOpenMeteo(latitude, longitude),
        resolveLocationLabel(latitude, longitude),
      ]);

      const temp = payload.current?.temperature_2m;
      const code = payload.current?.weather_code;
      const daily = buildDailyForecast(payload.daily ?? {});
      const hourly = buildHourlyForecast(payload.hourly ?? {});

      if (temp == null || code == null || !daily || !hourly) {
        setState({ status: "error", message: "Weather data incomplete." });
        return;
      }

      const today = daily[0];
      const { label, icon } = weatherCodeToCondition(code);
      setState({
        status: "ready",
        data: {
          temperatureF: Math.round(temp),
          highF: today.highF,
          lowF: today.lowF,
          condition: label,
          icon,
          locationLabel,
          latitude,
          longitude,
          daily,
          hourly,
        },
      });
    } catch {
      setState({ status: "error", message: "Could not load weather." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refresh: load };
}
