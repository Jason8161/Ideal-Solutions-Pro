import fs from "fs/promises";
import path from "path";

import type {
  PublicServiceRequestSubmitBody,
  ServiceRequestPhoto,
  ServiceRequestRecord,
  ServiceRequestWorkflowStatus,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "service-requests.json");

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function newPhotoId(): string {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<ServiceRequestRecord[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as ServiceRequestRecord[]) : [];
}

async function writeAll(rows: ServiceRequestRecord[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function listServiceRequestsForToken(
  contractorToken: string,
): Promise<ServiceRequestRecord[]> {
  const token = contractorToken.trim();
  if (!token) return [];
  const rows = await readAll();
  return rows
    .filter((r) => r.contractorToken === token)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getServiceRequestById(id: string): Promise<ServiceRequestRecord | null> {
  const rows = await readAll();
  return rows.find((r) => r.id === id) ?? null;
}

export async function createServiceRequest(
  body: PublicServiceRequestSubmitBody,
): Promise<ServiceRequestRecord> {
  const now = new Date().toISOString();
  const photos: ServiceRequestPhoto[] = (body.photos ?? [])
    .filter((p) => p && typeof p.data === "string" && p.data.trim())
    .slice(0, 8)
    .map((p) => ({
      id: newPhotoId(),
      mimeType: (typeof p.mimeType === "string" ? p.mimeType : "image/jpeg").trim(),
      data: p.data.trim(),
      createdAt: now,
    }));

  const record: ServiceRequestRecord = {
    id: newId(),
    contractorToken: (body.contractorToken ?? "").trim(),
    companyName: (body.companyName ?? "").trim(),
    customerName: (body.customerName ?? "").trim(),
    phone: (body.phone ?? "").trim(),
    email: (body.email ?? "").trim(),
    serviceAddress: (body.serviceAddress ?? "").trim(),
    bestTimeToContact: (body.bestTimeToContact ?? "").trim(),
    description: (body.description ?? "").trim(),
    priority: body.priority,
    photos,
    workflowStatus: "new",
    submittedAt: now,
    updatedAt: now,
  };

  const rows = await readAll();
  rows.push(record);
  await writeAll(rows);
  return record;
}

export async function updateServiceRequestStatus(
  id: string,
  contractorToken: string,
  workflowStatus: ServiceRequestWorkflowStatus,
): Promise<ServiceRequestRecord | null> {
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.id === id && r.contractorToken === contractorToken.trim());
  if (idx < 0) return null;
  const updated: ServiceRequestRecord = {
    ...rows[idx],
    workflowStatus,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = updated;
  await writeAll(rows);
  return updated;
}
