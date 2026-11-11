const fs = require('fs');
const path = require('path');

const fieldFiles = [
  'asiamonsterfield.ts',
  'europemonsterfield.ts',
  'americamonsterfield.ts',
  'africamonsterfield.ts',
  'magyemonsterfield.ts',
  'divinemonsterfield.ts',
  'elfmonsterfield.ts',
  'beastmonsterfield.ts',
  'demonmonsterfield.ts'
];

const exactMonsterImages = {};
const dummyUrls = new Set([
  'https://i.ibb.co/6RsrXBZW/image.png',
  'https://i.ibb.co/Kz56VGDS/image.png',
  'https://i.ibb.co/P9TfV9W1/armor.png'
]);

fieldFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', 'src', file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  const entryRegex = /["']([^"'\n\r]+)["']\s*:\s*["']([^"'\n\r]+)["']/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (val.startsWith('http')) {
      exactMonsterImages[key] = { url: val, file };
    }
  }
});

// Check which monsters in image maps use dummy/placeholder URLs (like image.png)
const monstersWithGenericImage = [];
Object.entries(exactMonsterImages).forEach(([name, data]) => {
  if (dummyUrls.has(data.url) || data.url.endsWith('/image.png')) {
    monstersWithGenericImage.push({ name, ...data });
  }
});

console.log('--- MONSTERS WITH GENERIC / DUMMY URLS ---');
console.log('Count:', monstersWithGenericImage.length);
console.log(monstersWithGenericImage.slice(0, 20));

// Check monsters appearing in hunt themes that do NOT have exact match in their continent's image map
const exactMissingInThemes = [];
fieldFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', 'src', file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  const monsterArrayRegex = /(?:beginner|lower|intermediate|advanced|elite|disaster|abyss|mythic|devil|divine)\s*:\s*\[([\s\S]*?)\]/g;
  let arrMatch;
  while ((arrMatch = monsterArrayRegex.exec(content)) !== null) {
    const listStr = arrMatch[1];
    const items = listStr.match(/["']([^"']+)["']/g) || [];
    items.forEach(raw => {
      const name = raw.replace(/["']/g, '').trim();
      if (!exactMonsterImages[name]) {
        exactMissingInThemes.push({ name, file });
      }
    });
  }
});

console.log('\n--- MONSTERS IN THEMES WITHOUT EXACT MAP ENTRY ---');
console.log('Count:', exactMissingInThemes.length);
console.log(exactMissingInThemes.slice(0, 20));

// Scan ItemData.ts items
const itemDataFile = path.join(__dirname, '..', 'src', 'ItemData.ts');
const itemDataContent = fs.readFileSync(itemDataFile, 'utf8');

const itemImageMap = {};
const itemMapRegex = /export const ITEM_IMAGE_MAP: Record<string, string> = \{([\s\S]*?)\n\};/;
const itemMapMatch = itemMapRegex.exec(itemDataContent);
if (itemMapMatch) {
  const entryRegex = /["']([^"'\n\r]+)["']\s*:\s*["']([^"'\n\r]+)["']/g;
  let em;
  while ((em = entryRegex.exec(itemMapMatch[1])) !== null) {
    itemImageMap[em[1].trim()] = em[2].trim();
  }
}

// Items in shop inventory, drops, etc.
const allItems = [];
const itemObjRegex = /{\s*(?:id:\s*["']([^"']+)["'],\s*)?name:\s*["']([^"']+)["'],[\s\S]*?type:\s*(?:ItemType\.)?([A-Za-z]+),[\s\S]*?rarity:\s*(?:ItemRarity\.)?([A-Za-z]+),[\s\S]*?description:\s*["']([^"']+)["']/g;
let ioMatch;
while ((ioMatch = itemObjRegex.exec(itemDataContent)) !== null) {
  allItems.push({
    name: ioMatch[2],
    type: ioMatch[3],
    rarity: ioMatch[4],
    description: ioMatch[5]
  });
}

const itemsMissingExactImage = [];
const itemsWithDummyUrl = [];
allItems.forEach(it => {
  const url = itemImageMap[it.name];
  if (!url) {
    itemsMissingExactImage.push(it);
  } else if (dummyUrls.has(url) || url.endsWith('/image.png')) {
    itemsWithDummyUrl.push({ ...it, url });
  }
});

console.log('\n--- ITEM SCAN RESULTS ---');
console.log('Total Defined Items in ItemData:', allItems.length);
console.log('Items with Dummy URL:', itemsWithDummyUrl.length);
console.log(itemsWithDummyUrl);
console.log('Items Missing Image in ITEM_IMAGE_MAP:', itemsMissingExactImage.length);
console.log('Sample Items Missing Image:', itemsMissingExactImage.slice(0, 15));
