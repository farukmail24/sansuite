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
    console.log("Checking DB schema for 2FA columns...");

    // Check users table
    const [userCols]: any = await pool.query("SHOW COLUMNS FROM users LIKE 'two_factor_secret'");
    if (userCols.length === 0) {
      console.log("Adding 2FA columns to users table...");
      await pool.query("ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL, ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0;");
      console.log("Added 2FA columns to users table successfully.");
    } else {
      console.log("2FA columns already exist in users table.");
    }

    // Check system_admins table
    const [adminCols]: any = await pool.query("SHOW COLUMNS FROM system_admins LIKE 'two_factor_secret'");
    if (adminCols.length === 0) {
      console.log("Adding 2FA columns to system_admins table...");
      await pool.query("ALTER TABLE system_admins ADD COLUMN two_factor_secret VARCHAR(255) NULL, ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0;");
      console.log("Added 2FA columns to system_admins table successfully.");
    } else {
      console.log("2FA columns already exist in system_admins table.");
    }

    console.log("DB migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

run();
