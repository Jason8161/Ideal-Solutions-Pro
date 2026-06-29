import { json } from "./_workspace.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  return json({
    query: url.searchParams.get("q") ?? "",
    results: [],
    errors: [{ supplier: "pricing", message: "Live pricing is not enabled on this cloud site yet." }],
  });
}
