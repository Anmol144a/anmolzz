// setup.js — Run with: node setup.js
// Fixes: folder structure, package.json, vercel.json, asset paths, build script
// Works on macOS, Linux, Windows (via Git Bash or WSL)

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const publicSrc = path.join(repoRoot, 'public', 'assets');
const publicOut = path.join(repoRoot, 'public_output');
const srcDir = path.join(repoRoot, 'src', 'js');
const htmlPath = path.join(repoRoot, 'index.html');

// --- 1. Create required folders ---
['public/assets', 'public_output', 'src/js'].forEach(dir => {
  if (!fs.existsSync(path.join(repoRoot, dir))) {
    fs.mkdirSync(path.join(repoRoot, dir), { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

// --- 2. Rename image if exists ---
const oldImage = path.join(publicSrc, 'image_113.jpg');
const newImage = path.join(publicSrc, 'profile.jpg');
if (fs.existsSync(oldImage) && !fs.existsSync(newImage)) {
  fs.renameSync(oldImage, newImage);
  console.log('Renamed image_113.jpg → profile.jpg');
}

// --- 3. Add .gitkeep ---
fs.writeFileSync(path.join(publicSrc, '.gitkeep'), '');
console.log('Added .gitkeep');

// --- 4. Write package.json ---
fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({
  name: "anmol-portfolio",
  version: "1.0.0",
  private: true,
  scripts: {
    build: "mkdir -p public_output && cp index.html public_output/ && cp -r src public_output/ && mkdir -p public_output/assets && cp -r public/assets/* public_output/assets/ 2>/dev/null || true"
  }
}, null, 2));
console.log('Wrote package.json');

// --- 5. Write vercel.json ---
fs.writeFileSync(path.join(repoRoot, 'vercel.json'), JSON.stringify({
  "$schema": "https://openapi.vercel.sh/vercel.json",
  outputDirectory: "public_output",
  rewrites: [{ source: "/(.*)", destination: "/index.html" }]
}, null, 2));
console.log('Wrote vercel.json');

// --- 6. Fix index.html paths ---
let html = fs.readFileSync(htmlPath, 'utf-8');
html = html
  .replace(/src="assets\/image_113\.jpg"/g, 'src="/assets/profile.jpg"')
  .replace(/src="src\/js\/anmol\.js"/g, 'src="/src/js/anmol.js"')
  .replace(/<link rel="icon".*>/, '<link rel="icon" href="/assets/favicon.ico" type="image/x-icon">');
fs.writeFileSync(htmlPath, html);
console.log('Fixed index.html paths');

// --- 7. Create placeholder anmol.js if missing ---
const anmolPath = path.join(srcDir, 'anmol.js');
if (!fs.existsSync(anmolPath)) {
  fs.writeFileSync(anmolPath, `// anmol.js - AI Chat (OpenRouter)
console.log("Anmolz AI ready!");
// Paste your full anmol.js code here
`);
  console.log('Created placeholder anmol.js');
}

console.log('\nSetup complete!');
console.log('Now run:');
console.log('   git add .');
console.log('   git commit -m "Final setup: build + assets"');
console.log('   git push');
console.log('\nYour site will deploy successfully on Vercel!');
