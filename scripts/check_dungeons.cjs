const fs = require('fs');
const path = require('path');

['instantDungeonBoss.ts', 'instantDungeonMonster.ts'].forEach(f => {
  const p = path.join(__dirname, '..', 'src', 'data', f);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  const objRegex = /name:\s*["']([^"']+)["'][\s\S]*?visualUrl:\s*["']([^"']+)["']/g;
  let m;
  while ((m = objRegex.exec(content)) !== null) {
    const name = m[1];
    const url = m[2];
    if (url.includes('image.png') || url.includes('armor.png') || url.includes('Kz56VGDS') || url.includes('6RsrXBZW') || url.includes('P9TfV9W1')) {
      console.log('Instant dungeon suspicious:', f, name, url);
    }
  }
});
