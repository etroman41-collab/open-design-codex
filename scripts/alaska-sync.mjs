import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();
const REPOS = [
  { name: 'system', path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex', path: path.join(home, 'Desktop/open-design-codex') }
];

// 엔진(V3) 폴더 내의 실제 소스 위치와 백업 위치 설정
const ENGINE_SOURCE = path.join(home, 'Desktop/system/skills/fashion/');
const BACKUP_TARGET = path.join(home, 'Desktop/open-design-ALASKA/skills/fashion/');

const commitMsg = process.argv.includes('--message') 
  ? process.argv[process.argv.indexOf('--message') + 1] 
  : "feat(alaska): engine-centered sync from V3 system";

try {
  // 1. 역방향 동기화 (system -> open-design-ALASKA)
  console.log("🔄 Step 1: Syncing from ENGINE (system) to BACKUP (ALASKA)...");
  execSync(`cp -r ${ENGINE_SOURCE}* ${BACKUP_TARGET}`);

  // 2. 각 레포지토리 Git 작업
  for (const repo of REPOS) {
    console.log(`\n📦 Processing [${repo.name}]...`);
    
    execSync(`git -C ${repo.path} add .`);
    try {
      execSync(`git -C ${repo.path} commit -m "${commitMsg}"`, { stdio: 'ignore' });
      console.log(`✅ Committed changes in ${repo.name}`);
    } catch (e) {
      console.log(`ℹ️ No changes to commit in ${repo.name}`);
    }

    // 푸시 전 최신 상태 확보 및 푸시
    console.log(`🚀 Pushing ${repo.name} to origin brand/alaska...`);
    execSync(`git -C ${repo.path} pull --rebase origin brand/alaska`);
    execSync(`git -C ${repo.path} push origin brand/alaska`);
  }

  console.log("\n✨ Engine sync complete! All repositories are up-to-date.");

} catch (error) {
  console.error("\n❌ Error occurred during engine sync:", error.message);
  process.exit(1);
}
