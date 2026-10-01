import { db } from "../server/db";

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS fees_credit_notes (
      id int NOT NULL AUTO_INCREMENT,
      practice_id int NOT NULL,
      invoice_id int NOT NULL,
      client_id int NOT NULL,
      credit_note_number varchar(50) NOT NULL,
      credit_note_date date NOT NULL,
      reason text,
      net_amount decimal(15,2) DEFAULT '0.00',
      vat_amount decimal(15,2) DEFAULT '0.00',
      total_amount decimal(15,2) DEFAULT '0.00',
      line_items_json json DEFAULT NULL,
      status varchar(30) DEFAULT 'Issued',
      created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fees_cn_practice_idx (practice_id),
      KEY fees_cn_invoice_idx (invoice_id),
      KEY fees_cn_client_idx (client_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await db.execute(sql);
  console.log("SUCCESS: fees_credit_notes created or already exists!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
