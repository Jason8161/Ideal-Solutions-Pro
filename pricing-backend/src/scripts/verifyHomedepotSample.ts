import fs from "fs";
import path from "path";
import { filterAndRankElectricalResults } from "../pricing/electricalRelevance";

type Row = {
  name?: string;
  brand?: string;
  categories?: string[];
  department?: string;
};

function pickCategory(row: Row): string {
  if (Array.isArray(row.categories) && row.categories.length > 0) {
    return row.categories[row.categories.length - 1] ?? "";
  }
  return row.department ?? "";
}

function main(): void {
  const samplePath = path.join(__dirname, "../../samples/homedepot-search-response.json");
  if (!fs.existsSync(samplePath)) {
    console.error("Missing", samplePath);
    process.exit(1);
  }
  const body = JSON.parse(fs.readFileSync(samplePath, "utf8")) as { results?: Row[] };
  const rows = body.results ?? [];
  const query = "14/2";

  const ranked = filterAndRankElectricalResults(
    query,
    rows.map((r) => ({
      raw: r,
      name: r.name ?? "",
      brand: r.brand,
      category: pickCategory(r),
      department: r.department,
      description: [r.brand, r.department, ...(r.categories ?? [])].filter(Boolean).join(" "),
    })),
    { maxResults: 8 },
  );

  console.log(`Top ${ranked.length} results for query "${query}" (from ${rows.length} sample rows):`);
  for (const { name, brand, category } of ranked) {
    console.log(`  - ${name} (${brand ?? "?"}) [${category}]`);
  }

  const top = ranked[0]?.name ?? "";
  if (!/\b(romex|nm-?b|uf-?b|mc\s*cable|building\s*wire)\b/i.test(top)) {
    console.error("Expected building wire (Romex/NM-B/UF-B/MC) at #1, got:", top);
    process.exit(1);
  }

  const noise = ranked.find((r) => /galvanized\s*steel|wire\s*rope/i.test(r.name ?? ""));
  if (noise) {
    console.error("Hardware wire rope should not rank for 14/2:", noise.name);
    process.exit(1);
  }
  console.log("OK — building wire ranked first; hardware wire rope excluded.");
}

main();
