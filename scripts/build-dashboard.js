'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BASE_URL, THRESHOLDS, STEPS } = require('../lib/journey-config');
const {
  htmlPage,
  escapeHtml,
  formatMs,
  formatNumber,
  statusBadge
} = require('./report-theme');

const ROOT = path.join(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');

const WEB_VITALS = [
  { key: 'FCP', unit: 'ms', label: 'First Contentful Paint' },
  { key: 'LCP', unit: 'ms', label: 'Largest Contentful Paint' },
  { key: 'CLS', unit: 'score', label: 'Cumulative Layout Shift' },
  { key: 'TTFB', unit: 'ms', label: 'Time To First Byte' },
  { key: 'INP', unit: 'ms', label: 'Interaction to Next Paint' }
];

function readJson(file) {
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function summariesOf(report) {
  if (!report) return {};
  const aggregate = report.aggregate || report;
  return aggregate.summaries || aggregate.histograms || {};
}

function countersOf(report) {
  if (!report) return {};
  const aggregate = report.aggregate || report;
  return aggregate.counters || {};
}

function findSummary(summaries, matcher) {
  const keys = Object.keys(summaries);
  const exact = keys.find((key) => key === matcher);
  if (exact) {
    return { name: exact, stats: summaries[exact] };
  }
  const partial = keys.find((key) => key.includes(matcher));
  if (partial) {
    return { name: partial, stats: summaries[partial] };
  }
  return { name: matcher, stats: null };
}

function canonicalTargetUrl(targetUrl) {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`BASE_URL must use HTTP or HTTPS: ${targetUrl}`);
  }
  const pathname = parsed.pathname.endsWith('/')
    ? parsed.pathname
    : `${parsed.pathname}/`;
  return `${parsed.origin}${pathname}`;
}

function findWebVital(summaries, vital, targetUrl = BASE_URL) {
  const preferred = `browser.page.${vital}.${canonicalTargetUrl(targetUrl)}`;
  if (summaries[preferred]) {
    return { name: preferred, stats: summaries[preferred] };
  }

  const prefix = `browser.page.${vital}.`;
  const target = new URL(targetUrl);
  const targetPath = target.pathname.endsWith('/')
    ? target.pathname
    : `${target.pathname}/`;
  const candidates = Object.keys(summaries).filter((key) => key.startsWith(prefix));
  const chosen = candidates.find((key) => {
    try {
      const candidate = new URL(key.slice(prefix.length));
      const candidatePath = candidate.pathname.endsWith('/')
        ? candidate.pathname
        : `${candidate.pathname}/`;
      return candidate.origin === target.origin && candidatePath === targetPath;
    } catch {
      return false;
    }
  });
  return { name: chosen || preferred, stats: chosen ? summaries[chosen] : null };
}

function stat(stats, field) {
  if (!stats) return null;
  const aliases = {
    median: ['median', 'p50'],
    p95: ['p95'],
    p99: ['p99'],
    min: ['min'],
    max: ['max'],
    mean: ['mean', 'avg']
  };
  for (const name of aliases[field] || [field]) {
    if (stats[name] !== undefined && stats[name] !== null) {
      return Number(stats[name]);
    }
  }
  return null;
}

function formatVital(value, unit) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }
  if (unit === 'score') {
    return formatNumber(value, 3);
  }
  return formatMs(value);
}

function formatMetricValue(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 'n/a';
  }
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function passFail(passed) {
  return passed ? '<span class="ok">PASS</span>' : '<span class="bad">FAIL</span>';
}

