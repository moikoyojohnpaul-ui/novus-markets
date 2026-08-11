import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  console.log("Database truncated");
  process.exit(0);
}

main();
