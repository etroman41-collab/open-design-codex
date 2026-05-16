import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();
const REPOS = [
  { name: 'system', path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex', path: path.join(home, 'Desktop/open-design-codex') }
];

// ⭐ 엔진 소스 = FPOF-V3-ALASKA 내부 폴더 (진실의 원천). 끝 슬래시 = "내용물"을 미러.
const ENGINE_SOURCE = path.join(home, 'Desktop/FPOF-V3-ALASKA/system/skills/fashion') + '/';
const BACKUP_TARGETS = [
  path.join(home, 'Desktop/open-design-ALASKA/skills/fashion') + '/',
  path.join(home, 'Desktop/system/skills/fashion') + '/'
];

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  // ── G1: cp -r(추가만) → rsync --delete(진짜 미러). 엔진에서 삭제·이름변경된 파일도 미러에서 제거됨.
  console.log('🔄 Step 1: rsync 미러 (--delete, .DS_Store 제외)...');
  execSync(`test -d "${ENGINE_SOURCE}"`); // 소스 없으면 즉시 throw → 빈 미러로 덮어쓰는 사고 방지
  for (const target of BACKUP_TARGETS) {
    execSync(`mkdir -p "${target}"`);
    run(`rsync -a --delete --exclude='.DS_Store' "${ENGINE_SOURCE}" "${target}"`);
  }

  // ── G2: 동기화 후 검증 게이트. 미러 != 소스면 commit/push 전에 중단 (조작 금지 원칙).
  console.log('\n🔎 Step 2: 검증 게이트 — 미러 == 소스 확인...');
  for (const target of BACKUP_TARGETS) {
    try {
      execSync(`diff -rq --exclude='.DS_Store' "${ENGINE_SOURCE}" "${target}"`, { stdio: 'pipe' });
      console.log(`  ✅ ${target} — 소스와 100% 일치`);
    } catch (e) {
      const detail = (e.stdout || '').toString() + (e.stderr || '').toString();
      throw new Error(`검증 실패: ${target} 가 소스와 다름. push 중단.\n${detail}`);
    }
  }

  // ── Step 3: 3개 미러 저장소 commit & push.
  console.log('\n📦 Step 3: 저장소별 commit & push...');
  for (const repo of REPOS) {
    console.log(`\n— [${repo.name}]`);
    const g = `git -C "${repo.path}"`;
    execSync(`${g} add -A`);

    // G2: "변경 없음"(정상)과 "commit 실패"(에러)를 구분. 조용히 삼키지 않음.
    const staged = out(`${g} status --porcelain`);
    if (staged) {
      run(`${g} commit -m "feat(alaska): sync from V3 main engine"`); // 실패 시 throw → 전체 중단
      console.log('  ✓ committed');
    } else {
      console.log('  · 변경 없음 — commit 건너뜀');
    }

    run(`${g} pull --rebase origin brand/alaska`);
    run(`${g} push origin brand/alaska`);
    console.log('  ✓ pushed');
  }

  console.log('\n✨ 동기화 완료 — 미러 검증 통과 후 푸시됨.');
} catch (error) {
  console.error('\n❌ 중단:', error.message);
  process.exitCode = 1; // CI·후속 자동화가 실패를 감지하도록 비정상 종료
}
