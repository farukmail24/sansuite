import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating items table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      item_code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(30) DEFAULT 'Product',
      sales_price DECIMAL(15,2) DEFAULT 0.00,
      sales_vat_rate DECIMAL(5,2) DEFAULT 20.00,
      sales_nominal_code VARCHAR(20),
      purchase_price DECIMAL(15,2) DEFAULT 0.00,
      purchase_vat_rate DECIMAL(5,2) DEFAULT 20.00,
      purchase_nominal_code VARCHAR(20),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);
  
  console.log("Creating cis_settings table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cis_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      is_contractor BOOLEAN DEFAULT FALSE,
      is_subcontractor BOOLEAN DEFAULT FALSE,
      employer_reference VARCHAR(50),
      accounts_office_reference VARCHAR(50),
      utr_number VARCHAR(20),
      deduction_rate DECIMAL(5,2) DEFAULT 20.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);
  
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
