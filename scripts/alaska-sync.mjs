import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();

// FPOF-V3-ALASKA is the master engine — all skill edits happen here
const ENGINE_SOURCE = path.join(home, 'Desktop/FPOF-V3-ALASKA/system/skills/fashion/');

// Mirror destinations synced from engine
const MIRRORS = [
  path.join(home, 'Desktop/system/skills/fashion/'),
  path.join(home, 'Desktop/open-design-ALASKA/skills/fashion/'),
];

// All four repos committed and pushed
const REPOS = [
  { name: 'FPOF-V3-ALASKA',     path: path.join(home, 'Desktop/FPOF-V3-ALASKA') },
  { name: 'system',             path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex',  path: path.join(home, 'Desktop/open-design-codex') },
];

const commitMsg = process.argv.includes('--message')
  ? process.argv[process.argv.indexOf('--message') + 1]
  : 'feat(alaska): sync skills from FPOF-V3-ALASKA engine';

try {
  console.log('🔄 Step 1: Syncing ENGINE → MIRRORS...');
  for (const mirror of MIRRORS) {
    execSync(`cp -r "${ENGINE_SOURCE}"* "${mirror}"`);
    console.log(`  ✅ → ${mirror}`);
  }

  console.log('\n📦 Step 2: Committing and pushing all repos...');
  for (const repo of REPOS) {
    console.log(`\n  [${repo.name}]`);
    execSync(`git -C "${repo.path}" add .`);
    try {
      execSync(`git -C "${repo.path}" commit -m "${commitMsg}"`, { stdio: 'ignore' });
      console.log('  ✅ Committed');
    } catch {
      console.log('  ℹ️  No changes');
    }
    execSync(`git -C "${repo.path}" pull --rebase origin brand/alaska`);
    execSync(`git -C "${repo.path}" push origin brand/alaska`);
    console.log('  🚀 Pushed');
  }

  console.log('\n✨ Sync complete — all repos up-to-date.');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
