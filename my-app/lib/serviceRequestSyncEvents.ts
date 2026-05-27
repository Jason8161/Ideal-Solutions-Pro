import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

export type ServiceRequestSyncResult = {
  imported: number;
  totalRemote: number;
  pendingRequests: RemoteServiceRequest[];
};

type Listener = (result: ServiceRequestSyncResult) => void;

const listeners = new Set<Listener>();

export function subscribeServiceRequestSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitServiceRequestSync(result: ServiceRequestSyncResult): void {
  for (const listener of listeners) {
    listener(result);
  }
}
