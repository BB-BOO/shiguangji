const fs = require('fs');
const c = fs.readFileSync('D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md', 'utf-8');
const parts = c.split('```mermaid');

for (let i = 1; i < parts.length; i++) {
  const m = parts[i].substring(0, parts[i].indexOf('```'));
  const lines = m.trim().split('\n');
  for (const line of lines) {
    const match = line.match(/(\\+)\[/);
    if (match) {
      console.log('Block ' + i + ': ' + match[1].length + ' backslashes | ' + line.trim().substring(0, 80));
      break;
    }
  }
}
