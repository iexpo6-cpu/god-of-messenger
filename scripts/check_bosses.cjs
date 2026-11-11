const fs = require('fs');
const path = require('path');

const bossFiles = [
  'bossMonsters.ts',
  'mythicbossmonsters.ts',
  'asiabossmonster.ts',
  'americabossmonster.ts',
  'africabossmonster.ts',
  'wantedEnemies.ts',
  'monsters.ts'
];

const suspiciousBosses = [];

bossFiles.forEach(f => {
  const p = path.join(__dirname, '..', 'src', f);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');

  // find objects with name and visualUrl
  const objRegex = /name:\s*["']([^"']+)["'][\s\S]*?(?:visualUrl|imageUrl):\s*["']([^"']+)["']/g;
  let m;
  while ((m = objRegex.exec(content)) !== null) {
    const name = m[1];
    const url = m[2];
    if (url.includes('image.png') || url.includes('armor.png') || url.includes('Kz56VGDS') || url.includes('6RsrXBZW') || url.includes('P9TfV9W1')) {
      suspiciousBosses.push({ file: f, name, url });
    }
  }
});

console.log('Suspicious bosses count:', suspiciousBosses.length);
console.log(suspiciousBosses);
