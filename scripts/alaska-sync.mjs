import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const home = os.homedir();
const REPOS = [
  { name: 'system', path: path.join(home, 'Desktop/system') },
  { name: 'open-design-ALASKA', path: path.join(home, 'Desktop/open-design-ALASKA') },
  { name: 'open-design-codex', path: path.join(home, 'Desktop/open-design-codex') }
];

// ⭐ 엔진 = FPOF-V3-ALASKA. 브랜드 진실(presets/agents/.fpof-state.json)의 1차이자 유일 백업.
const ENGINE_ROOT = path.join(home, 'Desktop/FPOF-V3-ALASKA');
const ENGINE_BRANCH = 'brand/alaska';

// ⭐ 엔진 소스 = FPOF-V3-ALASKA 내부 폴더 (진실의 원천). 끝 슬래시 = "내용물"을 미러.
const ENGINE_SOURCE = path.join(home, 'Desktop/FPOF-V3-ALASKA/system/skills/fashion') + '/';
const BACKUP_TARGETS = [
  path.join(home, 'Desktop/open-design-ALASKA/skills/fashion') + '/',
  path.join(home, 'Desktop/system/skills/fashion') + '/'
];

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  // ── G3-a: 엔진 백업 가드. 미러보다 브랜드 진실이 먼저 보호돼야 함.
  //          자동 커밋 안 함 — 무관한 WIP를 불투명한 한 커밋에 섞으면 커밋 위생·"한 번에 하나씩" 위배.
  //          미커밋 변경 있으면 중단(사용자가 직접 의미있게 커밋), 깨끗하면 push로 백업 보장.
  console.log('🛡️  Step 0: 엔진 백업 가드 (브랜드 진실 우선 보호)...');
  const eg = `git -C "${ENGINE_ROOT}"`;
  const engineBranch = out(`${eg} branch --show-current`);
  if (engineBranch !== ENGINE_BRANCH) {
    throw new Error(`엔진 브랜치가 ${engineBranch} (예상: ${ENGINE_BRANCH}). 동기화 중단.`);
  }
  const engineDirty = out(`${eg} status --porcelain`);
  if (engineDirty) {
    const n = engineDirty.split('\n').length;
    throw new Error(
      `엔진(FPOF-V3-ALASKA)에 미커밋 변경 ${n}건. 브랜드 진실을 먼저 보호하세요:\n` +
      `  의미있는 단위로 직접 커밋·푸시 후 이 스크립트 재실행.\n` +
      `  (sync 스크립트는 엔진을 자동 커밋하지 않음 — 커밋 위생·조작 금지 원칙)\n` +
      engineDirty
    );
  }
  // 깨끗한 작업트리: 커밋됐지만 미푸시된 브랜드 진실이 있으면 여기서 GitHub에 백업.
  try {
    run(`${eg} push origin ${ENGINE_BRANCH}`);
    console.log('  ✅ 엔진 푸시 완료 — 브랜드 진실 GitHub 백업 보장');
  } catch (e) {
    throw new Error(
      `엔진 push 실패 (원격이 앞서 있을 수 있음). 엔진은 자동 rebase하지 않음 — 위험.\n` +
      `  직접 'git -C ${ENGINE_ROOT} pull --rebase origin ${ENGINE_BRANCH}' 확인 후 재실행.`
    );
  }

  // ── G1: cp -r(추가만) → rsync --delete(진짜 미러). 엔진에서 삭제·이름변경된 파일도 미러에서 제거됨.
  console.log('\n🔄 Step 1: rsync 미러 (--delete, .DS_Store 제외)...');
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
