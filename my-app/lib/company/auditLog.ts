import { loadPersistedAuthSession } from "@/lib/auth/authStorage";
import { hasCompanyUserApi, postCompanyAudit } from "@/lib/company/companyUserApi";

export type ClientAuditAction =
  | "clock_in"
  | "clock_out"
  | "job_update"
  | "phase_approval"
  | "draw_approval";

/** Best-effort server audit when pricing-backend + auth session are available. */
export async function logClientAuditEvent(input: {
  action: ClientAuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!hasCompanyUserApi()) return;
  try {
    const session = await loadPersistedAuthSession();
    if (!session?.token) return;
    await postCompanyAudit(session.token, input);
  } catch {
    /* non-blocking */
  }
}
