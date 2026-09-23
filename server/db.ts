import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../shared/schema";

/**
 * MySQL Connection Pool
 *
 * Connection limit is tunable via DB_CONNECTION_LIMIT env var.
 * For auto-scaling: set this LOW (e.g. 3–5 per server) so that
 * N servers don't exhaust MySQL's max_connections.
 *
 * Example: MySQL max_connections=200, 10 servers × 5 = 50 connections (safe)
 *
 * For production at scale, consider using PlanetScale (serverless MySQL)
 * or a connection pooler like ProxySQL / PgBouncer which handles pooling
 * externally so each server can use connectionLimit: 1.
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "SanSuite",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10"),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || "0"),
  connectTimeout: 10000,
  // Keep connections alive to avoid timeout disconnects
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

export const db = drizzle(pool, { schema, mode: "default" });
