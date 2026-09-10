#!/usr/bin/env node

import { access, lstat, readlink, realpath, symlink, rename, unlink } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MODE = process.argv[2];
const BACKEND_RELEASES = '/home/ubuntu/deployments/SaaS_Satu/releases';
const BACKEND_CURRENT = '/home/ubuntu/deployments/SaaS_Satu/current';
const STATIC_RELEASES = '/var/www/saas-satu/releases';
const STATIC_CURRENT = '/var/www/saas-satu/current';
const SERVICE = 'saas-satu.service';
const PUBLIC_ORIGIN = 'https://sekolah.suhendararyadi.com';
const NODE_RUNTIME = '/home/ubuntu/.local/opt/node-v24.14.1-linux-arm64/bin/node';
const RELEASE_RE = /^[0-9a-f]{7,40}-[a-z0-9][a-z0-9-]{0,63}$/;
const COMMIT_RE = /^[0-9a-f]{7,40}$/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(message) {
  throw new Error(message);
}

function run(command, args, { allowFailure = false, cwd = undefined } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    timeout: 15_000,
    env: process.env,
    cwd,
  });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  const code = result.status ?? 1;
  if (!allowFailure && code !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`${command} ${args.join(' ')} failed (${code})${detail ? `: ${detail}` : ''}`);
  }
  return { code, stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim() };
}

async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw || '{}'); }
  catch { fail('stdin must contain valid JSON'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('input must be a JSON object');
  return input;
}

function validateInput(input, confirmationToken = null) {
  const release = typeof input.release === 'string' ? input.release : '';
  const expectedCommit = typeof input.expectedCommit === 'string' ? input.expectedCommit : '';
  if (!RELEASE_RE.test(release)) fail('release has invalid format');
  if (!COMMIT_RE.test(expectedCommit)) fail('expectedCommit must be 7-40 lowercase hex characters');
  if (!release.startsWith(`${expectedCommit.slice(0, 7)}-`)) fail('release prefix does not match expectedCommit');
  if (confirmationToken && input.confirm !== confirmationToken) fail('confirmation token is invalid');
  return { release, expectedCommit };
}

async function assertFile(path) {
  await access(path, fsConstants.R_OK).catch(() => fail(`required artifact missing: ${path}`));
}

async function assertDir(path) {
  const stat = await lstat(path).catch(() => null);
  if (!stat?.isDirectory()) fail(`required directory missing: ${path}`);
}

async function resolvedSymlink(path, root) {
  const stat = await lstat(path).catch(() => null);
  if (!stat?.isSymbolicLink()) fail(`${path} is not a symlink`);
  const target = await realpath(path);
  const rootReal = await realpath(root);
  if (target !== rootReal && !target.startsWith(`${rootReal}/`)) fail(`${path} resolves outside ${root}`);
  return target;
}

function assertBackendAuthRuntime(backend) {
  const probe = `
    import { PrismaClient } from '@prisma/client';
    const prisma = new PrismaClient();
    const required = ['user', 'auth', 'session'];
    const missing = required.filter((name) => typeof prisma[name] !== 'object');
    await prisma.$disconnect();
    if (missing.length) {
      console.error('missing Prisma auth delegates: ' + missing.join(','));
      process.exit(42);
    }
  `;
  const result = run(NODE_RUNTIME, ['--input-type=module', '-e', probe], { allowFailure: true, cwd: `${backend}/app` });
  if (result.code !== 0) fail(result.stderr || result.stdout || 'Prisma auth runtime validation failed');
}

async function preflight(release, expectedCommit, { requireBackendRuntime = true } = {}) {
  const backend = `${BACKEND_RELEASES}/${release}`;
  const staticDir = `${STATIC_RELEASES}/${release}`;

  await assertDir(backend);
  await assertDir(staticDir);
  if (requireBackendRuntime) {
    await assertFile(`${backend}/app/.wasp/out/server/bundle/server.js`);
    assertBackendAuthRuntime(backend);
  }
  await assertFile(`${staticDir}/index.html`);
  await assertDir(`${staticDir}/assets`);

  const actualCommit = run('/usr/bin/git', ['-C', backend, 'rev-parse', 'HEAD']).stdout;
  if (!actualCommit.startsWith(expectedCommit)) {
    fail(`release commit mismatch: expected ${expectedCommit}, got ${actualCommit}`);
  }

  const currentBackend = await resolvedSymlink(BACKEND_CURRENT, BACKEND_RELEASES);
  const currentStatic = await resolvedSymlink(STATIC_CURRENT, STATIC_RELEASES);
  const serviceState = run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'is-active', SERVICE], { allowFailure: true }).stdout;
  if (serviceState !== 'active') fail(`${SERVICE} is not active before cutover`);

  return { backend, staticDir, actualCommit, currentBackend, currentStatic };
}

async function switchBackend(target) {
  const temp = `${BACKEND_CURRENT}.next-${process.pid}`;
  await unlink(temp).catch(() => {});
  await symlink(target, temp);
  await rename(temp, BACKEND_CURRENT);
}

function switchStatic(target) {
  run('/usr/bin/sudo', ['-n', '/usr/bin/ln', '-sfn', target, STATIC_CURRENT]);
}

