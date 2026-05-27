import AsyncStorage from "@react-native-async-storage/async-storage";

import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

const HANDLED_KEY = "ideal_service_request_handled_v1";
const PENDING_KEY = "ideal_service_request_pending_v1";
const REMOTE_CACHE_KEY = "ideal_service_request_remote_cache_v1";

export type ServiceRequestDisposition = "added" | "dismissed" | "dismissed_with_reminder";

type HandledEntry = {
  disposition: ServiceRequestDisposition;
  handledAt: string;
};

type HandledMap = Record<string, HandledEntry>;

let handledCache: HandledMap | null = null;
let pendingCache: string[] | null = null;
let remoteCache: Record<string, RemoteServiceRequest> | null = null;

async function loadHandledMap(): Promise<HandledMap> {
  if (handledCache) return handledCache;
  try {
    const raw = await AsyncStorage.getItem(HANDLED_KEY);
    if (!raw) {
      handledCache = {};
      return handledCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    handledCache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as HandledMap)
        : {};
    return handledCache;
  } catch {
    handledCache = {};
    return handledCache;
  }
}

async function saveHandledMap(map: HandledMap): Promise<void> {
  const trimmed = Object.fromEntries(Object.entries(map).slice(-300));
  handledCache = trimmed;
  await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify(trimmed));
}

async function loadPendingIds(): Promise<string[]> {
  if (pendingCache) return pendingCache;
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) {
      pendingCache = [];
      return pendingCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    pendingCache = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
    return pendingCache;
  } catch {
    pendingCache = [];
    return pendingCache;
  }
}

async function savePendingIds(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter((id) => id.trim().length > 0))].slice(-100);
  pendingCache = unique;
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(unique));
}

async function loadRemoteCache(): Promise<Record<string, RemoteServiceRequest>> {
  if (remoteCache) return remoteCache;
  try {
    const raw = await AsyncStorage.getItem(REMOTE_CACHE_KEY);
    if (!raw) {
      remoteCache = {};
      return remoteCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    remoteCache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, RemoteServiceRequest>)
        : {};
    return remoteCache;
  } catch {
    remoteCache = {};
    return remoteCache;
  }
}

async function saveRemoteCache(cache: Record<string, RemoteServiceRequest>): Promise<void> {
  const entries = Object.entries(cache).slice(-300);
  remoteCache = Object.fromEntries(entries);
  await AsyncStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(remoteCache));
}

export async function cacheRemoteServiceRequests(requests: RemoteServiceRequest[]): Promise<void> {
  if (requests.length === 0) return;
  const cache = await loadRemoteCache();
  for (const req of requests) {
    if (req.id?.trim()) cache[req.id] = req;
  }
  await saveRemoteCache(cache);
}

export async function getCachedRemoteServiceRequest(
  remoteRequestId: string,
): Promise<RemoteServiceRequest | null> {
  const cache = await loadRemoteCache();
  return cache[remoteRequestId.trim()] ?? null;
}

export async function getServiceRequestDisposition(
  remoteRequestId: string,
): Promise<ServiceRequestDisposition | null> {
  const map = await loadHandledMap();
  return map[remoteRequestId.trim()]?.disposition ?? null;
}

export async function isRemoteServiceRequestHandled(remoteRequestId: string): Promise<boolean> {
  return (await getServiceRequestDisposition(remoteRequestId)) !== null;
}

export async function markRemoteServiceRequestHandled(
  remoteRequestId: string,
  disposition: ServiceRequestDisposition,
): Promise<void> {
  const id = remoteRequestId.trim();
  if (!id) return;
  const map = await loadHandledMap();
  map[id] = { disposition, handledAt: new Date().toISOString() };
  await saveHandledMap(map);
  await removePendingServiceRequest(id);
}

export async function registerPendingServiceRequest(remoteRequestId: string): Promise<void> {
  const id = remoteRequestId.trim();
  if (!id) return;
  if (await isRemoteServiceRequestHandled(id)) return;
  const pending = await loadPendingIds();
  if (pending.includes(id)) return;
  pending.push(id);
  await savePendingIds(pending);
}

export async function removePendingServiceRequest(remoteRequestId: string): Promise<void> {
  const id = remoteRequestId.trim();
  const pending = await loadPendingIds();
  const next = pending.filter((entry) => entry !== id);
  if (next.length === pending.length) return;
  await savePendingIds(next);
}

export async function loadPendingServiceRequests(
  inbox?: RemoteServiceRequest[],
): Promise<RemoteServiceRequest[]> {
  const pendingIds = await loadPendingIds();
  if (pendingIds.length === 0) return [];

  const byId = new Map<string, RemoteServiceRequest>();
  if (inbox) {
    for (const req of inbox) {
      if (req.id?.trim()) byId.set(req.id, req);
    }
  }
  const cache = await loadRemoteCache();
  for (const [id, req] of Object.entries(cache)) {
    if (!byId.has(id)) byId.set(id, req);
  }

  const results: RemoteServiceRequest[] = [];
  for (const id of pendingIds) {
    const req = byId.get(id);
    if (req) results.push(req);
  }
  return results;
}

export async function registerNewlyImportedServiceRequests(
  requests: RemoteServiceRequest[],
): Promise<RemoteServiceRequest[]> {
  if (requests.length === 0) return [];
  await cacheRemoteServiceRequests(requests);
  const pending: RemoteServiceRequest[] = [];
  for (const req of requests) {
    if (!req.id?.trim()) continue;
    if (await isRemoteServiceRequestHandled(req.id)) continue;
    await registerPendingServiceRequest(req.id);
    pending.push(req);
  }
  return pending;
}
