const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Remove all blocks looking like `, (table) => { return { ... }; }`
const removeRegex = /,\s*\(table\)\s*=>\s*\{\s*return\s*\{[\s\S]*?\};\s*\}/g;

schemaContent = schemaContent.replace(removeRegex, '');

fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log('Indexes removed.');
