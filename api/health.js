export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  let dbStatus = "untested";
  let dbError = null;

  try {
    const mysql = await import("mysql2/promise");
    const rawHost = process.env.DB_HOST || "localhost";
    const host = rawHost.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
    const conn = await mysql.default.createConnection({
      host,
      user: process.env.DB_USERNAME || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_DATABASE || "SanSuite",
      port: parseInt(process.env.DB_PORT || "3306"),
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    await conn.end();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "error";
    dbError = err?.message || String(err);
  }

  res.status(200).json({
    status: "ok",
    service: "SanSuite Cloud Accounting API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: (process.env.DB_HOST || "localhost").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim(),
      database: process.env.DB_DATABASE || "SanSuite",
      user: process.env.DB_USERNAME || "root",
      error: dbError,
    },
    env: {
      hasDbHost: !!process.env.DB_HOST,
      hasDbUser: !!process.env.DB_USERNAME,
      hasDbPass: !!process.env.DB_PASSWORD,
      hasJwtSecret: !!process.env.JWT_SECRET,
    }
  });
}
