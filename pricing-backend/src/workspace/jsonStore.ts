import fs from "fs/promises";
import path from "path";

import type { WorkspaceJsonSnapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "workspace.json");

const EMPTY: WorkspaceJsonSnapshot = {
  companies: [],
  users: [],
  employees: [],
  invites: [],
  jobs: [],
  jobAssignments: [],
  messages: [],
  notifications: [],
  pushTokens: [],
};

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY, null, 2), "utf8");
  }
}

export async function readWorkspaceJson(): Promise<WorkspaceJsonSnapshot> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<WorkspaceJsonSnapshot>;
  return {
    companies: parsed.companies ?? [],
    users: parsed.users ?? [],
    employees: parsed.employees ?? [],
    invites: parsed.invites ?? [],
    jobs: parsed.jobs ?? [],
    jobAssignments: parsed.jobAssignments ?? [],
    messages: parsed.messages ?? [],
    notifications: parsed.notifications ?? [],
    pushTokens: parsed.pushTokens ?? [],
  };
}

export async function writeWorkspaceJson(snapshot: WorkspaceJsonSnapshot): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}
