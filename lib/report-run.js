'use strict';

const fs = require('node:fs');
const path = require('node:path');

function timestampFor(date) {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`
  ].join('_');
}

function createRunReportsDir(reportsRoot, now = new Date()) {
  const runsRoot = path.join(reportsRoot, 'runs');
  fs.mkdirSync(runsRoot, { recursive: true });

  const timestamp = timestampFor(now);
  for (let suffix = 0; ; suffix += 1) {
    const runName = suffix === 0
      ? timestamp
      : `${timestamp}_${String(suffix).padStart(2, '0')}`;
    const runDirectory = path.join(runsRoot, runName);
    try {
      fs.mkdirSync(runDirectory);
      return runDirectory;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

function resolveReportsDir(reportsRoot, env = process.env) {
  if (!env.PERF_RUN_REPORTS_DIR) {
    return createRunReportsDir(reportsRoot);
  }
  const reportsDir = path.resolve(env.PERF_RUN_REPORTS_DIR);
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

module.exports = {
  createRunReportsDir,
  resolveReportsDir,
  timestampFor
};
