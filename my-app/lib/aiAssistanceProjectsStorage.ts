import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AiChatMessage } from "@/lib/aiAssistanceTypes";

const PROJECTS_KEY = "ideal_solutions_ai_assistance_projects_v1";
const ACTIVE_PROJECT_KEY = "ideal_solutions_ai_assistance_active_project_v1";
const MAX_PROJECTS = 80;

export type AiAssistanceProject = {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
  /** When true, auto-title from first message is skipped. */
  titleLocked?: boolean;
};

export type AiAssistanceProjectsStore = {
  projects: AiAssistanceProject[];
  activeProjectId: string | null;
};

export function newAiAssistanceProjectId(): string {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createAiAssistanceProject(title = "New conversation"): AiAssistanceProject {
  const now = new Date().toISOString();
  return {
    id: newAiAssistanceProjectId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveAiProjectTitle(messages: AiChatMessage[], fallback = "New conversation"): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return fallback;
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  if (text.length <= 48) return text;
  return `${text.slice(0, 45).trim()}…`;
}

export function projectPreviewText(project: AiAssistanceProject): string {
  if (project.messages.length === 0) return "No messages yet";
  const last = project.messages[project.messages.length - 1];
  const text = last.content.trim().replace(/\s+/g, " ");
  const prefix = last.role === "user" ? "You: " : "AI: ";
  const body = text.length <= 72 ? text : `${text.slice(0, 69).trim()}…`;
  return `${prefix}${body}`;
}

function normalizeProject(raw: unknown): AiAssistanceProject | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<AiAssistanceProject>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  if (!Array.isArray(row.messages)) return null;
  const messages = row.messages.filter(
    (m): m is AiChatMessage =>
      typeof m === "object" &&
      m !== null &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString();
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : createdAt;
  return {
    id: row.id,
    title: row.title.trim() || deriveAiProjectTitle(messages),
    messages,
    createdAt,
    updatedAt,
    titleLocked: row.titleLocked === true,
  };
}

function trimProjects(projects: AiAssistanceProject[]): AiAssistanceProject[] {
  return [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PROJECTS);
}

export async function loadAiAssistanceProjectsStore(): Promise<AiAssistanceProjectsStore> {
  try {
    const [rawProjects, activeProjectId] = await Promise.all([
      AsyncStorage.getItem(PROJECTS_KEY),
      AsyncStorage.getItem(ACTIVE_PROJECT_KEY),
    ]);
    let projects: AiAssistanceProject[] = [];
    if (rawProjects) {
      const parsed = JSON.parse(rawProjects) as unknown;
      if (Array.isArray(parsed)) {
        projects = trimProjects(
          parsed.map(normalizeProject).filter((p): p is AiAssistanceProject => p !== null),
        );
      }
    }
    const active =
      typeof activeProjectId === "string" && projects.some((p) => p.id === activeProjectId)
        ? activeProjectId
        : projects[0]?.id ?? null;
    return { projects, activeProjectId: active };
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

async function persistProjects(projects: AiAssistanceProject[]): Promise<void> {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(trimProjects(projects)));
}

export async function setActiveAiAssistanceProjectId(projectId: string | null): Promise<void> {
  if (projectId) {
    await AsyncStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } else {
    await AsyncStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export async function saveAiAssistanceProjectsStore(store: AiAssistanceProjectsStore): Promise<void> {
  await persistProjects(store.projects);
  await setActiveAiAssistanceProjectId(store.activeProjectId);
}

export async function upsertAiAssistanceProject(project: AiAssistanceProject): Promise<AiAssistanceProject[]> {
  const { projects } = await loadAiAssistanceProjectsStore();
  const idx = projects.findIndex((p) => p.id === project.id);
  const next = idx >= 0 ? [...projects] : [project, ...projects];
  if (idx >= 0) next[idx] = project;
  else next[0] = project;
  const trimmed = trimProjects(next);
  await persistProjects(trimmed);
  return trimmed;
}

export async function deleteAiAssistanceProject(projectId: string): Promise<AiAssistanceProjectsStore> {
  const store = await loadAiAssistanceProjectsStore();
  const projects = store.projects.filter((p) => p.id !== projectId);
  let activeProjectId = store.activeProjectId;
  if (activeProjectId === projectId) {
    activeProjectId = projects[0]?.id ?? null;
  }
  await saveAiAssistanceProjectsStore({ projects, activeProjectId });
  return { projects, activeProjectId };
}

export async function renameAiAssistanceProject(projectId: string, title: string): Promise<AiAssistanceProject[]> {
  const trimmed = title.trim();
  if (!trimmed) return (await loadAiAssistanceProjectsStore()).projects;
  const store = await loadAiAssistanceProjectsStore();
  const projects = store.projects.map((p) =>
    p.id === projectId
      ? { ...p, title: trimmed, titleLocked: true, updatedAt: new Date().toISOString() }
      : p,
  );
  await persistProjects(projects);
  return projects;
}

export function formatAiProjectWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
