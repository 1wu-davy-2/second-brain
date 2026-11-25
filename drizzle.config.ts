import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_OVERRIDE?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      "postgres://localhost:5432/second_brain",
  },
  verbose: true,
  strict: false,
});
