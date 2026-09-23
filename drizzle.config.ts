import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: `mysql://${process.env.DB_USERNAME || "root"}:${process.env.DB_PASSWORD || ""}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "3306"}/${process.env.DB_DATABASE || "SanSuite"}`,
  },
});
