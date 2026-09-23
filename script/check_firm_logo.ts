import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "SanSuite",
  port: parseInt(process.env.DB_PORT || "3306"),
});

async function check() {
  const [rows]: any = await pool.query("SELECT id, practice_id, firm_name, logo_url FROM firm_details;");
  console.log("FIRM DETAILS:", JSON.stringify(rows, null, 2));
  await pool.end();
}

check();
