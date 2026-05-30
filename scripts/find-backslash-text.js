const fs = require('fs');
const c = fs.readFileSync('D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md', 'utf-8');
const lines = c.split('\n');
let patterns = {};

for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Skip mermaid blocks
    if (l.includes('```')) continue;

    // Find any backslash followed by a non-backslash, non-whitespace char
    // This catches \*, \_, \#, \>, etc.
    let match;
    const re = /\\([^\s\\])/g;
    while ((match = re.exec(l)) !== null) {
        // Check if it looks like corrupted escaping (multiple backslashes in a row)
        const before = l.substring(Math.max(0, match.index - 5), match.index);
        const pattern = before + match[0];

        // Count consecutive backslashes before this char
        let bsCount = 1;
        let j = match.index - 1;
        while (j >= 0 && l[j] === '\\') {
            bsCount++;
            j--;
        }

        if (bsCount >= 2) {
            console.log('Line ' + (i+1) + ': bs=' + bsCount + ' | ' + l.trim().substring(0, 100));
            break;
        }
    }
}
