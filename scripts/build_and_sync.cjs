const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('[1/4] Building src with Vite...');
execSync('npm run build', { cwd: path.join(__dirname, '..', 'src'), stdio: 'inherit' });

const srcDist = path.join(__dirname, '..', 'src', 'dist');
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('[2/4] Syncing src/dist -> dist...');
copyRecursiveSync(srcDist, distDir);

console.log('[3/4] Syncing src/dist -> project root (for GitHub Pages root hosting)...');
if (fs.existsSync(path.join(srcDist, 'index.html'))) {
  fs.copyFileSync(path.join(srcDist, 'index.html'), path.join(rootDir, 'index.html'));
}
if (fs.existsSync(path.join(srcDist, 'assets'))) {
  copyRecursiveSync(path.join(srcDist, 'assets'), path.join(rootDir, 'assets'));
}

console.log('[4/4] Ensuring .nojekyll in root and dist...');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

console.log('✅ Build and sync completed successfully!');
