// build.js — запуск: npm run build
// Считает SHA-256 всех модулей + CSS и пишет manifest.json

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'manifest.json');

function sha256(text) {
    const hash = crypto.createHash('sha256').update(text, 'utf8').digest('base64');
    return 'sha256-' + hash;
}

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    const list = [];
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) list.push(...walk(full));
        else list.push(full);
    }
    return list;
}

const files = {};
const targets = [
    path.join(ROOT, 'FQuest.css'),
    ...walk(path.join(ROOT, 'modules')),
].filter(p => fs.existsSync(p));

for (const full of targets) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const content = fs.readFileSync(full, 'utf8');
    files[rel] = { hash: sha256(content), size: content.length };
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const manifest = {
    version: pkg.version,
    minLoader: pkg.minLoader || '5.0.0',
    updatedAt: new Date().toISOString(),
    baseUrl: 'https://raw.githubusercontent.com/fun-venyv/fquest/main/',
    files,
};

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(`✔ manifest.json обновлён`);
console.log(`  Версия:   ${manifest.version}`);
console.log(`  Файлов:   ${Object.keys(files).length}`);
console.log(`  Обновлён: ${manifest.updatedAt}`);