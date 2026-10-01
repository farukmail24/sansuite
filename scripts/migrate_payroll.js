import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sansuite'
});

async function addCol(table, col, def) {
  const [cols] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [col]);
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    console.log(`Added ${col} to ${table}`);
  } else {
    console.log(`${col} already in ${table}`);
  }
}

await addCol('employees', 'bank_sort_code', 'VARCHAR(10) NULL');
await addCol('employees', 'bank_account_number', 'VARCHAR(20) NULL');
await addCol('employees', 'bank_account_name', 'VARCHAR(100) NULL');

await addCol('pay_runs', 'notes', 'TEXT NULL');
await addCol('pay_runs', 'is_rolled_back', 'TINYINT(1) DEFAULT 0');

await addCol('rti_submissions', 'state_aid_sector', "VARCHAR(50) DEFAULT 'None'");
await addCol('rti_submissions', 'inactivity_start_date', 'VARCHAR(20) NULL');
await addCol('rti_submissions', 'inactivity_end_date', 'VARCHAR(20) NULL');
await addCol('rti_submissions', 'smp_recovered', 'DECIMAL(12,2) DEFAULT 0.00');
await addCol('rti_submissions', 'spp_recovered', 'DECIMAL(12,2) DEFAULT 0.00');
await addCol('rti_submissions', 'sap_recovered', 'DECIMAL(12,2) DEFAULT 0.00');
await addCol('rti_submissions', 'shpp_recovered', 'DECIMAL(12,2) DEFAULT 0.00');
await addCol('rti_submissions', 'nic_compensation', 'DECIMAL(12,2) DEFAULT 0.00');
await addCol('rti_submissions', 'is_final_submission', 'TINYINT(1) DEFAULT 0');
await addCol('rti_submissions', 'late_reason', 'VARCHAR(5) NULL');

console.log('Payroll schema migration executed successfully!');
await conn.end();
