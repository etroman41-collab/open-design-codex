import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();
const REPOS = [
  { name: 'system', path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex', path: path.join(home, 'Desktop/open-design-codex') }
];

const commitMsg = process.argv.includes('--message') 
  ? process.argv[process.argv.indexOf('--message') + 1] 
  : "feat(alaska): automatic brand sync and refactor update";

try {
  // 1. 파일 동기화 (ALASKA -> system)
  console.log("🔄 Step 1: Syncing files to system repository...");
  execSync(`cp -r ${path.join(home, 'Desktop/open-design-ALASKA/skills/fashion/')}* ${path.join(home, 'Desktop/system/skills/fashion/')}`);

  // 2. 각 레포지토리 Git 작업
  for (const repo of REPOS) {
    console.log(`\n📦 Processing [${repo.name}]...`);
    
    // 스테이징 및 커밋 (변경사항이 있을 때만)
    execSync(`git -C ${repo.path} add .`);
    try {
      execSync(`git -C ${repo.path} commit -m "${commitMsg}"`, { stdio: 'ignore' });
      console.log(`✅ Committed changes in ${repo.name}`);
    } catch (e) {
      console.log(`ℹ️ No changes to commit in ${repo.name}`);
    }

    // 푸시 (Pull Rebase 포함하여 충돌 방지)
    console.log(`🚀 Pushing ${repo.name} to origin brand/alaska...`);
    execSync(`git -C ${repo.path} pull --rebase origin brand/alaska`);
    execSync(`git -C ${repo.path} push origin brand/alaska`);
  }

  console.log("\n✨ All ALASKA repositories are synced and pushed successfully!");

} catch (error) {
  console.error("\n❌ Error occurred during sync:", error.message);
  process.exit(1);
}
