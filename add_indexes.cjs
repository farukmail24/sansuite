const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

const tableRegex = /export const (\w+) = mysqlTable\("([^"]+)", \{([\s\S]*?)\n\}\);/g;

let modifiedCount = 0;
schemaContent = schemaContent.replace(tableRegex, (match, tableName, dbName, columnsStr) => {
    // If it already has a third argument, skip
    if (match.endsWith('}, (table) => {')) return match;
    
    // Analyze columns to decide which indexes to add
    const indexes = [];
    
    if (columnsStr.includes('practiceId:')) {
        indexes.push(`practiceIdx: index("${tableName}_practice_idx").on(table.practiceId)`);
    }
    if (columnsStr.includes('clientId:')) {
        indexes.push(`clientIdx: index("${tableName}_client_idx").on(table.clientId)`);
    }
    if (columnsStr.includes('email:')) {
        indexes.push(`emailIdx: index("${tableName}_email_idx").on(table.email)`);
    }
    if (columnsStr.includes('status:')) {
        indexes.push(`statusIdx: index("${tableName}_status_idx").on(table.status)`);
    }
    if (columnsStr.includes('tradingStatus:')) {
        indexes.push(`tradingStatusIdx: index("${tableName}_trading_status_idx").on(table.tradingStatus)`);
    }
    if (columnsStr.includes('createdAt:')) {
        indexes.push(`createdAtIdx: index("${tableName}_created_at_idx").on(table.createdAt)`);
    }
    if (columnsStr.includes('dueDate:')) {
        indexes.push(`dueDateIdx: index("${tableName}_due_date_idx").on(table.dueDate)`);
    }
    if (columnsStr.includes('statutoryDeadlineDate:')) {
        indexes.push(`statutoryDeadlineDateIdx: index("${tableName}_statutory_deadline_idx").on(table.statutoryDeadlineDate)`);
    }
    if (columnsStr.includes('userId:')) {
        indexes.push(`userIdx: index("${tableName}_user_idx").on(table.userId)`);
    }
    if (columnsStr.includes('assignedUserId:')) {
        indexes.push(`assignedUserIdx: index("${tableName}_assigned_user_idx").on(table.assignedUserId)`);
    }
    if (columnsStr.includes('clientName:')) {
        indexes.push(`clientNameIdx: index("${tableName}_client_name_idx").on(table.clientName)`);
    }
    
    if (indexes.length > 0) {
        modifiedCount++;
        const newTableStr = `export const ${tableName} = mysqlTable("${dbName}", {${columnsStr}\n}, (table) => {\n  return {\n    ${indexes.join(',\n    ')}\n  };\n});`;
        return newTableStr;
    }
    
    return match;
});

fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log(`Modified ${modifiedCount} tables by adding unique indexes.`);
