'use strict';

const { test, expect } = require('@playwright/test');
const { THRESHOLDS } = require('../lib/journey-config');
const { runSauceDemoPurchaseFlow } = require('../lib/sauce-demo-journey');
const fs = require('node:fs');
const path = require('node:path');

test.describe.configure({ mode: 'serial' });

test('SauceDemo purchase journey (single-user baseline timings)', async ({ page }) => {
  const result = await runSauceDemoPurchaseFlow(page, {
    expect,
    step: test.step.bind(test)
  });

  expect(result.totalMs).toBeLessThanOrEqual(THRESHOLDS.JOURNEY_P95_MS);

  const reportsDir =
    process.env.PERF_RUN_REPORTS_DIR || path.join(__dirname, '..', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, 'playwright-journey.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalMs: result.totalMs,
        thresholdMs: THRESHOLDS.JOURNEY_P95_MS,
        passed: result.totalMs <= THRESHOLDS.JOURNEY_P95_MS,
        steps: result.timings
      },
      null,
      2
    )
  );
});
