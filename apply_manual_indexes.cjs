const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: (process.env.DB_USERNAME || 'root').replace(/"/g, ''),
        password: (process.env.DB_PASSWORD || '').replace(/"/g, ''),
        database: process.env.DB_DATABASE || 'sansuite'
    });

    const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');

    const tableRegex = /export const (\w+) = mysqlTable\("([^"]+)", \{([\s\S]*?)\n\}\)/g;
    
    let count = 0;
    
    let match;
    while ((match = tableRegex.exec(schemaContent)) !== null) {
        const tableName = match[2];
        const columnsStr = match[3];

        const indexMap = {
            'practice_id': 'practice_id',
            'client_id': 'client_id',
            'email': 'email',
            'status': 'status',
            'trading_status': 'trading_status',
            'created_at': 'created_at',
            'due_date': 'due_date',
            'statutory_deadline_date': 'statutory_deadline_date',
            'user_id': 'user_id',
            'assigned_user_id': 'assigned_user_id',
            'client_name': 'client_name'
        };

        for (const [colCode, dbColName] of Object.entries(indexMap)) {
            // Very naive check if the column exists in the table definition (db col name)
            if (columnsStr.includes(`"${dbColName}"`)) {
                const idxName = `${tableName}_${dbColName}_idx`;
                try {
                    // Check if index exists
                    const [rows] = await connection.execute(`SHOW INDEX FROM \`${tableName}\` WHERE Key_name = ?`, [idxName]);
                    if (rows.length === 0) {
                        console.log(`Adding index ${idxName} on ${tableName}(${dbColName})`);
                        await connection.execute(`CREATE INDEX \`${idxName}\` ON \`${tableName}\` (\`${dbColName}\`)`);
                        count++;
                    }
                } catch (e) {
                    console.error(`Error on ${tableName}(${dbColName}): ${e.message}`);
                }
            }
        }
    }
    
    console.log(`Successfully created ${count} missing indexes.`);
    await connection.end();
}

run().catch(console.error);
