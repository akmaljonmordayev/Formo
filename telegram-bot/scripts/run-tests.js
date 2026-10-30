// node --test ga kompilyatsiya qilingan test fayllarini aniq ro'yxat bilan beradi
// (katalog/glob argumenti Node 20 va 22+ da turlicha ishlaydi).
const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const dir = join(__dirname, '..', 'build', 'test');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.js'))
  .map((f) => join(dir, f));
const { status } = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(status ?? 1);
