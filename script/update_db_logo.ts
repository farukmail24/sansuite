import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "SanSuite",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function run() {
  try {
    console.log("Checking DB schema for logo_url column...");

    const [cols]: any = await pool.query("SHOW COLUMNS FROM firm_details LIKE 'logo_url'");
    if (cols.length === 0) {
      console.log("Adding logo_url column to firm_details table...");
      await pool.query("ALTER TABLE firm_details ADD COLUMN logo_url TEXT NULL;");
      console.log("Added logo_url column successfully.");
    } else {
      console.log("logo_url column already exists in firm_details table.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

run();
