/**
 * Copied verbatim from mikehasa/golive-skill `.github/workflows/ci.yml`
 * "Smoke the copied GoLive skill without source dependencies or provider accounts"
 * at 8fd3d8e96844c79c500aabaf215d1267fcde08c5.
 *
 * Run from inside vendor/golive-skill with Node 20:
 *   node ../../scripts/upstream-runtime-smoke.mjs
 * (or via scripts/run-upstream-runtime-smoke.sh)
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

assert.equal(process.versions.node.split('.')[0], '20');
const scratch = mkdtempSync(join(tmpdir(), 'golive-ci-'));
try {
  const installed = join(scratch, 'installed', 'golive');
  const app = join(scratch, 'empty-app');
  cpSync('skills/golive', installed, { recursive: true });
  mkdirSync(app);
  assert.match(readFileSync(join(installed, 'SKILL.md'), 'utf8'), /^name: golive$/m);
  assert.ok(existsSync(join(installed, 'references')));
  const cli = join(installed, 'scripts', 'golive.mjs');
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], {
    cwd: app,
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: process.env.PATH },
  });
  assert.match(run('help'), /^golive /);
  assert.equal(typeof JSON.parse(run('version', '--json')).version, 'string');
  const menu = JSON.parse(run('menu', '--json', '--cwd', app));
  assert.equal(menu.ok, true);
  assert.ok(menu.menu);
  const detection = JSON.parse(run('detect', '--json', '--cwd', app));
  assert.equal(detection.ok, true);
  assert.ok(detection.detect);
  assert.ok(Array.isArray(detection.findings));
  console.log('Copied GoLive skill: help, version, menu and detect passed on Node 20.');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
