'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { resolveReportsDir } = require('../lib/report-run');

const ROOT = path.join(__dirname, '..');
const reportsRoot = path.join(ROOT, 'reports');

function run(script, args, env) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  });
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status === null ? 1 : result.status;
}

const unitTestResult = spawnSync(
  process.execPath,
  ['--test', path.join(__dirname, 'build-dashboard.test.js'), path.join(__dirname, 'report-run.test.js')],
  {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit'
  }
);

if (unitTestResult.error) {
  console.error(unitTestResult.error);
  process.exit(1);
}
if (unitTestResult.status === null || unitTestResult.status !== 0) {
  process.exit(unitTestResult.status === null ? 1 : unitTestResult.status);
}

const env = {
  ...process.env,
  PERF_RUN_REPORTS_DIR: resolveReportsDir(reportsRoot, process.env)
};
console.log(`Starting complete run in ${env.PERF_RUN_REPORTS_DIR}`);

process.exit(run('run-artillery.js', ['load'], env));
