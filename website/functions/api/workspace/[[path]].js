import { handleWorkspaceRequest } from "../../_workspace.js";

export async function onRequest(context) {
  return handleWorkspaceRequest(context.request, context.env, new URL(context.request.url));
}
