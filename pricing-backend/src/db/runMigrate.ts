import { pool } from "./pool";
import { INIT_SQL, WORKSPACE_SQL } from "./schema";

async function main() {
  await pool.query(INIT_SQL);
  await pool.query(WORKSPACE_SQL);
  console.log("Database schema ensured (catalog + workspace).");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
