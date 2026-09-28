import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const files = fs.readdirSync(process.cwd());
    let apiFiles = [];
    try {
      apiFiles = fs.readdirSync(path.join(process.cwd(), "api"));
    } catch (e) {
      apiFiles = [e.message];
    }

    let indexImport = "pending";
    try {
      const mod = await import("./index.js");
      indexImport = { success: true, hasDefault: !!mod.default };
    } catch (e) {
      indexImport = { success: false, error: e.message, stack: e.stack };
    }

    return res.status(200).json({
      status: "ok",
      nodeVersion: process.version,
      cwd: process.cwd(),
      indexImport,
      files,
      apiFiles,
      env: {
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USERNAME,
        hasDbPass: !!process.env.DB_PASSWORD,
        hasJwtSecret: !!process.env.JWT_SECRET,
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      stack: err.stack,
    });
  }
}
