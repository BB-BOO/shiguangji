const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// Clean everywhere — mermaid blocks, code blocks, and text
// The corruption is the same pattern: N+ backslashes before certain chars.
// No legitimate content in this document needs backslash-escaping of *, _, #, >

content = content.replace(/\\+\*/g, '*');
content = content.replace(/\\+_/g, '_');
content = content.replace(/\\+#/g, '#');
content = content.replace(/\\+>/g, '>');

// Verify
const lines = content.split('\n');
let found = 0;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    const re = /\\([^\s\\])/g;
    let match;
    while ((match = re.exec(l)) !== null) {
        let bsCount = 1;
        let j = match.index - 1;
        while (j >= 0 && l[j] === '\\') {
            bsCount++;
            j--;
        }
        if (bsCount >= 2) {
            console.log('Line ' + (i+1) + ': bs=' + bsCount + ' | ' + l.trim().substring(0, 100));
            found++;
            break;
        }
    }
}

console.log('\nRemaining issues: ' + found);
fs.writeFileSync(path, content, 'utf-8');
console.log('Done.');
