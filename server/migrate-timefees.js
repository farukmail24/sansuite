import mysql from 'mysql2/promise';

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sansuite'
  });

  console.log('Connected to MySQL sansuite database successfully.');

  // 1. Create table time_fees_staff_rates if not exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`time_fees_staff_rates\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`practice_id\` INT NOT NULL,
      \`user_id\` INT NOT NULL,
      \`role_tier\` VARCHAR(30) DEFAULT 'Staff',
      \`capacity_hours_per_week\` DECIMAL(5,2) DEFAULT '37.50',
      \`billable_rate_per_hour\` DECIMAL(10,2) DEFAULT '75.00',
      \`cost_rate_per_hour\` DECIMAL(10,2) DEFAULT '35.00',
      \`assigned_tasks_json\` JSON,
      \`manager_id\` INT,
      \`is_active\` BOOLEAN DEFAULT TRUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_practice_user\` (\`practice_id\`, \`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Checked/Created table time_fees_staff_rates');

  // Helper to safely add column if not exists
  async function addColumnIfNotExists(table, column, definition) {
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Added column ${column} to ${table}`);
    } else {
      console.log(`Column ${column} already exists in ${table}`);
    }
  }

  // 2. Update timesheets
  await addColumnIfNotExists('timesheets', 'invoice_id', 'INT NULL');
  await addColumnIfNotExists('timesheets', 'withdrawn_at', 'TIMESTAMP NULL');
  await addColumnIfNotExists('timesheets', 'withdrawn_by', 'INT NULL');

  // 3. Update expenses
  await addColumnIfNotExists('expenses', 'billed_invoice_id', 'INT NULL');
  await addColumnIfNotExists('expenses', 'rejection_reason', 'TEXT NULL');
  await addColumnIfNotExists('expenses', 'miles', 'DECIMAL(8,2) NULL');
  await addColumnIfNotExists('expenses', 'mileage_rate', 'DECIMAL(5,2) NULL DEFAULT 0.45');

  // 4. Update jobs
  await addColumnIfNotExists('jobs', 'emails_json', 'JSON NULL');

  // 5. Update time_fees_settings
  await addColumnIfNotExists('time_fees_settings', 'column_customization_json', 'JSON NULL');

  console.log('Migration completed successfully!');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
