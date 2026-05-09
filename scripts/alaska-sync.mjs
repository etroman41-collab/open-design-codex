#!/usr/bin/env node
/**
 * scripts/alaska-sync.mjs
 *
 * 1. open-design-ALASKA/skills/fashion/ → system/skills/fashion/ 복사
 * 2. 세 레포(system, open-design-ALASKA, open-design-codex) pull-rebase → add → commit → push
 *
 * 사용법:
 *   node scripts/alaska-sync.mjs
 *   node scripts/alaska-sync.mjs --dry-run        # 실행 없이 출력만
 *   node scripts/alaska-sync.mjs --message "msg"  # 커밋 메시지 지정
 *   node scripts/alaska-sync.mjs --skip-copy      # 복사 단계 생략
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

// ── 설정 ──────────────────────────────────────────────────────────────────────

const HOME = homedir();
const DESKTOP = resolve(HOME, 'Desktop');

const SOURCE = resolve(DESKTOP, 'open-design-ALASKA/skills/fashion/');
const TARGET = resolve(DESKTOP, 'system/skills/fashion/');
const BRANCH = 'brand/alaska';

const REPOS = [
  { name: 'system',              path: resolve(DESKTOP, 'system') },
  { name: 'open-design-ALASKA',  path: resolve(DESKTOP, 'open-design-ALASKA') },
  { name: 'open-design-codex',   path: resolve(DESKTOP, 'open-design-codex') },
];

// ── CLI 파싱 ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY       = args.includes('--dry-run');
const SKIP_COPY = args.includes('--skip-copy');
const msgIdx    = args.indexOf('--message');
const COMMIT_MSG = msgIdx !== -1 && args[msgIdx + 1]
  ? args[msgIdx + 1]
  : 'chore(alaska): sync brand DNA across repos';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

const log  = (msg) => console.log(`  ${msg}`);
const info = (msg) => console.log(`\n▶ ${msg}`);
const ok   = (msg) => console.log(`  ✓ ${msg}`);
const skip = (msg) => console.log(`  – ${msg}`);
const fail = (msg) => console.error(`  ✗ ${msg}`);

function run(cmd, cwd) {
  if (DRY) { log(`[dry] ${cmd}`); return ''; }
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.message);
  }
}

// ── 1. 파일 복사 ──────────────────────────────────────────────────────────────

info('Step 1 — fashion skills 복사');

if (SKIP_COPY) {
  skip('--skip-copy 플래그 감지 — 복사 단계 건너뜀');
} else {
  if (!existsSync(SOURCE)) {
    fail(`SOURCE 없음: ${SOURCE}`);
    process.exit(1);
  }
  if (!existsSync(TARGET)) {
    fail(`TARGET 없음: ${TARGET}`);
    process.exit(1);
  }
  run(`cp -r "${SOURCE}"* "${TARGET}"`);
  ok(`${SOURCE} → ${TARGET}`);
}

// ── 2. 각 레포 Git 작업 ───────────────────────────────────────────────────────

info('Step 2 — Git add / commit / push');

for (const repo of REPOS) {
  console.log(`\n  [${repo.name}]`);

  if (!existsSync(repo.path)) {
    fail(`레포 없음: ${repo.path}`);
    continue;
  }

  // 현재 브랜치 확인
  const currentBranch = run('git rev-parse --abbrev-ref HEAD', repo.path);
  if (!DRY && currentBranch !== BRANCH) {
    fail(`현재 브랜치: ${currentBranch} (expected: ${BRANCH}) — 건너뜀`);
    continue;
  }

  // pull --rebase (원격에 새 커밋이 있을 수 있음)
  try {
    const pulled = run(`git pull --rebase origin ${BRANCH}`, repo.path);
    if (pulled) log(`pull: ${pulled.split('\n')[0]}`);
  } catch (err) {
    fail(`pull 실패: ${err.message}`);
    continue;
  }

  // add
  run('git add .', repo.path);

  // 변경 사항 여부 확인
  const status = run('git status --porcelain', repo.path);
  if (!status) {
    skip('변경 사항 없음 — 커밋 건너뜀');
    // 로컬에 push 안 된 커밋이 있을 수 있으니 push는 시도
  } else {
    try {
      run(`git commit -m "${COMMIT_MSG}"`, repo.path);
      ok(`커밋 완료`);
    } catch (err) {
      fail(`커밋 실패: ${err.message}`);
      continue;
    }
  }

  // push
  try {
    const pushed = run(`git push origin ${BRANCH}`, repo.path);
    ok(`push 완료${pushed ? ': ' + pushed.split('\n')[0] : ''}`);
  } catch (err) {
    // "Everything up-to-date" 는 exit 0 이지만 혹시 모를 경우
    if (err.message.includes('up-to-date') || err.message.includes('Everything')) {
      skip('이미 최신 상태');
    } else {
      fail(`push 실패: ${err.message}`);
    }
  }
}

// ── 완료 ──────────────────────────────────────────────────────────────────────

console.log('\n✅  alaska-sync 완료\n');
