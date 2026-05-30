const fs = require('fs');
const c = fs.readFileSync('D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md', 'utf-8');
const lines = c.split('\n');
let issues = [];

for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const ln = i + 1;

    // 1. Unescaped pipes in table cells (| inside a cell breaks table parsing)
    // Skip separator rows and rows with code backticks
    if (l.trim().startsWith('|') && !l.includes('```')) {
        // Split by | and check each cell for bare |
        const bare = l.replace(/`[^`]*`/g, ''); // remove code spans
        const cells = bare.split('|');
        for (let j = 1; j < cells.length - 1; j++) {
            const cell = cells[j];
            if (cell.includes('|') && !cell.match(/^\s*-+\s*$/)) {
                issues.push('Line ' + ln + ': bare pipe in table cell → ' + cell.trim().substring(0, 60));
            }
        }
    }

    // 2. Underscores in table cells that create unintended italic
    if (l.trim().startsWith('|') && l.trim().endsWith('|') && !l.includes('---')) {
        const re = /[a-zA-Z]+_[a-zA-Z]/g;
        let match;
        while ((match = re.exec(l)) !== null) {
            // Check it's not in a code span
            const before = l.substring(0, match.index);
            const backtickCount = (before.match(/`/g) || []).length;
            if (backtickCount % 2 === 0) {
                issues.push('Line ' + ln + ': bare underscore in table → ' + match[0] + ' | ' + l.trim().substring(0, 80));
                break; // one per line is enough
            }
        }
    }
}

console.log('Found ' + issues.length + ' issues:');
issues.forEach(x => console.log(x));
