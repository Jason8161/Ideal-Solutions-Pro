const fs = require("fs");
const path = require("path");

const transcript =
  "C:/Users/Jason/.cursor/projects/c-Users-Jason-Electrical-app-Ideal-Solutions/agent-transcripts/7a8acb2c-8223-43ca-bfac-8f408d17ec21/7a8acb2c-8223-43ca-bfac-8f408d17ec21.jsonl";
const out = path.join(__dirname, "../samples/homedepot-search-response.json");

const line = fs.readFileSync(transcript, "utf8").split(/\r?\n/)[700];
const row = JSON.parse(line);
const text = row.message?.content?.find((c) => c.type === "text")?.text ?? "";
const start = text.indexOf("{");
const end = text.lastIndexOf("}");
if (start < 0 || end < 0) {
  console.error("No JSON object in user message");
  process.exit(1);
}

const parsed = JSON.parse(text.slice(start, end + 1));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(parsed, null, 2));
console.log("Wrote", out, "results:", parsed.results?.length);
