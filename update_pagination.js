const fs = require('fs');
const path = require('path');

const files = [
  'd:/sansuite/admin-panel/src/pages/DashboardLayout.tsx',
  'd:/sansuite/admin-panel/src/components/BillingTab.tsx',
  'd:/sansuite/admin-panel/src/components/TicketsTab.tsx',
  'd:/sansuite/admin-panel/src/components/EmailTemplatesTab.tsx',
  'd:/sansuite/admin-panel/src/components/AuditLogsTab.tsx',
  'd:/sansuite/admin-panel/src/components/AnnouncementsTab.tsx',
  'd:/sansuite/admin-panel/src/components/AdminsTab.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('const ITEMS_PER_PAGE = 10')) {
    // Add import
    const importHook = "import { usePaginationLimit } from '../hooks/useSettings'\n";
    if (!content.includes('usePaginationLimit')) {
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.substring(0, endOfLastImport + 1) + importHook + content.substring(endOfLastImport + 1);
    }
    
    // Replace hardcoded limit
    content = content.replace(/const ITEMS_PER_PAGE = 10/g, 'const ITEMS_PER_PAGE = usePaginationLimit()');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
