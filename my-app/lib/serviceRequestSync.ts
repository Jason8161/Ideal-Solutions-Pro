import {
  cacheRemoteServiceRequests,
  isRemoteServiceRequestHandled,
  loadPendingServiceRequests,
  registerNewlyImportedServiceRequests,
} from "@/lib/serviceRequestInboxState";
import { priorityLabel, remoteToServiceCallFields } from "@/lib/customerServiceRequest";
import type { ServiceRequestPriority } from "@/lib/serviceRequestApi";
import { getOrCreateContractorRequestToken } from "@/lib/contractorRequestToken";
import {
  fetchServiceRequestInbox,
  type RemoteServiceRequest,
} from "@/lib/serviceRequestApi";
import { notifyForImportedServiceRequests } from "@/lib/serviceRequestAlertDelivery";
import { emitServiceRequestSync } from "@/lib/serviceRequestSyncEvents";
import {
  addServiceCall,
  getServiceCallByRemoteRequestId,
  loadServiceCalls,
  type ServiceCallRecord,
  type ServiceCallWorkflowStatus,
} from "@/lib/serviceCallStorage";

function mapWorkflow(remote: RemoteServiceRequest): ServiceCallWorkflowStatus {
  return remote.workflowStatus ?? "new";
}

function mapPriority(remote: RemoteServiceRequest): ServiceRequestPriority {
  if (remote.priority === "urgent" || remote.priority === "emergency" || remote.priority === "normal") {
    return remote.priority;
  }
  return "normal";
}

async function importRemoteServiceRequest(req: RemoteServiceRequest): Promise<ServiceCallRecord> {
  const fields = remoteToServiceCallFields(req);
  return addServiceCall(fields, undefined, {
    source: "customer_link",
    remoteRequestId: req.id,
    workflowStatus: mapWorkflow(req),
    priority: mapPriority(req),
    bestTimeToContact: req.bestTimeToContact,
    customerSubmittedAt: req.submittedAt,
    photoDataUrls: req.photos.map((p) => {
      const raw = p.data.trim();
      if (raw.startsWith("data:")) return raw;
      const mime = p.mimeType || "image/jpeg";
      return `data:${mime};base64,${raw}`;
    }),
  });
}

export async function syncRemoteServiceRequests(): Promise<{
  imported: number;
  totalRemote: number;
  pendingRequests: RemoteServiceRequest[];
}> {
  const token = await getOrCreateContractorRequestToken();
  let remote: RemoteServiceRequest[];
  try {
    remote = await fetchServiceRequestInbox(token);
  } catch {
    const pendingRequests = await loadPendingServiceRequests();
    const result = { imported: 0, totalRemote: 0, pendingRequests };
    emitServiceRequestSync(result);
    return result;
  }

  await cacheRemoteServiceRequests(remote);

  const local = await loadServiceCalls();
  const knownRemoteIds = new Set(
    local.map((r) => r.remoteRequestId).filter((id): id is string => Boolean(id?.trim())),
  );

  let imported = 0;
  const newlyImported: RemoteServiceRequest[] = [];
  for (const req of remote) {
    if (knownRemoteIds.has(req.id)) continue;
  if (await isRemoteServiceRequestHandled(req.id)) continue;
    await importRemoteServiceRequest(req);
    knownRemoteIds.add(req.id);
    newlyImported.push(req);
    imported += 1;
  }

  const pendingFromNew = await registerNewlyImportedServiceRequests(newlyImported);

  if (pendingFromNew.length > 0) {
    await notifyForImportedServiceRequests(pendingFromNew);
  }

  const pendingRequests = await loadPendingServiceRequests(remote);
  const result = { imported, totalRemote: remote.length, pendingRequests };
  emitServiceRequestSync(result);
  return result;
}

export async function ensureServiceCallForRemoteRequest(
  req: RemoteServiceRequest,
): Promise<string | null> {
  const existing = await getServiceCallByRemoteRequestId(req.id);
  if (existing) return existing.id;
  const record = await importRemoteServiceRequest(req);
  return record.id;
}

export function workflowStatusLabel(status: ServiceCallWorkflowStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}

export function listPriorityBadge(priority: ServiceRequestPriority | undefined): string {
  if (!priority || priority === "normal") return "";
  return priorityLabel(priority);
}
