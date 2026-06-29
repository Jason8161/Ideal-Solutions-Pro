import { json } from "./_workspace.js";

export async function onRequest() {
  return json({
    ok: true,
    service: "ideal-solutions-pages-api",
    workspaceApi: "/api/workspace/company",
    workspaceInvites: "POST /api/workspace/invites",
  });
}
