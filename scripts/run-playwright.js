'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { resolveReportsDir } = require('../lib/report-run');

const ROOT = path.join(__dirname, '..');
const reportsRoot = path.join(ROOT, 'reports');
const runReportsDir = resolveReportsDir(reportsRoot, process.env);
const env = {
  ...process.env,
  PERF_RUN_REPORTS_DIR: runReportsDir
};
const playwrightCli = path.join(
  ROOT,
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
);

console.log(`Writing Playwright artifacts to ${env.PERF_RUN_REPORTS_DIR}`);
const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', ...process.argv.slice(2)],
  {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
