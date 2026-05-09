import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();
const REPOS = [
  { name: 'system', path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex', path: path.join(home, 'Desktop/open-design-codex') }
];

// ⭐ 엔진 소스를 FPOF-V3-ALASKA 내부 폴더로 변경!
const ENGINE_SOURCE = path.join(home, 'Desktop/FPOF-V3-ALASKA/system/skills/fashion/');
const BACKUP_TARGET_1 = path.join(home, 'Desktop/open-design-ALASKA/skills/fashion/');
const BACKUP_TARGET_2 = path.join(home, 'Desktop/system/skills/fashion/');

try {
  console.log("🔄 Step 1: Syncing from V3-ENGINE to all repositories...");
  // 두 군데 백업지로 모두 복사
  execSync(`cp -r ${ENGINE_SOURCE}* ${BACKUP_TARGET_1}`);
  execSync(`cp -r ${ENGINE_SOURCE}* ${BACKUP_TARGET_2}`);

  for (const repo of REPOS) {
    console.log(`\n📦 Processing [${repo.name}]...`);
    execSync(`git -C ${repo.path} add .`);
    try {
      execSync(`git -C ${repo.path} commit -m "feat(alaska): sync from V3 main engine"`, { stdio: 'ignore' });
    } catch (e) {}
    execSync(`git -C ${repo.path} pull --rebase origin brand/alaska`);
    execSync(`git -C ${repo.path} push origin brand/alaska`);
  }
  console.log("\n✨ All systems integrated and synced!");
} catch (error) {
  console.error("\n❌ Error:", error.message);
}
