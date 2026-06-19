const fs = require('fs');
const lines = fs.readFileSync('i18n.js', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('Reporter') || l.includes('modify')) {
        console.log(`${i + 1}: ${l.trim()}`);
    }
});
