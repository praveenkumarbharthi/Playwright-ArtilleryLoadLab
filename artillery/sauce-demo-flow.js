'use strict';

const { expect } = require('@playwright/test');
const { BASE_URL, THRESHOLDS } = require('../lib/journey-config');
const { rewriteMetricName } = require('../lib/metric-name');
const { runSauceDemoPurchaseFlow } = require('../lib/sauce-demo-journey');

const WEB_VITALS_PREFIX = '__ARTILLERY_WEB_VITAL__';
const WEB_VITAL_NAMES = ['FCP', 'CLS', 'TTFB', 'INP'];

async function sauceDemoPurchaseFlow(page, vuContext, events, test) {
  const username =
    (vuContext && vuContext.vars && vuContext.vars.username) ||
    process.env.SAUCE_USERNAME;
  const password =
    (vuContext && vuContext.vars && vuContext.vars.password) ||
    process.env.SAUCE_PASSWORD;
  const baseUrl =
    (vuContext && vuContext.vars && vuContext.vars.target) ||
    process.env.BASE_URL ||
    BASE_URL;

  page.on('console', (message) => {
    const text = message.text();
    if (!text.startsWith(WEB_VITALS_PREFIX)) return;

    const payload = JSON.parse(text.slice(WEB_VITALS_PREFIX.length));
    if (payload.error) {
      events.emit('error', payload.error);
      return;
    }
    if (!WEB_VITAL_NAMES.includes(payload.name) || !Number.isFinite(payload.value)) {
      return;
    }

    if (new URL(payload.url).origin !== new URL(baseUrl).origin) return;

    const metricName = rewriteMetricName(
      `browser.page.${payload.name}.${payload.url}`,
      baseUrl
    );
    events.emit('histogram', metricName, payload.value, {
      url: payload.url,
      vuId: vuContext && vuContext.vars && vuContext.vars.$uuid
    });
  });

  await page.addInitScript((prefix) => {
    window.__artilleryLcpMs = null;
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__artilleryLcpMs = entry.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }

    const registerWebVitals = () => {
      const webVitals = window.webVitals;
      if (!webVitals) return false;

      for (const name of ['FCP', 'CLS', 'TTFB', 'INP']) {
        const subscribe = webVitals[`on${name}`];
        if (typeof subscribe !== 'function') {
          console.error(
            `${prefix}${JSON.stringify({ error: `Missing web-vitals hook: ${name}` })}`
          );
          continue;
        }

        subscribe((metric) => {
          console.log(`${prefix}${JSON.stringify({
            name: metric.name,
            value: metric.value,
            url: window.location.href
          })}`);
        });
      }
      return true;
    };

    let attempts = 0;
    const waitForWebVitals = () => {
      if (registerWebVitals()) return;
      attempts += 1;
      if (attempts >= 100) {
        console.error(
          `${prefix}${JSON.stringify({
            error: 'Artillery web-vitals collector was not initialized'
          })}`
        );
        return;
      }
      setTimeout(waitForWebVitals, 0);
    };
    waitForWebVitals();
  }, WEB_VITALS_PREFIX);

  const startedAt = Date.now();
  const step = test && typeof test.step === 'function'
    ? (name, fn) => test.step(name, fn)
    : async (name, fn) => fn();

  const result = await runSauceDemoPurchaseFlow(page, {
    expect,
    step,
    username,
    password,
    baseUrl,
    onInitialPageReady: async (initialPage) => {
      const lcpMs = await initialPage.evaluate(async () => {
        if (window.__artilleryLcpMs !== null) return window.__artilleryLcpMs;
        return new Promise((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts += 1;
            if (window.__artilleryLcpMs !== null || attempts >= 80) {
              clearInterval(interval);
              resolve(window.__artilleryLcpMs);
            }
          }, 25);
        });
      });
      if (lcpMs === null) return;

      const metricName = rewriteMetricName(
        `browser.page.LCP.${initialPage.url()}`,
        baseUrl
      );
      events.emit('histogram', metricName, lcpMs, {
        url: initialPage.url(),
        vuId: vuContext && vuContext.vars && vuContext.vars.$uuid
      });
    }
  });
  const durationMs = result.totalMs || Date.now() - startedAt;

  events.emit('histogram', 'browser.custom.total_journey_duration', durationMs);

  if (durationMs > THRESHOLDS.JOURNEY_P95_MS) {
    events.emit('counter', 'browser.custom.journey_over_sla', 1);
  }
}

module.exports = {
  sauceDemoPurchaseFlow,
  $rewriteMetricName: rewriteMetricName
};
