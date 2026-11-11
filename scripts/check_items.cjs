const fs = require('fs');
const path = require('path');

const itemDataContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'ItemData.ts'), 'utf8');

// Extract ITEM_IMAGE_MAP keys
const itemMapRegex = /export const ITEM_IMAGE_MAP: Record<string, string> = \{([\s\S]*?)\n\};/;
const mapMatch = itemMapRegex.exec(itemDataContent);
const mappedKeys = new Set();
const dummyUrls = new Set([
  'https://i.ibb.co/6RsrXBZW/image.png',
  'https://i.ibb.co/Kz56VGDS/image.png',
  'https://i.ibb.co/P9TfV9W1/armor.png'
]);
const dummyEntries = [];

if (mapMatch) {
  const entryRegex = /["']([^"'\n\r]+)["']\s*:\s*["']([^"'\n\r]+)["']/g;
  let m;
  while ((m = entryRegex.exec(mapMatch[1])) !== null) {
    const k = m[1].trim();
    const v = m[2].trim();
    mappedKeys.add(k);
    if (dummyUrls.has(v) || v.endsWith('/image.png') || v.endsWith('/armor.png')) {
      dummyEntries.push({ item: k, url: v });
    }
  }
}

// Extract createShopItem("이름", ...)
const shopItemRegex = /createShopItem\(\s*["']([^"']+)["'],\s*["']([^"']+)["'],\s*ItemRarity\.([A-Za-z]+),[\s\S]*?["']([^"']+)["']/g;
const nationItems = [];
let sm;
while ((sm = shopItemRegex.exec(itemDataContent)) !== null) {
  nationItems.push({
    name: sm[1],
    slot: sm[2],
    rarity: sm[3],
    description: sm[4]
  });
}

// Extract basic items
const basicItemRegex = /{\s*name:\s*["']([^"']+)["'],[\s\S]*?description:\s*["']([^"']+)["']/g;

console.log('--- NATION ITEMS MISSING FROM ITEM_IMAGE_MAP ---');
const missingNationItems = nationItems.filter(it => !mappedKeys.has(it.name));
console.log('Missing count:', missingNationItems.length, 'out of', nationItems.length);
console.log(missingNationItems.slice(0, 20));

console.log('\n--- DUMMY ENTRIES IN ITEM_IMAGE_MAP ---');
console.log(dummyEntries);
