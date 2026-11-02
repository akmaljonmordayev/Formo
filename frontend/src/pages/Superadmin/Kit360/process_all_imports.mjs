import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { processTeam } from './process_team.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMPORT_DIR = path.join(__dirname, 'import');
const GALLERY_SCRIPT = 'C:\\Users\\Victus\\.gemini\\antigravity\\brain\\69bb9df5-9fd2-4993-bfe2-542b24ae0a47\\scratch\\build_gallery_artifact.mjs';

const teams = ['rm', 'fcb', 'mu', 'mci', 'psg', 'ar', 'es', 'fr', 'en', 'pt'];
let processedCount = 0;

for (const t of teams) {
  const teamImportDir = path.join(IMPORT_DIR, t);
  if (!fs.existsSync(teamImportDir)) continue;

  const files = {};
  for (let i = 0; i < 8; i++) {
    const p = path.join(teamImportDir, `f${i}.jpg`);
    if (fs.existsSync(p)) files[`f${i}`] = p;
  }

  // Need at least f0..f4
  if (files.f0 && files.f1 && files.f2 && files.f3 && files.f4) {
    console.log(`\n========================================`);
    console.log(`Processing imported team: ${t.toUpperCase()}`);
    console.log(`========================================`);
    const ok = processTeam(t, files);
    if (ok) processedCount++;
  }
}

if (processedCount > 0) {
  console.log(`\n[Kit360] Successfully processed ${processedCount} team(s)!`);
  console.log(`[Kit360] Updating 360 interactive gallery...`);
  if (fs.existsSync(GALLERY_SCRIPT)) {
    spawnSync('node', [GALLERY_SCRIPT], { stdio: 'inherit' });
  }
} else {
  console.log(`[Kit360] No complete sets (f0..f4) found in ${IMPORT_DIR}/<team>/`);
  console.log(`Place your generated JPEGs as f0.jpg, f1.jpg, f2.jpg, f3.jpg, f4.jpg (and optionally f5..f7) into the team folder.`);
}
