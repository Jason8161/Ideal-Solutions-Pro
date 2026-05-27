import "dotenv/config";
import { CSVProvider } from "../pricing/providers/CSVProvider";

async function main() {
  const path = process.env.PRICING_CSV_PATH;
  if (!path) {
    console.error("Set PRICING_CSV_PATH (see env.example).");
    process.exit(1);
  }
  const csv = new CSVProvider(path);
  const { rowsAffected } = await csv.updateCachedPrices();
  console.log(`CSV import finished: ${rowsAffected} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
