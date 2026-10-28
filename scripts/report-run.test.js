'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const {
  createRunReportsDir,
  resolveReportsDir
} = require('../lib/report-run');

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createReportsRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-runs-'));
  temporaryDirectories.push(root);
  return root;
}

test('creates collision-safe timestamped run folders without overwriting', () => {
  const reportsRoot = createReportsRoot();
  const sameTime = new Date(2026, 9, 27, 21, 11, 35, 415);

  const first = createRunReportsDir(reportsRoot, sameTime);
  fs.writeFileSync(path.join(first, 'kept.json'), '{"run":1}');
  const second = createRunReportsDir(reportsRoot, sameTime);

  assert.notEqual(first, second);
  assert.match(path.basename(first), /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}$/);
  assert.match(path.basename(second), /_01$/);
  assert.equal(fs.readFileSync(path.join(first, 'kept.json'), 'utf8'), '{"run":1}');
});

test('uses a timestamped run folder when no reports directory is provided', () => {
  const reportsRoot = createReportsRoot();
  const reportsDir = resolveReportsDir(reportsRoot, {});

  assert.equal(path.dirname(reportsDir), path.join(reportsRoot, 'runs'));
  assert.equal(fs.existsSync(reportsDir), true);
});

test('reuses an explicitly provided reports directory for a combined run', () => {
  const reportsRoot = createReportsRoot();
  const sharedDirectory = createRunReportsDir(reportsRoot);

  assert.equal(
    resolveReportsDir(reportsRoot, { PERF_RUN_REPORTS_DIR: sharedDirectory }),
    sharedDirectory
  );
  assert.equal(fs.existsSync(sharedDirectory), true);
});
