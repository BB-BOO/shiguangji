const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// Replace ANY number of backslashes before [ ] ( ) with just the bracket
content = content.replace(/\\+\[/g, '[');
content = content.replace(/\\+\]/g, ']');
content = content.replace(/\\+\(/g, '(');
content = content.replace(/\\+\)/g, ')');

// Verify
const parts = content.split('```mermaid');
let clean = true;
for (let i = 1; i < parts.length; i++) {
    const m = parts[i].substring(0, parts[i].indexOf('```'));
    const lines = m.trim().split('\n');
    let firstNode = '';
    for (const line of lines) {
        const match = line.match(/(\\+)\[/);
        if (match) {
            console.log('Block ' + i + ': STILL HAS ' + match[1].length + ' backslashes');
            clean = false;
            break;
        }
        if (!firstNode && line.includes('[')) {
            firstNode = line.trim().substring(0, 70);
        }
    }
    if (!clean || firstNode) {
        console.log('Block ' + i + ': first node → ' + (firstNode || '(no node found)'));
        clean = true;
    }
}

const remaining = (content.match(/\\+\[/g) || []).length;
console.log('\nTotal remaining backslash-bracket occurrences: ' + remaining);

fs.writeFileSync(path, content, 'utf-8');
console.log('Done.');
