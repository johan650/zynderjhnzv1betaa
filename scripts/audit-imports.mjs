// Audit: cari import relatif tanpa ekstensi di file backend ESM (Node/Vercel tidak menambah ekstensi otomatis).
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const targets = [
  'server.ts',
  'whatsapp-worker.ts',
  'api/index.ts',
  'src/firebase.ts',
  ...walk(path.join(root, 'src', 'services')).map((f) => path.relative(root, f)),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : d.name.endsWith('.ts') ? [p] : [];
  });
}

const re = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]*)['"]/g;
const allowed = /\.(ts|tsx|js|mjs|json)$/;
let bad = 0;

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      if (!allowed.test(m[1])) {
        bad++;
        console.log(`NO-EXT ${rel}:${i + 1} -> ${m[1]}`);
      }
    }
  });
}

console.log(`remaining no-extension relative imports: ${bad}`);
process.exit(bad === 0 ? 0 : 1);
