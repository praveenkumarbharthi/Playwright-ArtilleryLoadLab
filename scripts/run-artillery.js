'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { BASE_URL, USERNAME, PASSWORD } = require('../lib/journey-config');
const { resolveReportsDir } = require('../lib/report-run');

const ROOT = path.join(__dirname, '..');
const REPORTS_ROOT = path.join(ROOT, 'reports');
const CONFIG = path.join(ROOT, 'artillery', 'artillery-playwright.yml');

const envName = process.argv[2] || 'load';
if (!['smoke', 'load', 'performance'].includes(envName)) {
  console.error(`Unknown Artillery environment: ${envName}`);
  process.exit(1);
}

const env = {
  ...process.env,
  BASE_URL: process.env.BASE_URL || BASE_URL,
  SAUCE_USERNAME: process.env.SAUCE_USERNAME || USERNAME,
  SAUCE_PASSWORD: process.env.SAUCE_PASSWORD || PASSWORD,
  PERF_RUN_REPORTS_DIR: resolveReportsDir(REPORTS_ROOT, process.env)
};
const OUTPUT = path.join(env.PERF_RUN_REPORTS_DIR, 'artillery-report.json');

console.log(`Writing all run artifacts to ${env.PERF_RUN_REPORTS_DIR}`);
console.log('Running Playwright baseline before Artillery...');
const playwrightResult = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'run-playwright.js')],
  {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  }
);

if (playwrightResult.error) {
  console.error(playwrightResult.error);
  process.exit(1);
}
if (playwrightResult.status === null || playwrightResult.status !== 0) {
  process.exit(playwrightResult.status === null ? 1 : playwrightResult.status);
}

const artilleryScript = path.join(ROOT, 'node_modules', 'artillery', 'bin', 'run');
const args = [
  artilleryScript,
  'run',
  '--environment',
  envName,
  '--target',
  env.BASE_URL,
  '--output',
  OUTPUT,
  CONFIG
];

console.log(`Running Artillery Playwright (${envName}) against ${env.BASE_URL}`);
const result = spawnSync(process.execPath, args, {
  cwd: ROOT,
  env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status === null || result.status !== 0) {
  process.exit(result.status === null ? 1 : result.status);
}

const reportResult = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'build-dashboard.js')],
  {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  }
);

if (reportResult.error) {
  console.error(reportResult.error);
  process.exit(1);
}
process.exit(reportResult.status === null ? 1 : reportResult.status);
