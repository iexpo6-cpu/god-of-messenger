const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

console.log('--- ALL OCCURRENCES OF DUMMY OR IMAGE.PNG ---');
files.forEach(f => {
  const content = fs.readFileSync(path.join(srcDir, f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (
      line.includes('6RsrXBZW') ||
      line.includes('Kz56VGDS') ||
      line.includes('P9TfV9W1') ||
      (line.includes('/image.png') && !line.includes('//'))
    ) {
      console.log(`${f}:${idx + 1}: ${line.trim()}`);
    }
  });
});
