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
    console.log("Resetting 2FA state across database...");

    // Reset users
    await pool.query("UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0;");
    console.log("Reset users 2FA state.");

    // Reset system_admins
    await pool.query("UPDATE system_admins SET two_factor_secret = NULL, two_factor_enabled = 0;");
    console.log("Reset system_admins 2FA state.");

    // Ensure system_settings has security_enforce_2fa = 'false' by default unless changed
    await pool.query("INSERT INTO system_settings (`key`, `value`) VALUES ('security_enforce_2fa', 'false') ON DUPLICATE KEY UPDATE `value` = 'false';");
    console.log("Set security_enforce_2fa = 'false' in system_settings.");

    console.log("2FA state reset completed successfully.");
  } catch (err) {
    console.error("Reset failed:", err);
  } finally {
    await pool.end();
  }
}

run();
