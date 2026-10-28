'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const {
  build,
  canonicalTargetUrl,
  evaluateQualityGates,
  findWebVital,
  latestReportsDir,
  main
} = require('./build-dashboard');
const { rewriteMetricName } = require('../lib/metric-name');

const temporaryDirectories = [];
const thresholds = {
  LCP_P95_MS: 2500,
  FCP_P95_MS: 1800,
  INP_P95_MS: 200,
  TTFB_P95_MS: 800,
  CLS_P95: 0.1,
  JOURNEY_P95_MS: 8000
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createReport(targetUrl, overrides = {}) {
  const metricUrl = canonicalTargetUrl(targetUrl);
  const summaries = {
    'browser.custom.total_journey_duration': { p95: 1200 },
    'vusers.session_length': { mean: 1400 }
  };
  for (const vital of ['LCP', 'FCP', 'INP', 'TTFB', 'CLS']) {
    summaries[`browser.page.${vital}.${metricUrl}`] = {
      count: 2,
      min: 1,
      median: 2,
      p95: vital === 'CLS' ? 0.01 : 100,
      p99: vital === 'CLS' ? 0.02 : 200
    };
  }
  Object.assign(summaries, overrides.summaries);
  return {
    aggregate: {
      counters: {
        'vusers.created': 2,
        'vusers.completed': 2,
        'vusers.failed': 0,
        'browser.http_requests': 55
      },
      summaries
    }
  };
}

function createReportsDirectory(report) {
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-report-'));
  temporaryDirectories.push(reportsDir);
  fs.writeFileSync(
    path.join(reportsDir, 'artillery-report.json'),
    JSON.stringify(report)
  );
  fs.writeFileSync(
    path.join(reportsDir, 'playwright-results.json'),
    JSON.stringify({
      stats: {
        duration: 2543,
        expected: 1,
        unexpected: 0,
        skipped: 0
      }
    })
  );
  return reportsDir;
}

test('canonicalizes target URL by removing query and adding a trailing slash', () => {
  assert.equal(
    canonicalTargetUrl('https://shop.example/catalog?sort=price#top'),
    'https://shop.example/catalog/'
  );
});

test('selects web vital data for the configured target and path', () => {
  const summaries = {
    'browser.page.LCP.https://other.example/': { p95: 9000 },
    'browser.page.LCP.https://shop.example/catalog/': { p95: 500 }
  };
  const vital = findWebVital(summaries, 'LCP', 'https://shop.example/catalog');
  assert.equal(vital.stats.p95, 500);
});

test('normalizes browser vital names for custom target URLs only', () => {
  assert.equal(
    rewriteMetricName(
      'browser.page.LCP.https://shop.example/login?campaign=test',
      'https://shop.example/catalog'
    ),
    'browser.page.LCP.https://shop.example/catalog/'
  );
  assert.equal(
    rewriteMetricName('browser.page.LCP.https://other.example/', 'https://shop.example/'),
    'browser.page.LCP.https://other.example/'
  );
});

test('fails quality gates when a required metric is missing', () => {
  const result = evaluateQualityGates({
    lcpP95: 100,
    fcpP95: 100,
    inpP95: 100,
    ttfbP95: 100,
    clsP95: null,
    journeyP95: 100,
    failed: 0,
    completed: 2,
    thresholds
  });
  assert.equal(result.overall, false);
  assert.equal(result.gates.find((gate) => gate.name.includes('CLS')).passed, false);
});

test('rejects invalid quality threshold environment values', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./lib/journey-config')"],
    {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, INP_P95_MS: 'not-a-number' },
      encoding: 'utf8'
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /INP_P95_MS must be a finite number/);
});

test('builds a passing report for a custom target URL', () => {
  const targetUrl = 'https://shop.example/catalog';
  const reportsDir = createReportsDirectory(createReport(targetUrl));
  const result = build({ reportsDir, baseUrl: targetUrl, thresholds });
  const exitCode = main({ reportsDir, baseUrl: targetUrl, thresholds });
  const html = fs.readFileSync(path.join(reportsDir, 'dashboard.html'), 'utf8');
  const summary = fs.readFileSync(path.join(reportsDir, 'SUMMARY.md'), 'utf8');

  assert.equal(result.overall, true);
  assert.equal(exitCode, 0);
  assert.match(html, /INP p95/);
  assert.match(html, /Largest Contentful Paint/);
  assert.match(html, /<th>Samples<\/th>/);
  assert.match(html, /Artillery Console Summary/);
  assert.match(html, /<th>Metric<\/th><th>Count<\/th>/);
  assert.match(html, /<th>Metric<\/th><th>Samples<\/th>/);
  assert.match(html, /browser\.http_requests<\/code><\/td>\s*<td>55<\/td>/);
  assert.match(html, /browser\.custom\.total_journey_duration/);
  assert.match(html, /Playwright Console Summary/);
  assert.match(html, /1 passed · 0 failed · 0 skipped · 2\.5 s/);
  assert.match(summary, /Overall Quality Gate: \*\*passed\*\*/);
});