function restartService() {
  run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'restart', SERVICE]);
}

async function fetchStatus(url, init = undefined) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(5_000), redirect: 'manual' });
  return response.status;
}

async function waitForBackend() {
  let last = 'not checked';
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const serviceState = run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'is-active', SERVICE], { allowFailure: true }).stdout;
    try {
      const status = await fetchStatus('http://127.0.0.1:3101/auth/me');
      last = `service=${serviceState}, /auth/me=${status}`;
      if (serviceState === 'active' && status === 200) return last;
    } catch (error) {
      last = `service=${serviceState}, fetch=${error instanceof Error ? error.message : String(error)}`;
    }
    await sleep(750);
  }
  fail(`backend did not become healthy: ${last}`);
}

async function publicSmoke() {
  const school = await fetchStatus(`${PUBLIC_ORIGIN}/school`);
  const authMe = await fetchStatus(`${PUBLIC_ORIGIN}/auth/me`);
  const dashboard = await fetchStatus(`${PUBLIC_ORIGIN}/operations/get-school-admin-dashboard-data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (school !== 200) fail(`public /school returned ${school}`);
  if (authMe !== 200) fail(`public /auth/me returned ${authMe}`);
  if (dashboard !== 401) fail(`unauthenticated admin dashboard operation returned ${dashboard}, expected 401`);
  return { school, authMe, dashboard };
}

async function rollback(previousBackend, previousStatic) {
  const notes = [];
  try {
    switchStatic(previousStatic);
    notes.push('static restored');
  } catch (error) {
    notes.push(`static rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    await switchBackend(previousBackend);
    restartService();
    await waitForBackend();
    notes.push('backend restored and healthy');
  } catch (error) {
    notes.push(`backend rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return notes;
}

async function main() {
  const validModes = ['preflight', 'deploy', 'static-preflight', 'static'];
  if (!validModes.includes(MODE)) fail('mode must be preflight, deploy, static-preflight, or static');
  const input = await readInput();
  const confirmationToken = MODE === 'deploy' ? 'PROMOTE_SCHOOL_OS_RELEASE' : MODE === 'static' ? 'PROMOTE_SCHOOL_OS_STATIC' : null;
  const { release, expectedCommit } = validateInput(input, confirmationToken);
  const staticOnly = MODE === 'static-preflight' || MODE === 'static';
  const state = await preflight(release, expectedCommit, { requireBackendRuntime: !staticOnly });

  if (MODE === 'preflight' || MODE === 'static-preflight') {
    console.log(JSON.stringify({
      ok: true,
      mode: MODE,
      release,
      commit: state.actualCommit,
      backendArtifact: state.backend,
      staticArtifact: state.staticDir,
      currentBackend: state.currentBackend,
      currentStatic: state.currentStatic,
      service: 'active',
    }));
    return;
  }

  if (MODE === 'static') {
    if (state.currentStatic === state.staticDir) {
      const smoke = await publicSmoke();
      console.log(JSON.stringify({ ok: true, mode: 'static', idempotent: true, release, smoke, liveBackend: state.currentBackend, liveStatic: state.currentStatic }));
      return;
    }
    try {
      switchStatic(state.staticDir);
      const smoke = await publicSmoke();
      const liveBackend = await resolvedSymlink(BACKEND_CURRENT, BACKEND_RELEASES);
      const liveStatic = await resolvedSymlink(STATIC_CURRENT, STATIC_RELEASES);
      if (liveBackend !== state.currentBackend) fail('static-only deployment unexpectedly changed backend');
      if (liveStatic !== state.staticDir) fail('post-cutover static symlink verification failed');
      console.log(JSON.stringify({ ok: true, mode: 'static', idempotent: false, release, commit: state.actualCommit, smoke, liveBackend, liveStatic, rollbackStatic: state.currentStatic }));
      return;
    } catch (error) {
      try { switchStatic(state.currentStatic); } catch {}
      throw error;
    }
  }

  if (state.currentBackend === state.backend && state.currentStatic === state.staticDir) {
    const smoke = await publicSmoke();
    console.log(JSON.stringify({ ok: true, mode: 'deploy', idempotent: true, release, smoke }));
    return;
  }

  let cutoverStarted = false;
  try {
    cutoverStarted = true;
    await switchBackend(state.backend);
    restartService();
    const backendHealth = await waitForBackend();
    switchStatic(state.staticDir);
    const smoke = await publicSmoke();

    const liveBackend = await resolvedSymlink(BACKEND_CURRENT, BACKEND_RELEASES);
    const liveStatic = await resolvedSymlink(STATIC_CURRENT, STATIC_RELEASES);
    if (liveBackend !== state.backend || liveStatic !== state.staticDir) fail('post-cutover symlink verification failed');

    console.log(JSON.stringify({
      ok: true,
      mode: 'deploy',
      idempotent: false,
      release,
      commit: state.actualCommit,
      backendHealth,
      smoke,
      liveBackend,
      liveStatic,
      rollbackBackend: state.currentBackend,
      rollbackStatic: state.currentStatic,
    }));
  } catch (error) {
    const rollbackNotes = cutoverStarted ? await rollback(state.currentBackend, state.currentStatic) : [];
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, release, error: message, rollback: rollbackNotes }));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
