const fs = require('fs');
const path = require('path');
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.startsWith("import React from 'react';")) {
        console.log('Fixing', full);
        const fixed = content.split('\n').slice(10).join('\n');
        fs.writeFileSync(full, fixed);
      }
    }
  }
}
walk('node_modules');
