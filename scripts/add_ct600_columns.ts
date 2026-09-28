import mysql from 'mysql2/promise';

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'SanSuite'
  });

  const cols: [string, string][] = [
    ['associated_companies_count', 'INT DEFAULT 0'],
    ['is_amended_return', 'TINYINT(1) DEFAULT 0'],
    ['amendment_reason', 'TEXT'],
    ['company_type', 'VARCHAR(20) DEFAULT "0"'],
    ['bank_name', 'VARCHAR(100)'],
    ['bank_sort_code', 'VARCHAR(20)'],
    ['bank_account_number', 'VARCHAR(30)'],
    ['bank_account_name', 'VARCHAR(100)'],
    ['declaration_name', 'VARCHAR(100)'],
    ['declaration_status', 'VARCHAR(50) DEFAULT "Director"']
  ];

  for (const [col, def] of cols) {
    try {
      await conn.execute(`ALTER TABLE ct600_returns ADD COLUMN ${col} ${def}`);
      console.log(`Successfully added ${col}`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`Column ${col} already exists`);
      } else {
        console.error(`Error adding ${col}:`, e.message);
      }
    }
  }

  await conn.end();
  console.log('Migration completed successfully.');
}

migrate().catch(console.error);
