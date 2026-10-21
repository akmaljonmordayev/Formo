// Dev-only syntax gate: parse every source file with the same parser Metro uses,
// so a broken file is caught here instead of failing the dev bundle with a 500.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ENTRY = path.join(ROOT, 'index.js');

const PLUGINS = [
  'jsx',
  'classProperties',
  'decorators-legacy',
  'dynamicImport',
  'optionalChaining',
  'nullishCoalescingOperator',
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(js|jsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [ENTRY, ...walk(SRC)];
let failed = 0;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: PLUGINS,
      errorRecovery: false,
    });
  } catch (err) {
    failed += 1;
    const loc = err.loc ? ` (line ${err.loc.line}, col ${err.loc.column})` : '';
    console.error(`FAIL ${path.relative(ROOT, file)}${loc}`);
    console.error(`  ${err.message.split('\n')[0]}`);
  }
}

console.log(`\nParsed ${files.length} files, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