test('builds a failed report when a configured metric exceeds its threshold', () => {
  const targetUrl = 'https://shop.example/';
  const report = createReport(targetUrl);
  report.aggregate.summaries[
    'browser.page.INP.https://shop.example/'
  ].p95 = 201;
  const reportsDir = createReportsDirectory(report);
  const result = build({ reportsDir, baseUrl: targetUrl, thresholds });
  const exitCode = main({ reportsDir, baseUrl: targetUrl, thresholds });
  const summary = fs.readFileSync(path.join(reportsDir, 'SUMMARY.md'), 'utf8');

  assert.equal(result.overall, false);
  assert.equal(exitCode, 1);
  assert.match(summary, /Interaction to Next Paint \(INP p95\).*FAIL/);
});

test('explains unavailable LCP samples and shows a zero sample count', () => {
  const targetUrl = 'https://shop.example/';
  const report = createReport(targetUrl);
  delete report.aggregate.summaries['browser.page.LCP.https://shop.example/'];
  const reportsDir = createReportsDirectory(report);

  build({ reportsDir, baseUrl: targetUrl, thresholds });
  const html = fs.readFileSync(path.join(reportsDir, 'dashboard.html'), 'utf8');
  const summary = fs.readFileSync(path.join(reportsDir, 'SUMMARY.md'), 'utf8');

  assert.match(html, /LCP is n\/a because Chromium emitted no Largest Contentful Paint candidate before the first interaction/);
  assert.match(html, /<strong>LCP<\/strong>.*?<td>0<\/td>/s);
  assert.match(summary, /Largest Contentful Paint \(LCP p95\).*FAIL/);
});

test('preserves valid zero measurements and console histogram precision', () => {
  const targetUrl = 'https://shop.example/';
  const report = createReport(targetUrl);
  report.aggregate.summaries['browser.page.LCP.https://shop.example/'].p95 = 507.8;
  report.aggregate.summaries['browser.page.CLS.https://shop.example/'] = {
    count: 2,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    p95: 0,
    p99: 0
  };
  const reportsDir = createReportsDirectory(report);

  build({ reportsDir, baseUrl: targetUrl, thresholds });
  const html = fs.readFileSync(path.join(reportsDir, 'dashboard.html'), 'utf8');
  const summary = fs.readFileSync(path.join(reportsDir, 'SUMMARY.md'), 'utf8');

  assert.match(html, /<td><strong>CLS<\/strong>.*?<td>2<\/td>\s*<td>0\.000<\/td>\s*<td>0\.000<\/td>\s*<td>0\.000<\/td>\s*<td>0\.000<\/td>/s);
  assert.match(html, /<td><code>vusers\.failed<\/code><\/td>\s*<td>0<\/td>/);
  assert.match(html, /<td>Largest Contentful Paint \(LCP p95\)<\/td>\s*<td>507\.8 ms<\/td>/);
  assert.match(summary, /\| LCP \| 1 ms \| 2 ms \| 507\.8 ms \| 200 ms \|/);
  assert.match(summary, /Cumulative Layout Shift \(CLS p95\).*PASS \(0\.000\)/);
});

test('selects the newest run folder containing an Artillery report', () => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'latest-report-'));
  temporaryDirectories.push(reportsRoot);
  const olderRun = path.join(reportsRoot, 'runs', '2026-10-27_20-00-00-000');
  const newerRun = path.join(reportsRoot, 'runs', '2026-10-27_21-00-00-000');
  fs.mkdirSync(olderRun, { recursive: true });
  fs.mkdirSync(newerRun, { recursive: true });
  fs.writeFileSync(path.join(olderRun, 'artillery-report.json'), '{}');
  fs.writeFileSync(path.join(newerRun, 'artillery-report.json'), '{}');

  assert.equal(latestReportsDir(reportsRoot), newerRun);
});
