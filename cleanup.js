const fs = require('fs');
const path = require('path');

function cleanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            cleanDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs') || fullPath.endsWith('.cjs')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.startsWith("import React from 'react';")) {
                    console.log('Fixing: ' + fullPath);
                    const lines = content.split('\n');
                    const fixed = lines.slice(10).join('\n');
                    fs.writeFileSync(fullPath, fixed, 'utf8');
                }
            } catch (e) {
                // ignore
            }
        }
    }
}
console.log('Starting cleanup...');
cleanDir(path.join(__dirname, 'trafficiq-frontend', 'node_modules'));
cleanDir(path.join(__dirname, 'trafficiq-backend', 'node_modules'));
cleanDir(path.join(__dirname, 'node_modules'));
console.log('Cleanup done!');
