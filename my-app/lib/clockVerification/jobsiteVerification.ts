import AsyncStorage from "@react-native-async-storage/async-storage";

import { getBossJobById } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";
import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

import { geocodeAddress } from "./geocodeAddress";
import type { ClockVerificationPreferences, JobsiteVerification, JobsiteVerificationStatus } from "./types";

const JOBSITE_COORDS_CACHE_KEY = "ideal_jobsite_coords_cache_v1";

type JobsiteCoordsCache = Record<string, { latitude: number; longitude: number; cachedAt: string }>;

async function loadCoordsCache(): Promise<JobsiteCoordsCache> {
  try {
    const raw = await AsyncStorage.getItem(JOBSITE_COORDS_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as JobsiteCoordsCache;
  } catch {
    return {};
  }
}

async function saveCoordsCache(cache: JobsiteCoordsCache): Promise<void> {
  await AsyncStorage.setItem(JOBSITE_COORDS_CACHE_KEY, JSON.stringify(cache));
}

export async function resolveJobsiteCoords(job: BossJob): Promise<{ latitude: number; longitude: number } | null> {
  const cache = await loadCoordsCache();
  const cached = cache[job.id];
  if (cached) return { latitude: cached.latitude, longitude: cached.longitude };

  const coords = await geocodeAddress(job.address);
  if (!coords) return null;

  cache[job.id] = { ...coords, cachedAt: new Date().toISOString() };
  await saveCoordsCache(cache);
  return coords;
}

const EARTH_RADIUS_FEET = 20_902_231;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in feet between two coordinates. */
export function distanceFeet(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_FEET * c;
}

export function isWithinGeofence(distanceFeetValue: number, limitFeet: number): boolean {
  return distanceFeetValue <= limitFeet;
}

function jobsiteLabel(job: BossJob): string {
  return job.jobName.trim() || job.customerName.trim() || "Jobsite";
}

export type VerifyJobsiteInput = {
  jobsiteId?: string | null;
  location?: ClockLocation;
  prefs: ClockVerificationPreferences;
  supervisorOverride?: boolean;
};

export async function verifyJobsiteProximity(input: VerifyJobsiteInput): Promise<JobsiteVerification> {
  const { jobsiteId, location, prefs, supervisorOverride } = input;

  if (supervisorOverride && prefs.supervisorOverrideAllowed) {
    return { status: "supervisor_override" };
  }

  if (!jobsiteId) {
    return { status: "no_jobsite" };
  }

  const job = await getBossJobById(jobsiteId);
  if (!job) {
    return { status: "no_jobsite", jobsiteId };
  }

  const label = jobsiteLabel(job);
  if (!location) {
    return {
      status: "no_gps",
      jobsiteId,
      jobsiteName: label,
      jobsiteAddress: job.address,
    };
  }

  const coords = await resolveJobsiteCoords(job);
  if (!coords) {
    return {
      status: "nearby",
      jobsiteId,
      jobsiteName: label,
      jobsiteAddress: job.address,
    };
  }

  const dist = distanceFeet(location.latitude, location.longitude, coords.latitude, coords.longitude);
  const limit = prefs.geofenceDistanceFeet;
  const within = isWithinGeofence(dist, limit);

  let status: JobsiteVerificationStatus = "nearby";
  if (dist <= limit * 0.5) status = "verified";
  else if (prefs.geofencingEnabled && !within) status = "geofence_blocked";
  else if (dist > limit * 2) status = "too_far";

  return {
    status,
    jobsiteId,
    jobsiteName: label,
    jobsiteAddress: job.address,
    distanceFeet: Math.round(dist),
    geofenceLimitFeet: prefs.geofencingEnabled ? limit : undefined,
    withinGeofence: prefs.geofencingEnabled ? within : undefined,
  };
}

export function canClockInWithVerification(
  verification: JobsiteVerification,
  prefs: ClockVerificationPreferences,
  hasNetwork: boolean,
): { allowed: boolean; reason?: string } {
  if (prefs.requireAssignedJobsite && verification.status === "no_jobsite") {
    return { allowed: false, reason: "Select an assigned jobsite before clocking in." };
  }
  if (verification.status === "geofence_blocked") {
    return {
      allowed: false,
      reason: `You must be within ${prefs.geofenceDistanceFeet} ft of the jobsite to clock in.`,
    };
  }
  if (!hasNetwork && !prefs.offlineClockInsAllowed) {
    return { allowed: false, reason: "Offline clock-ins are disabled. Connect to the internet and try again." };
  }
  return { allowed: true };
}