function evaluateQualityGates({
  lcpP95,
  fcpP95,
  inpP95,
  ttfbP95,
  clsP95,
  journeyP95,
  failed,
  completed,
  thresholds
}) {
  const metricGate = (name, value, limit, unit) => ({
    name,
    value,
    limit,
    unit,
    passed: Number.isFinite(value) && value <= limit
  });
  const gates = [
    metricGate('Largest Contentful Paint (LCP p95)', lcpP95, thresholds.LCP_P95_MS, 'ms'),
    metricGate('First Contentful Paint (FCP p95)', fcpP95, thresholds.FCP_P95_MS, 'ms'),
    metricGate('Interaction to Next Paint (INP p95)', inpP95, thresholds.INP_P95_MS, 'ms'),
    metricGate('Time To First Byte (TTFB p95)', ttfbP95, thresholds.TTFB_P95_MS, 'ms'),
    metricGate('Cumulative Layout Shift (CLS p95)', clsP95, thresholds.CLS_P95, 'score'),
    metricGate(
      'Full Journey Duration (p95)',
      journeyP95,
      thresholds.JOURNEY_P95_MS,
      'ms'
    ),
    {
      name: 'Virtual User Failure Count',
      value: Number(failed),
      limit: 0,
      unit: 'count',
      passed: Number(failed) === 0 && Number(completed) > 0
    }
  ];
  return { gates, overall: gates.every((gate) => gate.passed) };
}

function meter(value, max, extraClass = '') {
  if (value === null || value === undefined || !max) {
    return '<div class="meter"><span style="width:0%"></span></div>';
  }
  const pct = Math.max(2, Math.min(100, (Number(value) / max) * 100));
  return `<div class="meter ${extraClass}"><span style="width:${pct.toFixed(1)}%"></span></div>`;
}

function latestReportsDir(reportsRoot = REPORTS_DIR) {
  const runsRoot = path.join(reportsRoot, 'runs');
  if (fs.existsSync(runsRoot)) {
    const candidates = fs.readdirSync(runsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(runsRoot, entry.name))
      .filter((directory) => fs.existsSync(path.join(directory, 'artillery-report.json')))
      .sort((left, right) => path.basename(right).localeCompare(path.basename(left)));
    if (candidates.length > 0) return candidates[0];
  }
  return reportsRoot;
}

