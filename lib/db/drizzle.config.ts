import { defineConfig } from "drizzle-kit";

// DATABASE_URL is only required for push/migrate operations, not for generate

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL ? {
    url: process.env.DATABASE_URL,
  } : undefined,
});