function build(options = {}) {
  const reportsDir =
    options.reportsDir ||
    process.env.PERF_RUN_REPORTS_DIR ||
    latestReportsDir();
  const artilleryInput = path.join(reportsDir, 'artillery-report.json');
  const playwrightInput = path.join(reportsDir, 'playwright-journey.json');
  const playwrightResultsInput = path.join(reportsDir, 'playwright-results.json');
  const htmlOut = path.join(reportsDir, 'dashboard.html');
  const mdOut = path.join(reportsDir, 'SUMMARY.md');
  const targetUrl = options.baseUrl || BASE_URL;
  const thresholds = options.thresholds || THRESHOLDS;

  fs.mkdirSync(reportsDir, { recursive: true });
  const artilleryReport = readJson(artilleryInput);
  const baselineJourney = readJson(playwrightInput);
  const playwrightResults = readJson(playwrightResultsInput);

  if (!artilleryReport) {
    throw new Error(
      `Missing ${artilleryInput}. Run npm run artillery:smoke or npm run artillery:load first.`
    );
  }

  const summaries = summariesOf(artilleryReport);
  const counters = countersOf(artilleryReport);

  const created = counters['vusers.created'] || counters['vusers.created.total'] || 0;
  const completed = counters['vusers.completed'] || 0;
  const failed = counters['vusers.failed'] || 0;
  const playwrightStats = playwrightResults?.stats;
  const session = findSummary(summaries, 'vusers.session_length').stats;
  const sessionDuration = stat(session, 'mean') || stat(session, 'median');

  const journey = findSummary(summaries, 'browser.custom.total_journey_duration');
  const journeyP95 = stat(journey.stats, 'p95');
  const lcp = findWebVital(summaries, 'LCP', targetUrl);
  const lcpSampleCount = stat(lcp.stats, 'count') ?? 0;
  const fcp = findWebVital(summaries, 'FCP', targetUrl);
  const inp = findWebVital(summaries, 'INP', targetUrl);
  const ttfb = findWebVital(summaries, 'TTFB', targetUrl);
  const cls = findWebVital(summaries, 'CLS', targetUrl);
  const lcpP95 = stat(lcp.stats, 'p95');
  const fcpP95 = stat(fcp.stats, 'p95');
  const inpP95 = stat(inp.stats, 'p95');
  const ttfbP95 = stat(ttfb.stats, 'p95');
  const clsP95 = stat(cls.stats, 'p95');

  const quality = evaluateQualityGates({
    lcpP95,
    fcpP95,
    inpP95,
    ttfbP95,
    clsP95,
    journeyP95,
    failed,
    completed,
    thresholds
  });
  const { gates, overall } = quality;
  const vuPass = gates[gates.length - 1].passed;

  const baselineMs = baselineJourney?.totalMs ?? null;

  const vitalsRows = WEB_VITALS.map((vital) => {
    const found = findWebVital(summaries, vital.key, targetUrl);
    return {
      ...vital,
      metric: found.name,
      samples: stat(found.stats, 'count') ?? 0,
      min: stat(found.stats, 'min'),
      median: stat(found.stats, 'median'),
      p95: stat(found.stats, 'p95'),
      p99: stat(found.stats, 'p99')
    };
  });

  const stepRows = STEPS.map((name) => {
    const found = findSummary(summaries, `browser.step.${name}`);
    const baselineStep = baselineJourney?.steps?.[name] ?? null;
    return {
      name,
      baseline: baselineStep,
      min: stat(found.stats, 'min'),
      median: stat(found.stats, 'median'),
      p95: stat(found.stats, 'p95'),
      p99: stat(found.stats, 'p99')
    };
  });

  const maxStep = Math.max(
    1,
    ...stepRows.flatMap((row) => [row.median, row.p95, row.baseline].filter((v) => v !== null))
  );

  const generatedAt =
    artilleryReport.aggregate?.firstCounterAt ||
    artilleryReport.intermediate?.[0]?.period ||
    new Date().toISOString();

  const vitalsTable = vitalsRows
    .map(
      (row) => `<tr>
        <td><strong>${escapeHtml(row.key)}</strong><div class="note">${escapeHtml(row.label)}</div></td>
        <td>${row.samples}</td>
        <td>${formatVital(row.min, row.unit)}</td>
        <td>${formatVital(row.median, row.unit)}</td>
        <td>${formatVital(row.p95, row.unit)}</td>
        <td>${formatVital(row.p99, row.unit)}</td>
      </tr>`
    )
    .join('');

  const stepTable = stepRows
    .map(
      (row) => `<tr>
        <td><code>${escapeHtml(row.name)}</code></td>
        <td>${formatMs(row.baseline)}</td>
        <td>${formatMs(row.min)}</td>
        <td>${formatMs(row.median)}</td>
        <td>${formatMs(row.p95)}</td>
        <td>${formatMs(row.p99)}</td>
      </tr>`
    )
    .join('');

  const stepBars = stepRows
    .map(
      (row) => `<div class="bar-row">
        <div><code>${escapeHtml(row.name)}</code></div>
        <div>
          ${meter(row.median, maxStep)}
          ${meter(row.p95, maxStep, 'p95')}
        </div>
        <div class="note">med ${formatMs(row.median)}<br>p95 ${formatMs(row.p95)}</div>
      </div>`
    )
    .join('');

  const gatesTable = gates
    .map((gate) => {
      const measured = gate.unit === 'score'
        ? formatNumber(gate.value, 3)
        : gate.unit === 'ms'
          ? formatMs(gate.value)
          : escapeHtml(gate.value);
      const limit = gate.unit === 'score'
        ? formatNumber(gate.limit, 3)
        : gate.unit === 'ms'
          ? `${escapeHtml(gate.limit)} ms`
          : escapeHtml(gate.limit);
      return `<tr>
        <td>${escapeHtml(gate.name)}</td>
        <td>${measured}</td>
        <td>${limit}</td>
        <td>${passFail(gate.passed)}</td>
      </tr>`;
    })
    .join('');

  const counterRows = Object.keys(counters).sort()
    .map((name) => `<tr>
      <td><code>${escapeHtml(name)}</code></td>
      <td>${formatMetricValue(counters[name])}</td>
    </tr>`)
    .join('');
  const histogramRows = Object.keys(summaries).sort()
    .map((name) => `<tr>
      <td><code>${escapeHtml(name)}</code></td>
      <td>${formatMetricValue(stat(summaries[name], 'count'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'min'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'max'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'mean'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'median'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'p95'))}</td>
      <td>${formatMetricValue(stat(summaries[name], 'p99'))}</td>
    </tr>`)
    .join('');

  const html = htmlPage('UI Performance Dashboard - Playwright + Artillery', `
    <div class="hero">
      <div>
        <h1>Playwright + Artillery UI Performance</h1>
        <p class="sub">Multi-browser concurrent percentiles and Core Web Vitals (including official INP). Generated ${escapeHtml(String(generatedAt))}</p>
      </div>
      ${statusBadge(overall)}
    </div>

    <div class="grid">
      <div class="card"><div class="label">VUs Launched</div><div class="value">${escapeHtml(created)}</div><div class="hint">Total browser sessions</div></div>
      <div class="card"><div class="label">Completed VUs</div><div class="value">${escapeHtml(completed)}</div><div class="hint">Finished purchase flows</div></div>
      <div class="card"><div class="label">Failed VUs</div><div class="value">${escapeHtml(failed)}</div><div class="hint">${vuPass ? '0 session errors' : 'Failures detected'}</div></div>
      <div class="card"><div class="label">Baseline Journey</div><div class="value">${formatMs(baselineMs)}</div><div class="hint">Single-user timing reference</div></div>
      <div class="card"><div class="label">Concurrent Journey p95</div><div class="value">${formatMs(journeyP95)}</div><div class="hint">Limit &lt;= ${thresholds.JOURNEY_P95_MS} ms</div></div>
    </div>

    ${playwrightStats ? `<div class="card" style="margin-bottom:24px">
      <h2>Playwright Console Summary</h2>
      <p class="note">${escapeHtml(playwrightStats.expected)} passed · ${escapeHtml(playwrightStats.unexpected)} failed · ${escapeHtml(playwrightStats.skipped)} skipped · ${formatMetricValue(playwrightStats.duration / 1000)} s</p>
    </div>` : ''}

    <div class="card" style="margin-bottom:24px">
      <h2>Concurrent Core Web Vitals</h2>
      <p class="note">Collected from real Chromium sessions. LCP is sampled from the browser's largest-contentful-paint performance entries before the first interaction; other vitals use the web-vitals hooks.</p>
      <div class="table-wrap"><table>
        <thead>
          <tr><th>Vital</th><th>Samples</th><th>min</th><th>median</th><th>p95</th><th>p99</th></tr>
        </thead>
        <tbody>${vitalsTable}</tbody>
      </table></div>
      <p class="note">${lcpSampleCount === 0
    ? 'LCP is n/a because Chromium emitted no Largest Contentful Paint candidate before the first interaction in this run; no value is inferred. Its quality gate therefore fails.'
    : 'n/a means the browser emitted no sample for that vital in this run. Missing samples fail the corresponding quality gate.'}</p>
    </div>

    <div class="card" style="margin-bottom:24px">
      <h2>Journey Step Timings (Median vs p95)</h2>
      <p class="note">Blue bars indicate median; orange bars indicate p95 percentiles across concurrent Playwright virtual users.</p>
      ${stepBars}
      <table style="margin-top:16px">
        <thead>
          <tr><th>Step</th><th>Single VU</th><th>Concurrent Min</th><th>Median</th><th>p95</th><th>p99</th></tr>
        </thead>
        <tbody>${stepTable}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>Enforced Quality Gate Verdicts</h2>
      <table>
        <thead>
          <tr><th>Quality Gate</th><th>Measured Value</th><th>Threshold Limit</th><th>Verdict</th></tr>
        </thead>
        <tbody>
          ${gatesTable}
        </tbody>
      </table>
    </div>
    <div class="card" style="margin-top:24px">
      <h2>Artillery Console Summary</h2>
      <p class="note">Final aggregate counters and histogram summaries from this Artillery run.</p>
      <h3>Counters</h3>
      <div class="table-wrap"><table>
        <thead>
          <tr><th>Metric</th><th>Count</th></tr>
        </thead>
        <tbody>${counterRows}</tbody>
      </table></div>
      <h3>Histograms</h3>
      <div class="table-wrap"><table>
        <thead>
          <tr><th>Metric</th><th>Samples</th><th>min</th><th>max</th><th>mean</th><th>median</th><th>p95</th><th>p99</th></tr>
        </thead>
        <tbody>${histogramRows}</tbody>
      </table></div>
    </div>
    <footer>Reports: dashboard.html, SUMMARY.md, artillery-report.json in this run folder.</footer>
  `);

  const mdLines = [
    '# UI Performance Summary (Playwright + Artillery)',
    '',
    `Overall Quality Gate: **${overall ? 'passed' : 'failed'}**`,
    '',
    '## Concurrency Summary',
    '',
    `- VUs Launched: ${created}`,
    `- Completed VUs: ${completed}`,
    `- Failed VUs: ${failed}`,
    `- Mean Session Duration: ${formatMs(sessionDuration)}`,
    `- Baseline Single-User Journey: ${formatMs(baselineMs)}`,
    `- Concurrent Journey p95: ${formatMs(journeyP95)}`,
    '',
    '## Core Web Vitals',
    '',
    '| Vital | min | median | p95 | p99 |',
    '| --- | --- | --- | --- | --- |',
    ...vitalsRows.map(
      (row) =>
        `| ${row.key} | ${formatVital(row.min, row.unit)} | ${formatVital(row.median, row.unit)} | ${formatVital(row.p95, row.unit)} | ${formatVital(row.p99, row.unit)} |`
    ),
    '',
    '## Step Timings',
    '',
    '| Step | Single VU | min | median | p95 | p99 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...stepRows.map(
      (row) =>
        `| ${row.name} | ${formatMs(row.baseline)} | ${formatMs(row.min)} | ${formatMs(row.median)} | ${formatMs(row.p95)} | ${formatMs(row.p99)} |`
    ),
    '',
    '## Quality Gate Verdicts',
    '',
    ...gates.map((gate) => {
      const measured = gate.unit === 'score'
        ? formatNumber(gate.value, 3)
        : gate.unit === 'ms'
          ? formatMs(gate.value)
          : String(gate.value);
      const limit = gate.unit === 'score'
        ? formatNumber(gate.limit, 3)
        : gate.unit === 'ms'
          ? `${gate.limit} ms`
          : String(gate.limit);
      return `- ${gate.name} <= ${limit}: ${gate.passed ? 'PASS' : 'FAIL'} (${measured})`;
    }),
    ''
  ];

  fs.writeFileSync(htmlOut, html);
  fs.writeFileSync(mdOut, mdLines.join('\n'));
  console.log(`Wrote ${htmlOut}`);
  console.log(`Wrote ${mdOut}`);
  console.log(`Overall Gate: ${overall ? 'passed' : 'failed'}`);
  return quality;
}

function main(options = {}) {
  try {
    const result = build(options);
    return result.overall ? 0 : 1;
  } catch (error) {
    console.error(error.message || error);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  build,
  canonicalTargetUrl,
  evaluateQualityGates,
  findWebVital,
  latestReportsDir,
  main
};
